"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/contexts/app-context";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, UserPlus, ArrowLeft, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type AuthView = "welcome" | "login" | "signup";

export function AuthModal() {
    const { showAuthModal, setShowAuthModal, setIsLoggedIn, setUserProfile, theme } = useApp();
    const [view, setView] = useState<AuthView>("welcome");
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const checkTheme = () => {
            if (theme === "dark") {
                setIsDark(true);
            } else if (theme === "light") {
                setIsDark(false);
            } else {
                setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
            }
        };

        checkTheme();

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => checkTheme();
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, [theme]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            if (view === "login") {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                // Success is handled by the onAuthStateChange listener in AppContext
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name: name,
                        },
                    },
                });
                if (error) throw error;
                // For signup, we might want to tell them to check email, or if auto-confirm is on, it just logs in.
                // Assuming "link" means functional, we rely on Supabase default.
            }

            // If no error, we can close modal? 
            // Better to wait for session change, but for UX responsiveness:
            // If checking session in AppContext, that will update isLoggedIn.
            // We can close modal here if successful.

            // Note: If email confirmation is required, signUp won't create a session immediately.
            // We'll assume successful action means we can reset form/close modal or show "Check email".
            // For this implementation, let's close modal.

            setShowAuthModal(false);
            setEmail("");
            setPassword("");
            setName("");
            setView("welcome");

        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        setView("welcome");
        setError("");
        setEmail("");
        setPassword("");
        setName("");
    };

    const handleClose = () => {
        setShowAuthModal(false);
        setView("welcome");
        setError("");
        setEmail("");
        setPassword("");
        setName("");
    };

    return (
        <Dialog open={showAuthModal} onOpenChange={handleClose}>
            <DialogContent
                className="sm:max-w-[425px] p-0 bg-transparent border-0 shadow-none flex items-center justify-center"
                showCloseButton={false}
            >
                <VisuallyHidden>
                    <DialogTitle>Authentication</DialogTitle>
                </VisuallyHidden>
                <AnimatePresence mode="wait">
                    {view === "welcome" && (
                        <motion.div
                            key="welcome"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-full"
                        >
                            <div className="card-animated bg-card shadow-lg">
                                <span className="card-glass"></span>
                                <div className="card-content bg-card/95 backdrop-blur-xl w-full">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-3 right-3 h-8 w-8 z-10"
                                        onClick={handleClose}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <CardHeader className="space-y-2 pb-4 text-center pt-8">
                                        <div className="mx-auto flex h-40 w-40 items-center justify-center">
                                            <Image
                                                src="/logo.png"
                                                alt="Safe Harbour"
                                                width={140}
                                                height={140}
                                                className="dark:invert"
                                            />
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl font-bold">
                                                Welcome to Safe Harbour
                                            </CardTitle>
                                            <CardDescription className="pt-2">
                                                Your secure AI assistant for cybersecurity and beyond
                                            </CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 pb-6">
                                        <Button
                                            onClick={() => setView("login")}
                                            className="w-full h-12 text-base bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-black dark:hover:bg-white btn-animated"
                                            size="lg"
                                        >
                                            <LogIn className="mr-2 h-5 w-5" />
                                            <span>Login</span>
                                        </Button>
                                        <Button
                                            onClick={() => setView("signup")}
                                            variant="outline"
                                            className="w-full h-12 text-base btn-glare"
                                            size="lg"
                                        >
                                            <UserPlus className="mr-2 h-5 w-5" />
                                            <span>Create Account</span>
                                        </Button>
                                    </CardContent>
                                    <CardFooter className="justify-center pb-6">
                                        <p className="text-xs text-muted-foreground text-center">
                                            By continuing, you agree to our Terms of Service and Privacy Policy
                                        </p>
                                    </CardFooter>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {view === "login" && (
                        <motion.div
                            key="login"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-full"
                        >
                            <div className="card-animated bg-card shadow-lg">
                                <span className="card-glass"></span>
                                <div className="card-content bg-card/95 backdrop-blur-xl w-full py-6">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-3 right-3 h-8 w-8 z-10"
                                        onClick={handleClose}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <CardHeader className="space-y-1 pb-4">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={handleBack}
                                            >
                                                <ArrowLeft className="h-4 w-4" />
                                            </Button>
                                            <div>
                                                <CardTitle className="text-xl font-bold">
                                                    Welcome Back
                                                </CardTitle>
                                                <CardDescription>
                                                    Enter your credentials to continue
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleSubmit}>
                                            <div className="grid gap-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="email">Email</Label>
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        placeholder="name@example.com"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        className="bg-background/50"
                                                        required
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="password">Password</Label>
                                                    <Input
                                                        id="password"
                                                        type="password"
                                                        placeholder="••••••••"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className="bg-background/50"
                                                        required
                                                    />
                                                </div>
                                                <AnimatePresence>
                                                    {error && (
                                                        <motion.p
                                                            initial={{ opacity: 0, y: -5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -5 }}
                                                            className="text-sm text-destructive text-center"
                                                        >
                                                            {error}
                                                        </motion.p>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            <Button
                                                type="submit"
                                                className="w-full mt-6 bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-black dark:hover:bg-white btn-animated"
                                                disabled={isLoading}
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        <span>Signing in...</span>
                                                    </>
                                                ) : (
                                                    <span>Sign In</span>
                                                )}
                                            </Button>
                                        </form>
                                    </CardContent>
                                    <CardFooter className="flex flex-col gap-4 pt-0">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="w-full text-sm"
                                            onClick={() => {
                                                setView("signup");
                                                setError("");
                                            }}
                                        >
                                            Don&apos;t have an account? Sign up
                                        </Button>
                                    </CardFooter>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {view === "signup" && (
                        <motion.div
                            key="signup"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-full"
                        >
                            <div className="card-animated bg-card shadow-lg">
                                <span className="card-glass"></span>
                                <div className="card-content bg-card/95 backdrop-blur-xl w-full py-6">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-3 right-3 h-8 w-8 z-10"
                                        onClick={handleClose}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <CardHeader className="space-y-1 pb-4">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={handleBack}
                                            >
                                                <ArrowLeft className="h-4 w-4" />
                                            </Button>
                                            <div>
                                                <CardTitle className="text-xl font-bold">
                                                    Create Account
                                                </CardTitle>
                                                <CardDescription>
                                                    Sign up to start using Safe Harbour
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleSubmit}>
                                            <div className="grid gap-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="signup-name">Name</Label>
                                                    <Input
                                                        id="signup-name"
                                                        type="text"
                                                        placeholder="John Doe"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        className="bg-background/50"
                                                        required
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="signup-email">Email</Label>
                                                    <Input
                                                        id="signup-email"
                                                        type="email"
                                                        placeholder="name@example.com"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        className="bg-background/50"
                                                        required
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="signup-password">Password</Label>
                                                    <Input
                                                        id="signup-password"
                                                        type="password"
                                                        placeholder="••••••••"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className="bg-background/50"
                                                        required
                                                    />
                                                </div>
                                                <AnimatePresence>
                                                    {error && (
                                                        <motion.p
                                                            initial={{ opacity: 0, y: -5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -5 }}
                                                            className="text-sm text-destructive text-center"
                                                        >
                                                            {error}
                                                        </motion.p>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            <Button
                                                type="submit"
                                                className="w-full mt-6 bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:bg-black dark:hover:bg-white btn-animated"
                                                disabled={isLoading}
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        <span>Creating account...</span>
                                                    </>
                                                ) : (
                                                    <span>Create Account</span>
                                                )}
                                            </Button>
                                        </form>
                                    </CardContent>
                                    <CardFooter className="flex flex-col gap-4 pt-0">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="w-full text-sm"
                                            onClick={() => {
                                                setView("login");
                                                setError("");
                                            }}
                                        >
                                            Already have an account? Sign in
                                        </Button>
                                    </CardFooter>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}
