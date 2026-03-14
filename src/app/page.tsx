
"use client";

import { useState, useEffect, useRef } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  Wand2, 
  Globe, 
  ShieldCheck, 
  RefreshCw, 
  Terminal, 
  Layers, 
  MousePointer2, 
  Keyboard, 
  Fingerprint 
} from "lucide-react";
import { AutomationTask, AutomationStep, ActionType } from "@/lib/types";
import { generateAutomationFromPrompt } from "@/ai/flows/generate-automation-from-prompt";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DeepAgentPage() {
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [activeTask, setActiveTask] = useState<AutomationTask | null>(null);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'warn' | 'success'}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const addLog = (msg: string, type: 'info' | 'warn' | 'success' = 'info') => {
    setLogs(prev => [...prev.slice(-15), { msg, type }]);
  };

  const handleDeepScan = async () => {
    setIsSeeking(true);
    addLog("Initiating Deep DOM Scan...", "info");
    
    // Simulate frame traversal
    setTimeout(() => addLog("Main Window: 428 elements captured", "info"), 400);
    setTimeout(() => addLog("Frame [0]: 112 elements (Cross-Origin Allowed)", "info"), 800);
    setTimeout(() => addLog("Frame [1]: Shadow DOM detected and pierced", "info"), 1200);
    
    setTimeout(() => {
      setIsSeeking(false);
      addLog("Global Context Synced. Agent Ready.", "success");
      toast({
        title: "Deep Scan Complete",
        description: "DOM hierarchy fully mapped across 3 nested levels.",
      });
    }, 2000);
  };

  const mapActionType = (desc: string): ActionType => {
    const d = desc.toLowerCase();
    if (d.includes('type') || d.includes('fill') || d.includes('enter')) return 'type';
    if (d.includes('click') || d.includes('press')) return 'click';
    if (d.includes('scroll') || d.includes('move')) return 'scroll';
    if (d.includes('touch') || d.includes('tap')) return 'touch';
    if (d.includes('navigate') || d.includes('go to')) return 'navigate';
    if (d.includes('wait') || d.includes('pause')) return 'wait';
    return 'extract';
  };

  const handleStartAutomation = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    addLog(`Synthesizing workflow for: "${prompt}"`, "info");
    
    try {
      const result = await generateAutomationFromPrompt(prompt);
      
      const now = Date.now();
      const newSteps: AutomationStep[] = result.workflowSteps.map((s, idx) => ({
        id: `step-${now}-${idx}`,
        description: s,
        type: mapActionType(s),
        status: 'pending'
      }));

      const newTask: AutomationTask = {
        id: `task-${now}`,
        prompt,
        status: 'running',
        steps: newSteps,
        currentStepIndex: 0,
        createdAt: now,
        updatedAt: now
      };

      setActiveTask(newTask);
      setPrompt("");
      addLog("Agent Plan Generated. Executing steps...", "success");
    } catch (error) {
      addLog("Synthesis Failed: Check connectivity", "warn");
      toast({
        variant: "destructive",
        title: "Agent Error",
        description: "Failed to build the automation pipeline.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (activeTask && activeTask.status === 'running') {
      const currentStep = activeTask.steps[activeTask.currentStepIndex];
      addLog(`Executing [${currentStep.type.toUpperCase()}]: ${currentStep.description}`, "info");

      const timer = setTimeout(() => {
        if (activeTask.currentStepIndex < activeTask.steps.length - 1) {
          setActiveTask(prev => {
            if (!prev) return null;
            return {
              ...prev,
              currentStepIndex: prev.currentStepIndex + 1,
              updatedAt: Date.now()
            };
          });
        } else {
          const completedTask = { ...activeTask, status: 'completed' as const };
          setActiveTask(completedTask);
          addLog("Workflow Finished Successfully", "success");
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [activeTask?.currentStepIndex, activeTask?.status]);

  if (!mounted) return null;

  return (
    <>
      <AppSidebar 
        activeTask={activeTask}
        onStart={() => activeTask && setActiveTask({...activeTask, status: 'running'})}
        onPause={() => activeTask && setActiveTask({...activeTask, status: 'paused'})}
        onStop={() => {
          setActiveTask(null);
          addLog("Operation aborted by user", "warn");
        }}
      />
      
      <SidebarInset className="bg-background max-w-full overflow-hidden flex flex-col h-screen">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 bg-background/95 px-4 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-8 w-8" />
            <h2 className="text-[10px] font-black tracking-widest uppercase text-accent">Deep Edge</h2>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
            <ShieldCheck className="w-3 h-3 text-primary" />
            <span className="text-[8px] font-bold text-primary uppercase">Secured</span>
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
          {/* Status & Deep Scan */}
          <section>
            <Card className="p-3 border-border/50 bg-card/30 relative overflow-hidden group">
              {isSeeking && <div className="absolute inset-0 bg-accent/5 animate-pulse" />}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  <Globe className="w-3 h-3" />
                  Active Context
                </div>
                <Badge variant="outline" className="text-[7px] h-3.5 bg-accent/5 text-accent border-accent/20">Live</Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-[10px] h-8 font-bold border-accent/20 hover:bg-accent/10 hover:text-accent transition-all group-hover:border-accent/40"
                onClick={handleDeepScan}
                disabled={isSeeking}
              >
                {isSeeking ? (
                  <RefreshCw className="w-3 h-3 animate-spin mr-2" />
                ) : (
                  <Layers className="w-3 h-3 mr-2" />
                )}
                Deep DOM Traversal
              </Button>
            </Card>
          </section>

          {/* Prompt Engine */}
          <section className="space-y-2">
            <div className="relative">
              <div className="bg-card border border-border p-2 rounded-xl shadow-sm focus-within:ring-1 focus-within:ring-accent/50 transition-all">
                <Input 
                  placeholder="Ask the agent to act..."
                  className="bg-transparent border-none focus-visible:ring-0 text-xs h-8 placeholder:text-muted-foreground/30"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartAutomation()}
                />
                <Button 
                  size="sm"
                  onClick={handleStartAutomation}
                  disabled={isGenerating || !prompt.trim() || isSeeking}
                  className="w-full h-8 mt-1.5 rounded-lg bg-accent text-background font-black text-[10px] uppercase shadow-[0_4px_10px_rgba(67,249,31,0.2)]"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <Wand2 className="w-3 h-3 animate-pulse" />
                      Synthesizing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-3 h-3" />
                      Run Operation
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </section>

          {/* Console Output */}
          <section className="flex-1 flex flex-col min-h-0">
             <div className="flex items-center gap-2 mb-2 px-1">
                <Terminal className="w-3 h-3 text-muted-foreground" />
                <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Log Output</h3>
              </div>
              <div className="flex-1 bg-black/40 border border-border rounded-xl p-3 font-code text-[10px] flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="space-y-1">
                    {logs.map((log, i) => (
                      <div key={i} className="flex gap-2 leading-relaxed">
                        <span className="text-muted-foreground/30">[{i}]</span>
                        <span className={
                          log.type === 'success' ? 'text-accent' : 
                          log.type === 'warn' ? 'text-destructive' : 
                          'text-foreground/80'
                        }>
                          {log.msg}
                        </span>
                      </div>
                    ))}
                    {isGenerating && <div className="text-accent animate-pulse">_</div>}
                  </div>
                </ScrollArea>
              </div>
          </section>

          {/* Progress Overlay */}
          {activeTask && activeTask.status === 'running' && (
            <section className="space-y-1.5 p-1">
              <div className="flex justify-between text-[8px] font-bold uppercase tracking-tighter text-muted-foreground">
                <span>Task Progress</span>
                <span>{Math.round(((activeTask.currentStepIndex + 1) / activeTask.steps.length) * 100)}%</span>
              </div>
              <Progress value={((activeTask.currentStepIndex + 1) / activeTask.steps.length) * 100} className="h-1 bg-muted [&>div]:bg-accent shadow-[0_0_10px_rgba(67,249,31,0.1)]" />
            </section>
          )}

          {/* Action Visualizer Grid */}
          <section className="grid grid-cols-3 gap-2 pb-2">
            <div className="p-2 rounded-lg bg-card/20 border border-border/40 flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
               <MousePointer2 className="w-3 h-3 text-primary" />
               <span className="text-[7px] font-bold uppercase">Click</span>
            </div>
            <div className="p-2 rounded-lg bg-card/20 border border-border/40 flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
               <Keyboard className="w-3 h-3 text-accent" />
               <span className="text-[7px] font-bold uppercase">Type</span>
            </div>
            <div className="p-2 rounded-lg bg-card/20 border border-border/40 flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
               <Fingerprint className="w-3 h-3 text-destructive" />
               <span className="text-[7px] font-bold uppercase">Touch</span>
            </div>
          </section>
        </main>
      </SidebarInset>
    </>
  );
}
