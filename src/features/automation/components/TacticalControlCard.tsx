"use client";

import { Zap, Sparkles, RefreshCw } from "lucide-react";
import { Button, Input, Card } from "@/ui";
import { cn } from "@/lib/utils";

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
                        onKeyDown={(e) => e.key === 'Enter' && onInitiate()}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => onInitiate()}
                        disabled={isGenerating || !prompt.trim()}
                        className="h-12 px-8 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                        {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current mr-2" />}
                        {isGenerating ? "Mapping" : "Initiate"}
                    </Button>

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
        </Card>
    );
}
