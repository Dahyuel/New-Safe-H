"use client";

import { ChatPageContent } from "@/components/chat-page/chat-page-content";
import { use } from "react";

export default function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
    // Try to unwrap params using React.use() - Next.js 15+ pattern
    // If strict mode fails, we might need a different approach or useEffect, 
    // but let's try standard Next.js 15 dynamic params handling first.
    const resolvedParams = use(params);

    return <ChatPageContent initialChatId={resolvedParams.chatId} />;
}
