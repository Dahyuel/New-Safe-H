"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import { Header } from "@/components/layout/header";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { AuthModal } from "@/components/auth/auth-modal";
import { WelcomeScreen } from "@/components/chat/welcome-screen";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageList } from "@/components/chat/message-bubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { PIIAlert } from "@/components/ui/pii-alert";
import { PIIService, PIIType } from "@/lib/pii-service";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// WARNING: Hardcoded API Key as requested by user. 
// Ideally this should be in an environment variable or proxy backend.
const OPENROUTER_API_KEY = "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";

async function callOpenRouter(model: string, messages: Message[]) {
    // Format messages for OpenRouter
    const openRouterMessages = messages.map(m => {
        // Simple text content for now as we don't store image URLs in Message struct yet in a way compatible with this snippet easily without parsing
        // But the user request had image example. The current app Message struct is content: string.
        // We will send content as string.
        return {
            role: m.role,
            content: m.content
        };
    });

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": window.location.origin, // Dynamic origin
                "X-Title": "Safe Harbour",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model,
                messages: openRouterMessages
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`OpenRouter Error Body (${response.status}):`, errorBody);
            throw new Error(`OpenRouter API Error: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "";
    } catch (error) {
        console.error("OpenRouter Call Failed:", error);
        throw error;
    }
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface ChatPageContentProps {
    initialChatId?: string | null;
}

export function ChatPageContent({ initialChatId }: ChatPageContentProps) {
    const { showAuthModal, messages, setMessages, currentModel, setCurrentModel, isAppReady, currentChatId, setCurrentChatId, isLoggedIn, refreshChats } = useApp();
    const router = useRouter(); // Adding router hook
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [piiFindings, setPiiFindings] = useState<PIIType[]>([]);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isCreatingRef = useRef(false); // Ref to track new chat creation
    const hasNewMessagesRef = useRef(false); // Ref to track if new messages were added

    // 1. Initial Load & Chat Switching logic
    useEffect(() => {
        let isMounted = true;

        const loadChatData = async () => {
            // Reset new messages flag on chat switch


            // Skip if we just created this chat manually (data is already in memory)
            if (isCreatingRef.current) {
                isCreatingRef.current = false;
                return;
            }

            if (!initialChatId) {
                // New Chat Mode
                if (currentChatId) {
                    setMessages([]);
                    setCurrentChatId(null);
                    setPiiFindings([]);
                }
                return;
            }

            // If switching to a different chat
            if (initialChatId !== currentChatId) {
                setMessages([]);
                setError(null);
                setPiiFindings([]);
                setCurrentChatId(initialChatId);
            }

            try {
                // Fetch History & Summary in parallel
                const [msgRes, chatRes] = await Promise.all([
                    supabase
                        .from('messages')
                        .select('*')
                        .eq('chat_id', initialChatId)
                        .order('created_at', { ascending: true }),
                    supabase
                        .from('chats')
                        .select('summary')
                        .eq('id', initialChatId)
                        .single()
                ]);

                if (!isMounted) return;

                if (msgRes.error) throw msgRes.error;

                // Transform messages
                const historyMessages: Message[] = (msgRes.data || []).map(m => ({
                    id: m.id,
                    role: m.role as "user" | "assistant",
                    content: m.content,
                    timestamp: new Date(m.created_at)
                }));

                // Prepend Summary if exists
                if (chatRes.data?.summary) {
                    // Check if summary already exists in history to avoid duplication
                    const summaryExists = historyMessages.some(m => m.id === 'summary-init');
                    if (!summaryExists) {
                        historyMessages.unshift({
                            id: 'summary-init',
                            role: 'assistant',
                            content: `📝 **Previous Conversation Summary:**\n\n${chatRes.data.summary}`,
                            timestamp: new Date(0) // Old timestamp
                        });
                    }
                }

                setMessages(historyMessages);

            } catch (err) {
                console.error("Failed to load chat:", err);
                setError("Failed to load conversation history.");
            }
        };

        loadChatData();

        return () => { isMounted = false; };
    }, [initialChatId, setCurrentChatId, setMessages, currentChatId]);

    // Auto-dismiss error after 4 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages, isTyping, initialChatId]);

    // Mobile sidebar close on resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setMobileMenuOpen(false);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);


    const tokenRef = useRef<string | null>(null);

    // Keep token fresh for beacon usage
    useEffect(() => {
        const fetchToken = async () => {
            const { data } = await supabase.auth.getSession();
            tokenRef.current = data.session?.access_token || null;
        };
        fetchToken();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            tokenRef.current = session?.access_token || null;
        });
        return () => subscription.unsubscribe();
    }, []);

    const summarizeChat = useCallback((chatId: string) => {
        if (!chatId) return;
        // Prevent 401: If no token (logged out or expired), don't attempt summary
        if (!tokenRef.current) return;

        console.log(`[Summarize] Triggered for chat ${chatId}. Has new messages: ${hasNewMessagesRef.current}`);

        // Optimization: Only summarize if user actually sent new messages
        if (!hasNewMessagesRef.current) {
            console.log(`[Summarize] Skipped: No new messages for ${chatId}`);
            return;
        }

        // Prevent double summarization (e.g. unload + unmount)
        hasNewMessagesRef.current = false;
        console.log(`[Summarize] Sending request for ${chatId}`);

        const payload = JSON.stringify({ chatId });
        const url = "/api/chat/summarize";

        // Use fetch with keepalive for reliable execution on unload
        fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(tokenRef.current ? { "Authorization": `Bearer ${tokenRef.current}` } : {})
            },
            body: payload,
            keepalive: true
        })
            .then(res => {
                if (res.ok) {
                    // Refresh sidebar chats to show updated summary/title
                    // Note: If calling on unload, this fetch might complete after unmount, but that's fine.
                    // If calling on switch, we definitely want global refresh.
                    refreshChats();
                }
            })
            .catch(err => console.error("Summary fetch failed", err));
    }, [refreshChats]);

    // 1. Handle Chat Switching (Summarize OLD chat) & Navigation (Unmount)
    // This cleanup function runs when currentChatId changes (user switches chat) 
    // OR when the component unmounts (user navigates away).
    useEffect(() => {
        return () => {
            if (currentChatId) {
                summarizeChat(currentChatId);
            }
        };
    }, [currentChatId, summarizeChat]);

    // 2. Handle Tab Close / Unload (Summarize CURRENT chat)
    // 2. Handle Tab Close / Unload (Summarize CURRENT chat)
    useEffect(() => {
        const handleUnload = () => {
            if (currentChatId) {
                summarizeChat(currentChatId);
            }
        };
        window.addEventListener("beforeunload", handleUnload);
        return () => {
            window.removeEventListener("beforeunload", handleUnload);
        };
    }, [currentChatId, summarizeChat]);


    const handleSendMessage = async (content: string) => {
        if (!content.trim()) return;
        if (!isLoggedIn) {
            setError("Please login to use Safe Harbour.");
            return;
        }

        setError(null);
        hasNewMessagesRef.current = true; // Mark that we have new content to summarize

        const tempId = `msg_${Date.now()}`;
        const userMessage: Message = {
            id: tempId,
            role: "user",
            content: content.trim(),
            timestamp: new Date(),
        };

        // Optimistic update
        setMessages((prev) => [...prev, userMessage]);
        setIsTyping(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const activeChatId = currentChatId;

            // Unified Backend Call for ALL models
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    message: content,
                    chatId: activeChatId,
                    model: currentModel,
                    context: messages.length === 0 ? "Previous summary was displayed to user." : undefined
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to send message via Backend");
            }

            // Handle PII Findings
            if (data.findings && data.findings.length > 0) {
                setPiiFindings(data.findings);
            }

            // Handle New Chat Creation
            if (data.chatId && data.chatId !== activeChatId) {
                isCreatingRef.current = true; // Signal to useEffect to skip reset/fetch
                setCurrentChatId(data.chatId);
                // Refresh chats to update Sidebar text/recents
                refreshChats();
                // Use pushState to avoid page reload/refetch
                window.history.pushState({}, '', `/c/${data.chatId}`);
            }

            // Restore & Add AI Message
            const restoredReply = PIIService.restore(data.reply, data.originalMap || {});
            const aiMessage: Message = {
                id: `msg_${Date.now() + 1}`,
                role: "assistant",
                content: restoredReply,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);

            // Ideally remove the optimistic message here, but for now we keep it so user can copy-paste
        } catch (err: any) {
            console.error("Chat Error:", err);

            // --- FAILOVER LOGIC (Only for ChatGPT/Backend failures mostly, but applied generally) ---
            console.log("Primary attempt failed, attempting Fallback 1: OpenRouter Gemini Flash...");
            try {
                // Construct temporary message history for fallback (including current user message)
                const fallbackMessages = [...messages, userMessage];

                // Fallback 1: Gemini Flash
                const reply = await callOpenRouter("google/gemini-2.0-flash-exp:free", fallbackMessages);

                // Success! Add AI message
                const aiMessage: Message = {
                    id: `msg_${Date.now() + 1}`,
                    role: "assistant",
                    content: reply,
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, aiMessage]);
                setError(null); // Clear previous error

            } catch (fallbackErr1) {
                console.error("Fallback 1 Failed:", fallbackErr1);
                console.log("Attempting Fallback 2: OpenRouter Qwen...");

                try {
                    // Construct temporary message history for fallback
                    const fallbackMessages = [...messages, userMessage];

                    // Fallback 2: Qwen
                    const reply = await callOpenRouter("qwen/qwen3-235b-a22b:free", fallbackMessages);

                    // Success! Add AI message
                    const aiMessage: Message = {
                        id: `msg_${Date.now() + 1}`,
                        role: "assistant",
                        content: reply,
                        timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, aiMessage]);
                    setError(null); // Clear previous error

                } catch (fallbackErr2) {
                    console.error("Fallback 2 Failed:", fallbackErr2);
                    setError(err.message || "Failed to send message. All fallbacks failed.");
                }
            }

        } finally {
            setIsTyping(false);
        }
    };

    const hasMessages = messages.length > 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isAppReady ? 1 : 0 }}
            className="relative flex h-screen overflow-hidden bg-background"
        >
            <PIIAlert findings={piiFindings} onDismiss={() => setPiiFindings([])} />

            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <Sidebar />
            </div>

            {/* Mobile Sidebar */}
            <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden relative">
                {/* Header */}
                <Header onMenuClick={() => setMobileMenuOpen(true)} />

                {/* Error Alert Overlay */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20, scale: 0.9 }}
                            className="fixed top-4 right-4 z-50 flex justify-end pointer-events-none p-4"
                        >
                            <Alert variant="destructive" className="max-w-md shadow-2xl pointer-events-auto bg-destructive/10 border-destructive/50 backdrop-blur-sm">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Chat Area */}
                <main className="relative flex flex-1 flex-col overflow-hidden">
                    {/* Content */}
                    <AnimatePresence mode="wait">
                        {!hasMessages && !initialChatId ? (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                className="flex-1 h-full overflow-hidden"
                            >
                                <WelcomeScreen
                                    onSendMessage={handleSendMessage}
                                    currentModel={currentModel}
                                    onModelChange={setCurrentModel}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key={currentChatId || "new-chat"}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-1 flex-col overflow-hidden"
                            >
                                {/* Messages - Add padding bottom to account for floating input */}
                                <ScrollArea className="flex-1 h-full" ref={scrollRef}>
                                    <div className="max-w-3xl mx-auto pb-48 pt-4 px-2 md:px-0 min-h-screen">
                                        <MessageList messages={messages} />

                                        {/* Typing indicator */}
                                        <AnimatePresence>
                                            {isTyping && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="flex gap-3 px-4 py-4"
                                                >
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-muted">
                                                        <span className="text-[10px] font-bold">AI</span>
                                                    </div>
                                                    <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-none text-sm text-muted-foreground">
                                                        Thinking...
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        <div className="h-4" /> {/* Extra spacer */}
                                    </div>
                                </ScrollArea>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Floating Input - Only show when chat is active */}
                    {(hasMessages || initialChatId) && (
                        <div className="absolute bottom-0 left-0 right-0 p-4 pt-4 z-40">
                            <div className="max-w-3xl mx-auto">
                                <ChatInput
                                    onSend={handleSendMessage}
                                    disabled={isTyping}
                                    currentModel={currentModel}
                                    onModelChange={setCurrentModel}
                                    className="bg-white dark:bg-card ring-0"
                                />
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Auth Modal */}
            <AuthModal />
        </motion.div>
    );
}
