"use client";

import { useApp } from "@/contexts/app-context";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Settings, LogOut, LogIn, Menu, Sun, Moon, Monitor } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import type { AIModel, Theme } from "@/contexts/app-context";

interface HeaderProps {
    onMenuClick: () => void;
}

const modelOptions: { value: AIModel; label: string; color: string }[] = [
    { value: "chatgpt", label: "ChatGPT", color: "#000000" },
    { value: "claude", label: "Claude", color: "#D97706" },
    { value: "gemini", label: "Gemini", color: "#2563EB" },
    { value: "deepseek", label: "Deepseek", color: "#7C3AED" },
];

export function Header({ onMenuClick }: HeaderProps) {
    const { currentModel, setCurrentModel, theme, setTheme, isLoggedIn, setIsLoggedIn, setShowAuthModal, userProfile } = useApp();
    const [settingsOpen, setSettingsOpen] = useState(false);

    const currentModelOption = modelOptions.find((m) => m.value === currentModel);

    const handleLogout = () => {
        setIsLoggedIn(false);
        setShowAuthModal(true);
    };

    const handleLogin = () => {
        setShowAuthModal(true);
    };

    return (
        <>
            <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-16 items-center justify-between px-4 md:px-6">
                    {/* Mobile menu button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={onMenuClick}
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle menu</span>
                    </Button>

                    {/* Main Title / Spacer */}
                    <div className="flex-1 flex justify-center md:justify-start">
                        {/* Text removed as requested */}
                    </div>

                    {/* Profile Icon - Right */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="relative h-9 w-9 rounded-full"
                            >
                                {userProfile?.avatar ? (
                                    <img
                                        src={userProfile.avatar}
                                        alt={userProfile.name}
                                        className="h-9 w-9 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black dark:bg-white">
                                        <User className="h-4 w-4 text-white dark:text-black" />
                                    </div>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            {isLoggedIn && userProfile && (
                                <>
                                    <div className="px-2 py-1.5">
                                        <p className="text-sm font-medium">{userProfile.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {userProfile.email}
                                        </p>
                                    </div>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isLoggedIn ? (
                                <DropdownMenuItem onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Logout
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem onClick={handleLogin}>
                                    <LogIn className="mr-2 h-4 w-4" />
                                    Login
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Settings Modal */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label>Theme</Label>
                            <div className="flex gap-2">
                                {([
                                    { value: "light", icon: Sun, label: "Light" },
                                    { value: "dark", icon: Moon, label: "Dark" },
                                    { value: "system", icon: Monitor, label: "System" },
                                ] as const).map((option) => (
                                    <Button
                                        key={option.value}
                                        variant={theme === option.value ? "default" : "outline"}
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => setTheme(option.value as Theme)}
                                    >
                                        <option.icon className="mr-2 h-4 w-4" />
                                        {option.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
