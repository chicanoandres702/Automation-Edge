"use client";

import { useState, useId } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
// description will be provided via DialogContent `description` prop
import { BrainCircuit, Trash2, Send, RotateCcw } from "lucide-react";

interface ControlModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    question: string;
    onConfirm: (response: string, learnPattern: boolean) => void;
    onEraseActions: () => void;
    onReprompt: (newPrompt: string) => void;
    onSkip?: () => void;
}

export function ControlModal({
    isOpen,
    onOpenChange,
    question,
    onConfirm,
    onEraseActions,
    onReprompt,
    onSkip,
}: ControlModalProps) {
    const titleId = useId();
    const descriptionId = useId();
    const [response, setResponse] = useState("");
    const [repromptValue, setRepromptValue] = useState("");
    const [shouldLearn, setShouldLearn] = useState(true);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent
                srDescription={"Operator intervention and mission control."}
                className="bg-background/95 border-primary/20 backdrop-blur-3xl max-w-md rounded-3xl p-8 ring-1 ring-primary/20 shadow-2xl"
            >
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-primary font-black uppercase tracking-widest text-xs flex items-center gap-3">
                        <BrainCircuit className="w-5 h-5" />
                        Neural Control Hub
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Question from AI */}
                    <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 shadow-inner">
                        <p className="text-[10px] font-black uppercase text-primary/40 mb-2">AI Intervention Request:</p>
                        <p className="text-xs font-bold leading-relaxed italic">"{question || "Strategic ambiguity encountered."}"</p>
                    </div>

                    {/* Response Input */}
                    <div className="space-y-4">
                        <div className="relative">
                            <Input
                                placeholder="Neural Guidance (confirm or guide agent)..."
                                className="bg-black/20 border-white/10 text-xs h-12 rounded-2xl px-5 focus-visible:ring-primary/30"
                                value={response}
                                onChange={(e) => setResponse(e.target.value)}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:bg-primary/10"
                                onClick={() => onConfirm(response, shouldLearn)}
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex items-center space-x-3 px-1">
                            <Checkbox
                                id="learn-pattern-modal"
                                checked={shouldLearn}
                                onCheckedChange={(val) => setShouldLearn(!!val)}
                                className="border-primary/40 data-[state=checked]:bg-primary"
                            />
                            <Label htmlFor="learn-pattern-modal" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer">
                                Cache Success Pattern (Learn)
                            </Label>
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Re-prompt / New Objective */}
                    <div className="space-y-3">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">
                            Override Objective
                        </Label>
                        <div className="relative">
                            <Input
                                placeholder="Enter New Mission Prompt..."
                                className="bg-black/20 border-white/10 text-xs h-12 rounded-2xl px-5 focus-visible:ring-primary/30"
                                value={repromptValue}
                                onChange={(e) => setRepromptValue(e.target.value)}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-accent hover:bg-accent/10"
                                onClick={() => onReprompt(repromptValue)}
                            >
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-8 flex flex-col gap-3 sm:flex-col">
                    <Button
                        variant="outline"
                        className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all"
                        onClick={() => onReprompt("Troubleshoot current page and reassess objective")}
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Troubleshoot & Reassess
                    </Button>

                    <Button
                        variant="destructive"
                        className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-all border-dashed"
                        onClick={onEraseActions}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Erase Mission Persistence
                    </Button>

                    <Button
                        onClick={() => onConfirm(response, shouldLearn)}
                        className="w-full bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
                    >
                        Resume Mission
                    </Button>

                    {onSkip && (
                        <Button
                            variant="ghost"
                            className="w-full h-10 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
                            onClick={onSkip}
                        >
                            Skip Current Step
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
