"use client";

import { MorphingText } from "@/components/ui/morphing-text";
import { ChatInput } from "./chat-input";
import { motion } from "framer-motion";

import { AIModel } from "@/contexts/app-context";

interface WelcomeScreenProps {
    onSendMessage: (message: string) => void;
    currentModel: AIModel;
    onModelChange: (model: AIModel) => void;
}

export function WelcomeScreen({ onSendMessage, currentModel, onModelChange }: WelcomeScreenProps) {
    return (
        <div className="flex h-full w-full flex-1 flex-col items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="w-full max-w-2xl space-y-8"
            >
                {/* Morphing Text */}
                <div className="text-center">
                    <MorphingText
                        texts={["Safe", "Harbour"]}
                        className="text-foreground h-24 md:h-32 lg:h-40 text-[60pt] md:text-[80pt] lg:text-[8rem]"
                    />
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="mt-6 text-muted-foreground text-sm md:text-base lg:text-lg"
                    >
                        Your secure AI assistant for cybersecurity and beyond
                    </motion.p>
                </div>

                {/* Chat Input */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                >
                    <ChatInput
                        onSend={onSendMessage}
                        currentModel={currentModel}
                        onModelChange={onModelChange}
                        className="bg-white dark:bg-card ring-0"
                    />
                </motion.div>
            </motion.div>
        </div>
    );
}
