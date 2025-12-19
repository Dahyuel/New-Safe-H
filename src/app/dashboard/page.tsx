"use client";

import { useApp } from "@/contexts/app-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Header } from "@/components/layout/header";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Shield, Lock, EyeOff, Activity, FileText, AlertTriangle } from "lucide-react";
// Duplicate import removed
import { supabase } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ... (imports remain)

// Helper to get last 7 days
const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }
    return days;
};

export default function DashboardPage() {
    const { isLoggedIn, userProfile } = useApp();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [analytics, setAnalytics] = useState<any>(null);
    const [chartData, setChartData] = useState<{ date: string; count: number }[]>([]);

    useEffect(() => {
        async function fetchData() {
            if (!userProfile) return;

            // 1. Fetch Analytics
            const { data: analyticsData } = await supabase
                .from('user_analytics')
                .select('*')
                .eq('user_id', userProfile.id)
                .single();

            if (analyticsData) {
                setAnalytics(analyticsData);
            } else {
                setAnalytics({ total_prompts: 0, pii_detected_count: 0 });
            }

            // 2. Fetch Chat History for Chart
            const startStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const { data: chatsData } = await supabase
                .from('chats')
                .select('created_at')
                .eq('user_id', userProfile.id)
                .gte('created_at', startStr);

            if (chatsData) {
                const dates = getLast7Days();
                const counts = dates.map(date => {
                    return {
                        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                        count: chatsData.filter(c => c.created_at.startsWith(date)).length
                    };
                });
                setChartData(counts);
            }
        }

        if (isLoggedIn) {
            fetchData();
        }
    }, [isLoggedIn, userProfile]);

    // Calculate Top Risk
    let mostFrequentType = "None";
    let mostFrequentCount = 0;
    if (analytics?.sensitive_data_types) {
        Object.entries(analytics.sensitive_data_types as Record<string, number>).forEach(([type, count]) => {
            if (count > mostFrequentCount) {
                mostFrequentCount = count;
                mostFrequentType = type;
            }
        });
    }

    const stats = [
        {
            title: "Total Safe Queries",
            value: analytics?.total_prompts || 0,
            icon: FileText,
            description: "Anonymized & Processed",
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            title: "PII Items Blocked",
            value: analytics?.pii_detected_count || 0,
            icon: EyeOff,
            description: "Sensitive Data Hidden",
            color: "text-red-500",
            bg: "bg-red-500/10"
        },
        {
            title: "Primary Risk",
            value: mostFrequentType,
            icon: AlertTriangle,
            description: mostFrequentCount > 0 ? `${mostFrequentCount} Attempts Blocked` : "No risks detected",
            color: "text-amber-500",
            bg: "bg-amber-500/10"
        },
        {
            title: "Protection Status",
            value: "Active",
            icon: Shield,
            description: "Real-time PII Guard",
            color: "text-green-500",
            bg: "bg-green-500/10"
        }
    ];

    const maxCount = Math.max(...chartData.map(d => d.count), 5); // Minimum scale of 5

    // Helper to parse Markdown into sections
    const parseMarkdownToSections = (markdown: string) => {
        if (!markdown) return [];
        // Split by ## or ### Heading
        // The regex captures the heading title and the content following it
        const sections = markdown.split(/(?:^|\n)#{2,3}\s+/).filter(Boolean);

        return sections.map(section => {
            const lines = section.split('\n');
            const title = lines[0].trim();
            const content = lines.slice(1).join('\n').trim();

            // Determine icon and color based on title keywords
            let icon = AlertTriangle;
            let color = "text-muted-foreground";
            let bg = "bg-muted";

            if (title.toLowerCase().includes("risk") || title.toLowerCase().includes("consequence")) {
                icon = AlertTriangle;
                color = "text-red-500";
                bg = "bg-red-500/10";
            } else if (title.toLowerCase().includes("action") || title.toLowerCase().includes("recommend")) {
                icon = Shield;
                color = "text-blue-500";
                bg = "bg-blue-500/10";
            } else if (title.toLowerCase().includes("insight") || title.toLowerCase().includes("matter")) {
                icon = FileText;
                color = "text-amber-500";
                bg = "bg-amber-500/10";
            }

            return { title, content, icon, color, bg };
        }).filter(s => !s.title.toLowerCase().includes("security analysis")); // Filter out main title
    };

    const securitySections = analytics?.sensitive_data_summary ? parseMarkdownToSections(analytics.sensitive_data_summary) : [];

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden relative">
            <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
            <div className="hidden md:block h-full">
                <Sidebar className="w-64 border-r border-sidebar-border" />
            </div>
            <div className="flex-1 flex flex-col h-full min-w-0 relative z-10 overflow-auto">
                <Header onMenuClick={() => setMobileMenuOpen(true)} />

                <main className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">Security Dashboard</h1>
                        <p className="text-muted-foreground">
                            Monitor your usage and security statistics.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {stats.map((stat, i) => (
                            <motion.div
                                key={stat.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <Card className="overflow-hidden border-border/50 hover:bg-accent/5 transition-colors">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            {stat.title}
                                        </CardTitle>
                                        <div className={`p-2 rounded-full ${stat.bg}`}>
                                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stat.value}</div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {stat.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    <Card className="border-border/50">
                        <CardHeader>
                            <CardTitle>Activity Overview</CardTitle>
                            <CardDescription>
                                Chats created over the last 7 days.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-6 py-6">
                            <div className="h-[250px] w-full flex items-end justify-between gap-2 md:gap-4">
                                {chartData.length > 0 ? (
                                    chartData.map((item, index) => (
                                        <div key={index} className="flex flex-col items-center gap-2 flex-1 group">
                                            <div className="relative w-full flex items-end justify-center h-[200px] bg-muted/10 rounded-t-lg overflow-hidden">
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${(item.count / maxCount) * 100}%` }}
                                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                                    className="w-full max-w-[40px] bg-[hsl(var(--brand-accent))] opacity-80 group-hover:opacity-100 transition-opacity rounded-t-sm min-h-[4px]"
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground font-medium">
                                                {item.date}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute mb-8">
                                                {item.count}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                        Loading activity data...
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Unified AI Security Insight Card */}
                    <Card className="border-border/50 bg-transparent shadow-none border-none p-0">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                AI Security Insight
                            </h2>
                            <p className="text-sm text-muted-foreground">Deep dive into your recent security trends.</p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-7">
                            {/* 1. Frequent Risks (Left Column) */}
                            <Card className="col-span-7 md:col-span-3 lg:col-span-2 border-border/50 h-full">
                                <CardHeader>
                                    <CardTitle className="text-base">Frequent Risks</CardTitle>
                                    <CardDescription>Data types detected most often.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {analytics?.sensitive_data_types && Object.keys(analytics.sensitive_data_types).length > 0 ? (
                                        <div className="space-y-4">
                                            {Object.entries(analytics.sensitive_data_types as Record<string, number>)
                                                .sort(([, a], [, b]) => b - a)
                                                .slice(0, 5)
                                                .map(([type, count]) => (
                                                    <div key={type} className="space-y-1">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="font-medium truncate max-w-[120px]" title={type}>{type}</span>
                                                            <span className="text-muted-foreground">{count}</span>
                                                        </div>
                                                        <Progress value={(count / Math.max(...Object.values(analytics.sensitive_data_types as Record<string, number>))) * 100} className="h-1.5" />
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center text-muted-foreground text-xs">
                                            No risks detected yet.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* 2. MD Cards (Right Column) */}
                            <div className="col-span-7 md:col-span-4 lg:col-span-5">
                                {securitySections.length > 0 ? (
                                    <div className="grid gap-4 md:grid-cols-2 h-full">
                                        {securitySections.map((section, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: idx * 0.1 + 0.3 }}
                                                className="h-full"
                                            >
                                                <Card className="h-full border-border/50 hover:border-border transition-colors">
                                                    <CardHeader className="pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`p-1.5 rounded-md ${section.bg}`}>
                                                                <section.icon className={`h-4 w-4 ${section.color}`} />
                                                            </div>
                                                            <CardTitle className="text-base">{section.title}</CardTitle>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="text-sm text-muted-foreground">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                                                                ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 mb-2" {...props} />,
                                                                li: ({ node, ...props }) => <li className="pl-1 marker:text-muted-foreground/50" {...props} />
                                                            }}
                                                        >
                                                            {section.content}
                                                        </ReactMarkdown>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <Card className="h-full flex items-center justify-center p-8 border-dashed">
                                        <div className="text-center text-muted-foreground">
                                            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p>No major security insights generated yet.</p>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </Card>
                </main>
            </div>
        </div>
    );
}
