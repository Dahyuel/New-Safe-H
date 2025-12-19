import { createClient } from "@supabase/supabase-js";
import { PIIService } from "@/lib/pii-service";
import { sendMessageToGemini } from "@/utils/geminiClient";
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = "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";

async function callOpenRouter(modelId: string, messages: any[]) {
    // Convert formatted messages if needed
    // The history contains { role: 'user'|'model', parts: [{text: ...}] } for Gemini
    // We need to convert back to { role, content } for OpenRouter

    const openRouterMessages = messages.map(m => {
        let role = m.role === 'model' ? 'assistant' : m.role;
        return {
            role: role,
            content: m.parts[0].text
        };
    });

    try {
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
                messages: openRouterMessages
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenRouter API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "";
    } catch (e) {
        console.error("OpenRouter Backend Call Failed:", e);
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
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                },
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
            console.error("Auth Error:", authError);
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { message, chatId, model, context } = await req.json();
        const userId = user.id;

        // 1. PII Anonymization
        const { anonymizedText, originalMap, findings } = await PIIService.anonymize(message);

        // 2. Chat ID Management (Create if null)
        let finalChatId = chatId;
        if (!finalChatId) {
            const { data: chatData, error: chatError } = await supabase
                .from('chats')
                .insert({ user_id: userId, title: message.substring(0, 30) + "..." })
                .select()
                .single();
            if (chatError) throw chatError;
            finalChatId = chatData.id;
        }

        // 3. Store User Message (Anonymized)
        const { error: msgError } = await supabase
            .from('messages')
            .insert({
                chat_id: finalChatId,
                role: 'user',
                content: message // Store original message for user history persistence
            });
        if (msgError) throw msgError;

        // 4. Update Analytics & Regenerate Summary Trigger
        const { data: analytics } = await supabase
            .from('user_analytics')
            .select('pii_detected_count, total_prompts, sensitive_data_types')
            .eq('user_id', userId)
            .single();

        const currentPii = analytics?.pii_detected_count || 0;
        const currentTotal = analytics?.total_prompts || 0;
        let currentTypes: Record<string, number> = analytics?.sensitive_data_types || {};

        let updated = false;

        // Update counts map
        findings.forEach(type => {
            currentTypes[type] = (currentTypes[type] || 0) + 1;
            updated = true;
        });

        const newPiiCount = currentPii + findings.length;
        const newTotal = currentTotal + 1;

        // Note: We no longer generate the summary here.
        // The Database Trigger 'on_sensitive_data_change' will fire and call the Edge Function to generate 'sensitive_data_summary'.

        const updatePayload: any = {
            user_id: userId,
            pii_detected_count: newPiiCount,
            total_prompts: newTotal,
            last_updated: new Date().toISOString()
        };

        if (updated) {
            updatePayload.sensitive_data_types = currentTypes;
        }

        await supabase.from('user_analytics').upsert(updatePayload);

        // 5. Fetch History
        const { data: history } = await supabase
            .from('messages')
            .select('role, content')
            .eq('chat_id', finalChatId)
            .order('created_at', { ascending: true })
            .limit(10);

        // 6. Init Gemini History
        const geminiHistory: any[] = (history || []).map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        // Inject Context if provided
        if (context) {
            geminiHistory.unshift(
                { role: 'user', parts: [{ text: `[SYSTEM CONTEXT]: ${context}` }] },
                { role: 'model', parts: [{ text: "Acknowledged. I will use this context." }] }
            );
        }

        // Remove the last message (current user message) as sendMessageToGemini handles it
        const lastMsg = geminiHistory.pop();

        // 7. Call Gemini
        // 7. Call Gemini OR OpenRouter
        let text = "";

        console.log(`Processing request for model: ${model}`); // Debug logging

        if (!model || model === 'chatgpt') {
            // Default / ChatGPT -> Use Gemini Client (Backend internal)
            text = await sendMessageToGemini(anonymizedText, geminiHistory);
        } else {
            // Route to OpenRouter
            let openRouterId = "google/gemini-2.0-flash-exp:free";
            switch (model) {
                case 'gemini': openRouterId = "google/gemini-2.0-flash-exp:free"; break;
                case 'deepseek': openRouterId = "deepseek/deepseek-r1-0528:free"; break;
                case 'claude': openRouterId = "qwen/qwen3-235b-a22b:free"; break;
                default: openRouterId = "google/gemini-2.0-flash-exp:free";
            }

            // Prepare history for OpenRouter (including context at start)
            // geminiHistory already has context injected if any

            // Append current anonymized message
            const currentMsg = { role: 'user', parts: [{ text: anonymizedText }] };
            const fullHistory = [...geminiHistory, currentMsg];

            text = await callOpenRouter(openRouterId, fullHistory);
        }

        await supabase.from('messages').insert({
            chat_id: finalChatId,
            role: 'assistant',
            content: text
        });

        // 8. Return
        return NextResponse.json({
            chatId: finalChatId,
            reply: text,
            originalMap,
            findings
        });

    } catch (err: any) {
        console.error("Server Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
