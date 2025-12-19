"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type AIModel = "chatgpt" | "claude" | "gemini" | "deepseek";
export type Theme = "light" | "dark" | "system";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatHistory {
  id: string;
  title: string;
  lastMessage: string;
  createdAt: string; // Use string to avoid hydration issues with Date
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AppContextType {
  // Auth state
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;

  // Model state
  currentModel: AIModel;
  setCurrentModel: (model: AIModel) => void;

  // Theme state
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Chat state
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  chatHistory: ChatHistory[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatHistory[]>>;
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;

  // Auth modal
  showAuthModal: boolean;
  setShowAuthModal: (value: boolean) => void;

  // App ready state
  isAppReady: boolean;

  // Actions
  deleteChat: (chatId: string) => Promise<boolean>;
  renameChat: (chatId: string, newTitle: string) => Promise<boolean>;
  refreshChats: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mock chat history data - using static strings for timestamps to avoid hydration issues
const mockChatHistory: ChatHistory[] = [
  {
    id: "1",
    title: "DREAD score calculation",
    lastMessage: "The DREAD score is calculated by...",
    createdAt: "30m ago",
  },
  {
    id: "2",
    title: "What is IAM",
    lastMessage: "IAM stands for Identity and Access Management...",
    createdAt: "2h ago",
  },
  {
    id: "3",
    title: "Scapy common functions",
    lastMessage: "Here are the most commonly used Scapy functions...",
    createdAt: "1d ago",
  },
  {
    id: "4",
    title: "SQL injection prevention",
    lastMessage: "To prevent SQL injection attacks...",
    createdAt: "2d ago",
  },
  {
    id: "5",
    title: "OAuth 2.0 flow explained",
    lastMessage: "OAuth 2.0 uses several grant types...",
    createdAt: "3d ago",
  },
];

import { supabase } from "@/lib/supabase";

// ... existing interfaces ...

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentModel, setCurrentModel] = useState<AIModel>("chatgpt");
  const [theme, setTheme] = useState<Theme>("system");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>(mockChatHistory);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);

  // Initialize Supabase Auth Listener
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      if (session?.user) {
        setUserProfile({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.name || session.user.email!.split('@')[0],
          avatar: session.user.user_metadata.avatar_url,
        });
      }
      setIsAppReady(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (session?.user) {
        setUserProfile({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.name || session.user.email!.split('@')[0],
          avatar: session.user.user_metadata.avatar_url,
        });
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshChats = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Map Supabase chats to ChatHistory interface
        const mapped: ChatHistory[] = data.map(c => ({
          id: c.id,
          title: c.title || "New Chat",
          lastMessage: c.summary || "No summary available",
          createdAt: new Date(c.created_at).toLocaleDateString(), // Simple formatting
        }));
        setChatHistory(mapped);
      }
    } catch (err) {
      console.error("Failed to refresh chats:", err);
    }
  }, []);

  // Initial fetch on login
  useEffect(() => {
    if (isLoggedIn) {
      refreshChats();
    }
  }, [isLoggedIn]);


  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.toggle("dark", systemTheme === "dark");
    } else {
      root.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  // Apply model accent color to document
  useEffect(() => {
    document.documentElement.setAttribute("data-model", currentModel);
  }, [currentModel]);

  // Handle system theme changes
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle("dark", e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  // When user logs in, hide auth modal
  useEffect(() => {
    if (isLoggedIn) {
      setShowAuthModal(false);
    }
  }, [isLoggedIn]);

  const deleteChat = async (chatId: string) => {
    try {
      const { error } = await supabase.from('chats').delete().eq('id', chatId);
      if (error) throw error;

      // Update local state if needed (though components mostly fetch their own)
      setChatHistory(prev => prev.filter(c => c.id !== chatId));

      // If current chat is deleted, reset
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
      return true;
    } catch (err) {
      console.error("Failed to delete chat:", err);
      return false;
    }
  };

  const renameChat = async (chatId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from('chats')
        .update({ title: newTitle })
        .eq('id', chatId);

      if (error) throw error;

      setChatHistory(prev => prev.map(c =>
        c.id === chatId ? { ...c, title: newTitle } : c
      ));
      return true;
    } catch (err) {
      console.error("Failed to rename chat:", err);
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        userProfile,
        setUserProfile,
        currentModel,
        setCurrentModel,
        theme,
        setTheme,
        messages,
        setMessages,
        chatHistory,
        setChatHistory,
        currentChatId,
        setCurrentChatId,
        showAuthModal,
        setShowAuthModal,
        isAppReady,
        deleteChat,
        renameChat,
        refreshChats, // Added
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
