"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, ArrowUp, X, Sparkles, Zap, Brain, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { AIModel } from "@/contexts/app-context";

interface ChatInputProps {
    onSend: (message: string, files?: File[]) => void;
    disabled?: boolean;
    className?: string;
    currentModel: AIModel;
    onModelChange: (model: AIModel) => void;
}

const modelOptions = [
    { value: "chatgpt", label: "ChatGPT", icon: Sparkles, color: "text-green-500" },
    { value: "gemini", label: "Gemini", icon: Zap, color: "text-blue-500" },
    { value: "claude", label: "Claude", icon: Brain, color: "text-orange-500" },
    { value: "deepseek", label: "Deepseek", icon: Terminal, color: "text-purple-500" },
] as const;

export function ChatInput({ onSend, disabled, className, currentModel, onModelChange }: ChatInputProps) {
    const [message, setMessage] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [isConverting, setIsConverting] = useState(false); // New state for OCR status
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [message]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((message.trim() || files.length > 0) && !isConverting) {
            setIsConverting(true);
            try {
                let finalMessage = message.trim();

                // OCR / Text Extraction
                if (files.length > 0) {
                    const { convertFileToText } = await import("@/utils/ocr");
                    const fileTexts = await Promise.all(files.map(async (file) => {
                        try {
                            const text = await convertFileToText(file);
                            // Use special delimiters for UI parsing
                            return `\n:::FILE_START:${file.name}:::\n${text}\n:::FILE_END:::`;
                        } catch (err) {
                            console.error(`Failed to extracting text from ${file.name}`, err);
                            return `\n:::FILE_ERROR:${file.name}:::`;
                        }
                    }));
                    finalMessage += fileTexts.join("\n");
                }

                onSend(finalMessage, []); // Send cleared files, text is now in message
                setMessage("");
                setFiles([]);
                if (textareaRef.current) {
                    textareaRef.current.style.height = "auto";
                }
            } catch (error) {
                console.error("Submission failed", error);
            } finally {
                setIsConverting(false);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const canSubmit = (message.trim().length > 0 || files.length > 0) && !isConverting;

    return (
        <div className="w-full max-w-3xl mx-auto px-4">
            <motion.div
                animate={{
                    boxShadow: isFocused
                        ? "0 0 0 2px hsl(var(--brand-accent) / 0.3), 0 4px 20px rgba(0, 0, 0, 0.1)"
                        : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", // Default drop shadow
                }}
                transition={{ duration: 0.2 }}
                className={cn(
                    "relative flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 transition-colors",
                    isFocused && "border-[hsl(var(--brand-accent)/0.5)]",
                    className
                )}
            >
                {/* File previews */}
                <AnimatePresence>
                    {files.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex flex-wrap gap-2 pb-2"
                        >
                            {files.map((file, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm"
                                >
                                    <span className="truncate max-w-[150px]">{file.name}</span>
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="rounded-full p-0.5 hover:bg-background/80"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Input area */}
                <div className="flex items-end gap-2">
                    {/* File upload button - Styled Circle on Left */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.md,.json,.csv,image/*"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0 rounded-full bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 shadow-sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled || isConverting}
                    >
                        <Paperclip className="h-5 w-5" />
                    </Button>

                    {/* Model Selector */}
                    <Select value={currentModel} onValueChange={(val) => onModelChange(val as AIModel)}>
                        <SelectTrigger className="h-9 w-[130px] border-0 bg-muted/50 hover:bg-muted px-2 gap-2 text-xs font-medium">
                            <div className="flex items-center gap-2 truncate pl-1">
                                <SelectValue />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {modelOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    <div className="flex items-center gap-2">
                                        <span>{opt.label}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Textarea */}
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={isConverting ? "Processing files..." : "Message Safe Harbour..."}
                        disabled={disabled || isConverting}
                        rows={1}
                        className={cn(
                            "flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground",
                            "focus:outline-none disabled:opacity-50",
                            "min-h-[24px] max-h-[200px] py-2"
                        )}
                    />

                    {/* Send button */}
                    <motion.div
                        animate={{
                            scale: canSubmit ? 1 : 0.9,
                            opacity: canSubmit ? 1 : 0.5,
                        }}
                        transition={{ duration: 0.15 }}
                    >
                        <Button
                            type="submit"
                            size="icon"
                            className={cn(
                                "h-9 w-9 shrink-0 rounded-xl transition-colors",
                                canSubmit
                                    ? "bg-[hsl(var(--brand-accent))] hover:bg-[hsl(var(--brand-accent)/0.9)] text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            )}
                            disabled={disabled || !canSubmit}
                            onClick={() => handleSubmit()}
                        >
                            <ArrowUp className="h-5 w-5" />
                        </Button>
                    </motion.div>
                </div>
                {isConverting && <div className="text-xs text-muted-foreground px-1">Converting media to text...</div>}
            </motion.div>
        </div>
    );
}
