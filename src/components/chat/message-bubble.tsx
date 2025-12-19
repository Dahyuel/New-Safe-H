"use client";

import { useApp, AIModel } from "@/contexts/app-context";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { User, Bot, FileText, AlertTriangle } from "lucide-react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface MessageBubbleProps {
    message: Message;
    index: number;
}

const modelIcons: Record<AIModel, { icon: React.ReactNode; color: string; label: string }> = {
    chatgpt: {
        icon: <Bot className="h-4 w-4" />,
        color: "#10a37f",
        label: "ChatGPT"
    },
    claude: {
        icon: <Bot className="h-4 w-4" />,
        color: "#D97706",
        label: "Claude"
    },
    gemini: {
        icon: <Bot className="h-4 w-4" />,
        color: "#2563EB",
        label: "Gemini"
    },
    deepseek: {
        icon: <Bot className="h-4 w-4" />,
        color: "#7C3AED",
        label: "Deepseek"
    },
};

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ... (imports)

export function MessageBubble({ message, index }: MessageBubbleProps) {
    const { currentModel } = useApp();
    const isUser = message.role === "user";
    // Ignore specific model config for label/icon in UI, unify as "Safe Harbour"
    // But we can keep the color distinction if desired, or make it uniform.
    // User asked "named safe harbour not the used model".

    // Content Parsing for File Markers
    const renderContent = (content: string) => {
        if (!isUser) {
            return (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                </ReactMarkdown>
            );
        }

        // Regex to match :::FILE_START:filename::: ... :::FILE_END:::
        const fileRegex = /:::FILE_START:(.*?):::([\s\S]*?):::FILE_END:::/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = fileRegex.exec(content)) !== null) {
            // Text before file
            if (match.index > lastIndex) {
                const textPart = content.substring(lastIndex, match.index).trim();
                if (textPart) parts.push(<p key={`text-${lastIndex}`} className="whitespace-pre-wrap">{textPart}</p>);
            }

            // File Chip
            const fileName = match[1];
            parts.push(
                <div key={`file-${match.index}`} className="flex items-center gap-2 p-3 my-2 bg-background/50 rounded-lg border border-border/50 max-w-xs">
                    <div className="bg-primary/10 p-2 rounded-full text-primary">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">{fileName}</span>
                        <span className="text-xs text-muted-foreground">Text Extracted</span>
                    </div>
                </div>
            );

            lastIndex = fileRegex.lastIndex;
        }

        // Remaining text
        if (lastIndex < content.length) {
            const textPart = content.substring(lastIndex).trim();
            if (textPart) parts.push(<p key={`text-end`} className="whitespace-pre-wrap">{textPart}</p>);
        }

        // If no matches, simple render
        if (parts.length === 0) {
            return <p className="whitespace-pre-wrap">{content}</p>;
        }

        return <div className="flex flex-col gap-2">{parts}</div>;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={cn(
                "w-full max-w-3xl mx-auto py-6 flex gap-4 md:gap-6",
                isUser ? "flex-row-reverse" : "flex-row"
            )}
        >
            {/* Avatar */}
            <div
                className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-sm",
                    isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-transparent text-foreground border border-border"
                )}
            >
                {isUser ? (
                    <User className="h-5 w-5" />
                ) : (
                    // Generic Valid Icon for Safe Harbour AI
                    <Bot className="h-5 w-5" />
                )}
            </div>

            {/* Message Content */}
            <div className={cn("flex flex-col gap-1 min-w-0 max-w-[85%]", isUser ? "items-end" : "items-start")}>
                {/* Name Label */}
                <span className="text-xs font-semibold text-muted-foreground mb-1 select-none">
                    {isUser ? "You" : "Safe Harbour"}
                </span>

                {/* Bubble / Text */}
                <div
                    className={cn(
                        "text-sm md:text-base leading-relaxed break-words prose dark:prose-invert max-w-none",
                        isUser
                            ? "bg-secondary text-secondary-foreground px-5 py-3 rounded-2xl rounded-tr-sm"
                            : "text-foreground px-0 py-0 bg-transparent"
                    )}
                >
                    {renderContent(message.content)}
                </div>

                {/* Timestamp */}
                {!isUser && (
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                            {formatTime(message.timestamp)}
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface MessageListProps {
    messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
    return (
        <div className="flex flex-col py-4">
            {messages.map((message, index) => (
                <MessageBubble key={message.id} message={message} index={index} />
            ))}
        </div>
    );
}
