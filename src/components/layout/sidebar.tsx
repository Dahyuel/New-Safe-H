"use client";

import { useApp } from "@/contexts/app-context";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, User, Lock, MoreHorizontal, Pencil, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";

interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    const {
        chatHistory,
        currentChatId,
        setCurrentChatId,
        setMessages,
        userProfile,
        isLoggedIn,
        deleteChat,
        renameChat,
    } = useApp();

    const pathname = usePathname();
    const router = useRouter();
    const [localChats, setLocalChats] = useState<any[]>([]);

    // Rename state
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [chatToRename, setChatToRename] = useState<{ id: string, title: string } | null>(null);
    const [newTitle, setNewTitle] = useState("");

    // Delete state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [chatToDelete, setChatToDelete] = useState<string | null>(null);
    const { refreshChats } = useApp(); // Use global refresh logic

    // Sync context chatHistory with localChats to reflect updates immediately
    useEffect(() => {
        // We use localChats primarily, but if update comes from context (delete/rename), we should sync.
        // However, original logic fetched directly. Let's merge logic. 
        // Actually, if we use AppContext's chatHistory properly, we wouldn't need local fetch here?
        // But the existing code fetches locally. Let's stick to local fetching but re-fetch on signals or just slice existing.
    }, [chatHistory]);

    useEffect(() => {
        if (!isLoggedIn || !userProfile) {
            setLocalChats([]);
            return;
        }

        const fetchChats = async () => {
            const { data, error } = await supabase
                .from('chats')
                .select('*')
                .eq('user_id', userProfile.id)
                .order('created_at', { ascending: false });

            if (data) {
                setLocalChats(data.map(chat => ({
                    id: chat.id,
                    title: chat.title || chat.summary || "New Chat",
                    createdAt: new Date(chat.created_at).toLocaleDateString(),
                    summary: chat.summary
                })));
            }
        };

        fetchChats();
        fetchChats();
    }, [isLoggedIn, userProfile, currentChatId, chatHistory, pathname]); // Depend on pathname to refresh on navigation

    const handleNewChat = () => {
        setCurrentChatId(null);
        setMessages([]);
        router.push("/");
    };

    const handleDelete = async (e: React.MouseEvent, chatId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setChatToDelete(chatId);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!chatToDelete) return;

        await deleteChat(chatToDelete);

        // Optimistic update locally
        setLocalChats(prev => prev.filter(c => c.id !== chatToDelete));

        // Ensure global refresh
        await refreshChats();

        setDeleteDialogOpen(false);
        setChatToDelete(null);
    };

    const handleRenameClick = (e: React.MouseEvent, chat: any) => {
        e.preventDefault();
        e.stopPropagation();
        setChatToRename({ id: chat.id, title: chat.title });
        setNewTitle(chat.title);
        setRenameDialogOpen(true);
    };

    const handleRenameSubmit = async () => {
        if (chatToRename && newTitle.trim()) {
            await renameChat(chatToRename.id, newTitle.trim());
            setRenameDialogOpen(false);
            setChatToRename(null);
            // Optimistic update locally
            setLocalChats(prev => prev.map(c => c.id === chatToRename.id ? { ...c, title: newTitle.trim() } : c));
        }
    };

    // Limit to 5 chats for Sidebar (Recents)
    const recentChats = localChats.slice(0, 5);

    return (
        <div
            className={cn(
                "flex h-full w-[16rem] lg:w-70 flex-col bg-sidebar border-r border-sidebar-border", // Decreased width
                className
            )}
        >
            {/* Logo/Brand */}
            <div className="flex h-16 items-center border-b border-sidebar-border px-4 justify-center md:justify-start">
                <motion.div
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Link href="/">
                        <Image
                            src="/logo.png"
                            alt="Safe Harbour"
                            width={32}
                            height={32}
                            className="dark:invert hover:opacity-80 transition-opacity"
                        />
                    </Link>
                    <span className="font-semibold text-sidebar-foreground">Safe Harbour</span>
                </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="p-3 space-y-2">
                <Button
                    onClick={handleNewChat}
                    className="w-full justify-start gap-2 bg-black dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-white border border-black dark:border-white btn-animated"
                >
                    <Plus className="h-4 w-4" />
                    <span>New Chat</span>
                </Button>
                <Link href="/dashboard" className="block">
                    <Button
                        variant={pathname === "/dashboard" ? "secondary" : "ghost"}
                        className="w-full justify-start gap-2 border border-transparent hover:border-black dark:hover:border-white transition-colors"
                    >
                        <Lock className="h-4 w-4" />
                        Dashboard
                    </Button>
                </Link>
                <Link href="/chats" className="block">
                    <Button
                        variant={pathname === "/chats" ? "secondary" : "ghost"}
                        className="w-full justify-start gap-2 border border-transparent hover:border-black dark:hover:border-white transition-colors"
                    >
                        <MessageSquare className="h-4 w-4" />
                        Chats
                    </Button>
                </Link>
            </div>

            {/* Recent Chats Label */}
            <div className="px-4 py-2">
                <p className="text-xs font-medium text-muted-foreground">Recents</p>
            </div>

            {/* Chat History */}
            <ScrollArea className="flex-1 px-0">
                <div className="space-y-0 pb-4">
                    {recentChats.map((chat, index) => (
                        <motion.div
                            key={chat.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.2 }}
                            className="group relative"
                        >
                            <Link href={`/c/${chat.id}`} className="block">
                                <button
                                    className={cn(
                                        "w-full flex items-start gap-2 px-4 py-2 text-left text-sm chat-item-animated pr-8 hover:bg-sidebar-accent/50 transition-colors border-b border-border/40 rounded-none relative", // Full width, no margin, rectangular
                                        currentChatId === chat.id &&
                                        "bg-sidebar-accent text-sidebar-accent-foreground border-border"
                                    )}
                                >
                                    <div className="flex-1 overflow-hidden min-w-0">
                                        <p className="truncate font-medium text-sidebar-foreground text-[10px] leading-tight">
                                            {chat.title}
                                        </p>
                                        <p className="truncate text-[9px] text-muted-foreground mt-0.5">
                                            {chat.createdAt}
                                        </p>
                                    </div>
                                </button>
                            </Link>

                            {/* Three Dot Menu - Adjusted positioning */}
                            <div className="absolute right-2 top-2 z-30 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 text-sidebar-foreground group-hover:bg-white group-hover:text-black hover:!bg-zinc-200 dark:hover:!bg-white dark:hover:!text-black hover:!text-black data-[state=open]:opacity-100 data-[state=open]:!bg-white data-[state=open]:!text-black dark:data-[state=open]:!bg-white dark:data-[state=open]:!text-black"
                                        >
                                            <MoreHorizontal className="h-3 w-3" />
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
                    {recentChats.length === 0 && (
                        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                            No recent chats
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* User Profile Section */}
            <div className="border-t border-sidebar-border p-3">
                <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/30 px-3 py-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black dark:bg-white">
                        <User className="h-4 w-4 text-white dark:text-black" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        {isLoggedIn && userProfile ? (
                            <>
                                <p className="truncate text-sm font-medium text-sidebar-foreground">
                                    {userProfile.name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {userProfile.email}
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">Not signed in</p>
                        )}
                    </div>
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

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Chat?</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-sm text-muted-foreground">
                        Are you sure you want to delete this chat? This action cannot be undone.
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
