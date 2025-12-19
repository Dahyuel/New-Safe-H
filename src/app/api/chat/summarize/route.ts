import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { model } from "@/utils/geminiClient";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        // ... Supabase init ...
        const supabase = createClient(
            "https://klxqgpslwutqwdmvckjp.supabase.co",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtseHFncHNsd3V0cXdkbXZja2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwOTQ0NTYsImV4cCI6MjA4MTY3MDQ1Nn0.16Bfp_wdYjZKhQ9FZPAjPSm_gNX-oOMtyBHKHZ8rT_g",
            {
                auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
                global: {
                    headers: {
                        cookie: cookieStore.toString(),
                        Authorization: req.headers.get("Authorization") || ""
                    }
                }
            }
        );
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { chatId } = await req.json();
        if (!chatId) return NextResponse.json({ error: "Chat ID required" }, { status: 400 });

        const { data: messages, error: fetchError } = await supabase
            .from('messages')
            .select('role, content')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;
        // If no messages, just return success (nothing to summarize)
        if (!messages || messages.length === 0) return NextResponse.json({ success: true });

        // 2a. Fetch existing summary
        const { data: chatData, error: chatFetchError } = await supabase
            .from('chats')
            .select('summary')
            .eq('id', chatId)
            .single();

        if (chatFetchError && chatFetchError.code !== 'PGRST116') {
            console.error("Error fetching chat summary:", chatFetchError);
        }

        const existingSummary = chatData?.summary || "";

        const transcript = messages.map((m: any) => `${m.role}: ${m.content}`).join('\n');

        // Explicitly instruct to NOT use placeholders in the summary and make it natural.
        const prompt = `Analyze the following conversation context and new messages to produce an updated summary.
        
        Input:
        1. Prior Summary: ${existingSummary ? existingSummary : "None"}
        2. New Messages:
        ${transcript}

        Task: Create a single, cohesive paragraph that combines the prior summary (if any) with the new information. 
        
        CRITICAL SAFETY INSTRUCTIONS:
        1. The output MUST NOT contain any PII (Personally Identifiable Information) or SPII.
        2. Do NOT include placeholders like '[NAME]', '[EMAIL]', '[PHONE]' in EITHER the summary or the title.
        3. Replace specific details with safe, generic descriptors (e.g., instead of "John's diagnosis", use "Medical details"; instead of "[NAME]", use "the user").
        4. The TITLE must be a short, abstract topic description (e.g., "Project Discussion", "Health Inquiry") without any specific entities, names, or placeholders.
        
        Output JSON object with two fields:
        1. "summary": The updated cohesive summary paragraph. Safe, natural, and professional.
        2. "title": A short, catchy title (max 5-6 words). ABSOLUTELY NO PII or Placeholders.
        
        Output JSON only.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Clean markdown code blocks if present
        const jsonString = responseText.replace(/```json\n?|\n?```/g, "").trim();
        let parsed;
        try {
            parsed = JSON.parse(jsonString);
        } catch (e) {
            console.error("JSON Parse Error", e);
            // Fallback
            parsed = { summary: responseText, title: "Chat Session" };
        }

        const { summary, title } = parsed;

        // 3. Update Chat Summary, Title & Status
        await supabase
            .from('chats')
            .update({
                summary: summary,
                title: title
            })
            .eq('id', chatId);

        // 4. Delete Messages (Privacy)
        await supabase
            .from('messages')
            .delete()
            .eq('chat_id', chatId);

        return NextResponse.json({ success: true, summary });

    } catch (error: any) {
        console.error("Summarize Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
