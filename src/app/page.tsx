"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  Globe, 
  ShieldCheck, 
  RefreshCw, 
  Terminal, 
  Layers, 
  MousePointer2, 
  Keyboard, 
  Fingerprint,
  Cpu,
  Zap,
  Monitor,
  Layout
} from "lucide-react";
import { AutomationTask, AutomationStep, ActionType } from "@/lib/types";
import { generateAutomationFromPrompt } from "@/ai/flows/generate-automation-from-prompt";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { captureGlobalContext } from "@/lib/dom-traversal";

export default function DeepAgentPage() {
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [activeTask, setActiveTask] = useState<AutomationTask | null>(null);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'warn' | 'success'}[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    addLog("Fleet Systems Initialized", "success");
    handleGlobalScan(true);
  }, []);

  const addLog = (msg: string, type: 'info' | 'warn' | 'success' = 'info') => {
    setLogs(prev => [...prev.slice(-30), { msg, type }]);
  };

  const handleGlobalScan = async (isSilent = false) => {
    setIsSeeking(true);
    if (!isSilent) addLog("Initiating Fleet-wide Tab Sync...", "info");
    
    try {
      const globalContent = await captureGlobalContext();
      
      // Artificial delay for visual feedback of complexity
      await new Promise(r => setTimeout(r, 1500));
      
      const tabCount = (globalContent.match(/TAB:/g) || []).length;
      const windowCount = (globalContent.match(/WINDOW/g) || []).length;
      const frameCount = (globalContent.match(/Frame/g) || []).length;

      addLog(`Sync Complete: ${windowCount} Windows, ${tabCount} Tabs, ${frameCount} Frames mapped.`, "success");
      
      if (!isSilent) {
        toast({
          title: "Fleet Context Unified",
          description: `Mapped ${tabCount} active browser contexts.`,
        });
      }
    } catch (error) {
      addLog("Global Traversal Failed", "warn");
    } finally {
      setIsSeeking(false);
    }
  };

  const mapActionType = (desc: string): ActionType => {
    const d = desc.toLowerCase();
    if (d.includes('type') || d.includes('fill')) return 'type';
    if (d.includes('click') || d.includes('press')) return 'click';
    if (d.includes('scroll')) return 'scroll';
    if (d.includes('touch')) return 'touch';
    if (d.includes('navigate') || d.includes('go to')) return 'navigate';
    if (d.includes('switch') || d.includes('tab')) return 'switch-tab';
    return 'extract';
  };

  const handleStartAutomation = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    addLog(`Synthesizing cross-tab strategy for: "${prompt}"`, "info");
    
    await handleGlobalScan(true);
    
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
        observedTabs: [],
        createdAt: now,
        updatedAt: now
      };

      setActiveTask(newTask);
      setPrompt("");
      addLog("Multi-context plan locked. Executing...", "success");
    } catch (error) {
      addLog("Strategy Synthesis Failed", "warn");
      toast({
        variant: "destructive",
        title: "Agent Error",
        description: "Failed to build the multi-context pipeline.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (activeTask && activeTask.status === 'running') {
      const currentStep = activeTask.steps[activeTask.currentStepIndex];
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
          setActiveTask({ ...activeTask, status: 'completed' as const });
          addLog("All fleet objectives met.", "success");
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
          addLog("Operation aborted", "warn");
        }}
      />
      
      <SidebarInset className="bg-background max-w-full overflow-hidden flex flex-col h-screen">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 bg-background/95 px-4 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-8 w-8" />
            <h2 className="text-[9px] font-black tracking-widest uppercase text-accent">Fleet Agent v1.2</h2>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex gap-1">
               <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
               <div className="w-1 h-1 rounded-full bg-accent animate-pulse delay-75" />
               <div className="w-1 h-1 rounded-full bg-accent animate-pulse delay-150" />
             </div>
             <ShieldCheck className="w-4 h-4 text-accent" />
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex flex-col p-3 space-y-3">
          {/* Fleet Context Card */}
          <Card className="p-3 border-accent/20 bg-accent/5 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[8px] font-black text-accent uppercase tracking-[0.2em]">
                <Monitor className="w-3 h-3" />
                Fleet Context
              </div>
              <Badge variant="outline" className="text-[7px] h-3 px-1 border-accent/30 text-accent">Active</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-background/50 p-2 rounded-lg border border-border/50 text-center">
                <Layout className="w-3 h-3 mx-auto mb-1 opacity-50" />
                <div className="text-[10px] font-bold">Tabs Sync</div>
              </div>
              <div className="bg-background/50 p-2 rounded-lg border border-border/50 text-center">
                <Globe className="w-3 h-3 mx-auto mb-1 opacity-50" />
                <div className="text-[10px] font-bold">Geo-ID</div>
              </div>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-[9px] h-7 font-black border-accent/40 hover:bg-accent/20 hover:text-accent transition-all uppercase tracking-wider"
              onClick={() => handleGlobalScan(false)}
              disabled={isSeeking}
            >
              {isSeeking ? (
                <RefreshCw className="w-3 h-3 animate-spin mr-2" />
              ) : (
                <Layers className="w-3 h-3 mr-2" />
              )}
              {isSeeking ? "Re-Mapping Fleet..." : "Deep Fleet Sync"}
            </Button>
          </Card>

          {/* Command Terminal */}
          <div className="space-y-2">
            <div className="bg-card/50 border border-border p-2 rounded-xl focus-within:ring-1 focus-within:ring-accent/50 transition-all shadow-inner">
              <Input 
                placeholder="Enter objective (e.g. Find pricing across all tabs)"
                className="bg-transparent border-none focus-visible:ring-0 text-[11px] h-7 placeholder:text-muted-foreground/30 font-medium"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartAutomation()}
              />
              <Button 
                size="sm"
                onClick={handleStartAutomation}
                disabled={isGenerating || !prompt.trim() || isSeeking}
                className="w-full h-8 mt-2 rounded-lg bg-accent text-background font-black text-[10px] uppercase shadow-[0_0_20px_rgba(67,249,31,0.1)] hover:shadow-[0_0_25px_rgba(67,249,31,0.2)] transition-all"
              >
                {isGenerating ? "Synthesizing Pipeline..." : "Execute Fleet Objective"}
              </Button>
            </div>
          </div>

          {/* Progress Indicator */}
          {activeTask && activeTask.status === 'running' && (
            <div className="space-y-1 px-1">
              <div className="flex justify-between text-[7px] font-black uppercase tracking-widest text-muted-foreground/70">
                <span>Fleet Progression</span>
                <span>{Math.round(((activeTask.currentStepIndex + 1) / activeTask.steps.length) * 100)}%</span>
              </div>
              <Progress value={((activeTask.currentStepIndex + 1) / activeTask.steps.length) * 100} className="h-1 bg-muted/30 [&>div]:bg-accent" />
            </div>
          )}

          {/* Output Console */}
          <div className="flex-1 flex flex-col min-h-0 bg-black/60 border border-border/80 rounded-xl p-3 font-code text-[10px] shadow-2xl relative">
            <div className="absolute top-3 right-3 flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/30" />
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/30" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-500/30" />
            </div>
            <div className="flex items-center gap-2 mb-3 border-b border-border/30 pb-2">
              <Terminal className="w-3 h-3 text-accent" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Fleet_Nexus_Logs</span>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-1.5">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2 leading-snug">
                    <span className="text-accent/20 font-mono shrink-0">[{i.toString().padStart(2, '0')}]</span>
                    <span className={
                      log.type === 'success' ? 'text-accent' : 
                      log.type === 'warn' ? 'text-destructive/80' : 
                      'text-foreground/60'
                    }>
                      {log.msg}
                    </span>
                  </div>
                ))}
                {(isGenerating || isSeeking) && (
                  <div className="flex items-center gap-2 text-accent mt-2">
                    <div className="w-1 h-1 bg-accent rounded-full animate-ping" />
                    <span className="text-[8px] font-black animate-pulse uppercase">Nexus Busy</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Fleet Hardware Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-card/30 border border-border/50 flex flex-col items-center gap-1 group hover:border-accent/30 transition-colors">
               <Cpu className="w-3 h-3 text-primary group-hover:scale-110 transition-transform" />
               <span className="text-[6px] font-black uppercase text-muted-foreground/50">CPU-X</span>
            </div>
            <div className="p-2 rounded-lg bg-card/30 border border-border/50 flex flex-col items-center gap-1 group hover:border-accent/30 transition-colors">
               <Fingerprint className="w-3 h-3 text-accent group-hover:scale-110 transition-transform" />
               <span className="text-[6px] font-black uppercase text-muted-foreground/50">BIO-SEC</span>
            </div>
            <div className="p-2 rounded-lg bg-card/30 border border-border/50 flex flex-col items-center gap-1 group hover:border-accent/30 transition-colors">
               <Keyboard className="w-3 h-3 text-destructive group-hover:scale-110 transition-transform" />
               <span className="text-[6px] font-black uppercase text-muted-foreground/50">I/O-HUB</span>
            </div>
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
