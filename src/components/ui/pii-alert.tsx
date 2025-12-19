"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, CheckCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { PIIType } from "@/lib/pii-service";

interface PIIAlertProps {
    findings: PIIType[];
    onDismiss: () => void;
}

export function PIIAlert({ findings, onDismiss }: PIIAlertProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (findings.length > 0) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                onDismiss();
            }, 5000); // Auto dismiss after 5s
            return () => clearTimeout(timer);
        }
    }, [findings, onDismiss]);

    if (!isVisible || findings.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="fixed top-20 right-4 z-50 w-80"
            >
                <div className="relative overflow-hidden rounded-xl border border-red-200 bg-white/95 dark:bg-zinc-900/95 p-4 shadow-xl backdrop-blur-md dark:border-red-900/30">
                    <div className="absolute inset-0 bg-red-500/5 dark:bg-red-500/10 pointer-events-none" />

                    <div className="flex items-start gap-4">
                        <div className="mt-1 rounded-full bg-red-100 p-2 dark:bg-red-900/20">
                            <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>

                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-foreground">
                                Sensitive Data Detected
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Safe Harbour anonymized the following PII before sending:
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {findings.map((type) => (
                                    <span
                                        key={type}
                                        className="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                    >
                                        {type}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setIsVisible(false);
                                onDismiss();
                            }}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Progress bar for auto-dismiss */}
                    <motion.div
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 5, ease: "linear" }}
                        className="absolute bottom-0 left-0 h-1 bg-red-500/20"
                    />
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
