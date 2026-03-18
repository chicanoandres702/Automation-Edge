"use client";

import { Zap, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface TacticalControlCardProps {
    prompt: string;
    setPrompt: (val: string) => void;
    isGenerating: boolean;
    onInitiate: (customPrompt?: string) => void;
    activeStatus?: string;
}

export function TacticalControlCard({
    prompt,
    setPrompt,
    isGenerating,
    onInitiate,
    activeStatus
}: TacticalControlCardProps) {
    const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

    useEffect(() => {
        let mounted = true;
        const readCooldown = () => {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.get(['ai_rate_limit_cooldown'], (res: any) => {
                        if (!mounted) return;
                        const v = res?.ai_rate_limit_cooldown;
                        setCooldownUntil(v ? Number(v) : null);
                    });
                } else {
                    const v = localStorage.getItem('ai_rate_limit_cooldown');
                    setCooldownUntil(v ? Number(v) : null);
                }
            } catch (e) {
                if (mounted) setCooldownUntil(null);
            }
        };

        readCooldown();
        const iv = setInterval(readCooldown, 1000);
        return () => { mounted = false; clearInterval(iv); };
    }, []);

    const cooldownActive = !!(cooldownUntil && Date.now() < cooldownUntil);
    const secondsLeft = cooldownActive ? Math.ceil((cooldownUntil! - Date.now()) / 1000) : 0;
    return (
        <Card className="p-1.5 bg-black/40 backdrop-blur-3xl border-white/10 rounded-2xl shadow-2xl ring-1 ring-white/10 group transition-all duration-300 hover:ring-primary/20">
            <div className="flex flex-col sm:flex-row gap-2 p-2">
                <div className="relative flex-1">
                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Enter Tactical Objective (e.g. Complete Week 3 for SWK-2400)..."
                        className="bg-transparent border-none text-sm h-12 pl-10 focus-visible:ring-0 placeholder:text-muted-foreground/40"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && prompt.trim() && onInitiate()}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => onInitiate()}
                        disabled={isGenerating || !prompt.trim() || cooldownActive}
                        className="h-12 px-8 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                        {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current mr-2" />}
                        {isGenerating ? "Mapping" : "Initiate"}
                    </Button>

                    <div className="flex items-center gap-2">
                        {cooldownActive && (
                            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full bg-yellow-600/10 text-yellow-400">
                                Cooldown: {secondsLeft}s
                            </span>
                        )}

                        {activeStatus && (
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full",
                                activeStatus === 'running' ? 'bg-primary/10 text-primary' :
                                    activeStatus === 'seeking' ? 'bg-yellow-600/10 text-yellow-400' :
                                        activeStatus === 'intervention_required' ? 'bg-destructive/10 text-destructive' :
                                            'bg-white/5 text-muted-foreground'
                            )}>
                                {activeStatus}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
