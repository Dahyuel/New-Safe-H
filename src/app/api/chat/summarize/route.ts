import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { model } from "@/utils/geminiClient";

const OPENROUTER_API_KEY = "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";

async function callOpenRouter(messages: any[]) {
    try {
        // Use DeepSeek for summarization as requested
        const modelId = "deepseek/deepseek-r1-0528:free";

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://safe-harbour.app",
                "X-Title": "Safe Harbour"
            },
            body: JSON.stringify({
                model: modelId,
                messages: messages
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenRouter API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "";
    } catch (e) {
        console.error("OpenRouter Summarize Error:", e);
        throw e;
    }
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
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

        const prompt = `Analyze the conversation context and new messages to produce an updated summary.
        
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
        
        Output JSON object with two fields (Raw JSON only, no markdown):
        1. "summary": The updated cohesive summary paragraph. Safe, natural, and professional.
        2. "title": A short, catchy title (max 5-6 words). ABSOLUTELY NO PII or Placeholders.`;

        // Call OpenRouter (DeepSeek)
        const responseText = await callOpenRouter([
            { role: "user", content: prompt }
        ]);

        // Clean markdown code blocks if present
        const jsonString = responseText.replace(/```json\n?|\n?```/g, "").trim();
        let parsed;
        try {
            parsed = JSON.parse(jsonString);
        } catch (e) {
            console.error("JSON Parse Error", e);
            // Fallback
            parsed = { summary: responseText.substring(0, 500), title: "Chat Session" };
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
