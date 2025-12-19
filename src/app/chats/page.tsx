"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/contexts/app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, MessageSquare, MoreHorizontal, Pencil, Trash } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { AuthModal } from "@/components/auth/auth-modal";
import { supabase } from "@/lib/supabase";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

export default function ChatsPage() {
    const { userProfile, isLoggedIn, deleteChat, renameChat } = useApp();
    const [searchQuery, setSearchQuery] = useState("");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [localChats, setLocalChats] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Rename state
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [chatToRename, setChatToRename] = useState<{ id: string, title: string } | null>(null);
    const [newTitle, setNewTitle] = useState("");

    useEffect(() => {
        if (!isLoggedIn || !userProfile) {
            setLocalChats([]);
            setIsLoading(false);
            return;
        }

        const fetchChats = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('chats')
                .select('*')
                .eq('user_id', userProfile.id)
                .order('created_at', { ascending: false });

            if (data) {
                setLocalChats(data.map(chat => ({
                    id: chat.id,
                    title: chat.title || chat.summary || "New Chat",
                    createdAt: new Date(chat.created_at).toLocaleDateString() + " " + new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    summary: chat.summary
                })));
            }
            setIsLoading(false);
        };

        fetchChats();
    }, [isLoggedIn, userProfile]);

    const handleRenameClick = (e: React.MouseEvent, chat: any) => {
        e.preventDefault();
        e.stopPropagation();
        setChatToRename({ id: chat.id, title: chat.title });
        setNewTitle(chat.title);
        setRenameDialogOpen(true);
    };

    const handleDelete = async (e: React.MouseEvent, chatId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this chat?")) {
            await deleteChat(chatId);
            setLocalChats(prev => prev.filter(c => c.id !== chatId));
        }
    };

    const handleRenameSubmit = async () => {
        if (chatToRename && newTitle.trim()) {
            await renameChat(chatToRename.id, newTitle.trim());
            setRenameDialogOpen(false);
            setLocalChats(prev => prev.map(c => c.id === chatToRename.id ? { ...c, title: newTitle.trim() } : c));
            setChatToRename(null);
        }
    };

    const filteredChats = localChats.filter((chat) =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden relative">
            {/* Auth Modal - Required for header login functionality */}
            <AuthModal />

            {/* Mobile Sidebar - Sheet */}
            <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />

            {/* Desktop Sidebar */}
            <div className="hidden md:block h-full">
                <Sidebar className="w-64 border-r border-sidebar-border" />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full min-w-0 relative z-10">
                <Header onMenuClick={() => setMobileMenuOpen(true)} />

                <div className="flex-1 overflow-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="min-h-full"
                    >
                        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-6">
                            {/* Header with title and New Chat button */}
                            <div className="flex items-center justify-between mb-6">
                                <h1 className="text-2xl font-bold">Chats</h1>
                                <Link href="/">
                                    <Button className="bg-black dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-white border border-black dark:border-white btn-animated">
                                        <Plus className="h-4 w-4 mr-2" />
                                        <span>New chat</span>
                                    </Button>
                                </Link>
                            </div>

                            {/* Search Bar */}
                            <div className="relative mb-6">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search chats..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-11 bg-muted/50 border-input/50"
                                />
                            </div>

                            {/* Chat List */}
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground mb-4">
                                    {filteredChats.length} chats
                                </div>

                                {isLoading ? (
                                    <div className="py-8 text-center text-muted-foreground">Loading chats...</div>
                                ) : filteredChats.length > 0 ? (
                                    <div className="space-y-2">
                                        {filteredChats.map((chat, index) => (
                                            <motion.div
                                                key={chat.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.03, duration: 0.2 }}
                                                className="group relative"
                                            >
                                                <Link href={`/c/${chat.id}`} className="block">
                                                    <button className="w-full flex items-start gap-3 rounded-lg px-3 py-4 text-left text-base chat-item-animated pr-10 hover:bg-sidebar-accent/50 transition-colors border-y border-border/40 relative">
                                                        <div className="flex-1 overflow-hidden">
                                                            <p className="truncate font-medium text-foreground text-base">
                                                                {chat.title}
                                                            </p>
                                                            {chat.summary && (
                                                                <p className="truncate text-sm text-muted-foreground/80 mt-1 line-clamp-1">
                                                                    {chat.summary}
                                                                </p>
                                                            )}
                                                            <p className="truncate text-sm text-muted-foreground mt-1">
                                                                {chat.createdAt}
                                                            </p>
                                                        </div>
                                                    </button>
                                                </Link>

                                                {/* Three Dot Menu - Sibling to Link, Sidebar style structure */}
                                                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-foreground group-hover:bg-white group-hover:text-black hover:!bg-zinc-200 dark:hover:!bg-white dark:hover:!text-black hover:!text-black data-[state=open]:opacity-100 bg-transparent data-[state=open]:!bg-white data-[state=open]:!text-black dark:data-[state=open]:!bg-white dark:data-[state=open]:!text-black"
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={(e) => handleRenameClick(e, chat)}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Rename
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={(e) => handleDelete(e, chat.id)} className="text-red-500 focus:text-red-500">
                                                                <Trash className="mr-2 h-4 w-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                        <p>No chats found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Rename Dialog */}
            <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Chat</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Enter new chat name"
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleRenameSubmit}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
