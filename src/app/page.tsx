
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
  Fingerprint,
  Cpu,
  Zap
} from "lucide-react";
import { AutomationTask, AutomationStep, ActionType } from "@/lib/types";
import { generateAutomationFromPrompt } from "@/ai/flows/generate-automation-from-prompt";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { captureActiveTabDOM } from "@/lib/dom-traversal";

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
    addLog("Core System Online", "success");
    // Automatic initial scan
    handleDeepScan(true);
  }, []);

  const addLog = (msg: string, type: 'info' | 'warn' | 'success' = 'info') => {
    setLogs(prev => [...prev.slice(-20), { msg, type }]);
  };

  const handleDeepScan = async (isSilent = false) => {
    setIsSeeking(true);
    if (!isSilent) addLog("Initiating Deep DOM Traversal...", "info");
    
    try {
      const domContent = await captureActiveTabDOM();
      
      // Simulate analysis of the captured DOM
      setTimeout(() => {
        const frameCount = (domContent.match(/Frame Boundary/g) || []).length + 1;
        addLog(`Scan complete: ${frameCount} frames parsed.`, "success");
        if (!isSilent) {
          toast({
            title: "Context Updated",
            description: `Captured ${domContent.length} bytes of page data across ${frameCount} layers.`,
          });
        }
      }, 1000);
    } catch (error) {
      addLog("Traversal Engine Error", "warn");
    } finally {
      setIsSeeking(false);
    }
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
    
    // Auto-sync DOM before planning
    await handleDeepScan(true);
    
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
      addLog("Strategic Plan Locked. Executing...", "success");
    } catch (error) {
      addLog("Synthesis Failed", "warn");
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
      addLog(`[ACTION] ${currentStep.type.toUpperCase()}: ${currentStep.description}`, "info");

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
          addLog("All objectives met. Mission complete.", "success");
        }
      }, 2000);
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
            <h2 className="text-[10px] font-black tracking-widest uppercase text-accent">Deep Edge v1.0</h2>
          </div>
          <div className="flex items-center gap-2">
             <Badge variant="outline" className="text-[7px] h-4 bg-primary/5 text-primary border-primary/20">
               <Zap className="w-2.5 h-2.5 mr-1" />
               Turbo
             </Badge>
             <ShieldCheck className="w-4 h-4 text-accent" />
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
          {/* Active Context Card */}
          <Card className="p-3 border-accent/20 bg-accent/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-1">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            </div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[9px] font-black text-accent uppercase tracking-widest">
                <Globe className="w-3 h-3" />
                Live DOM Context
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-[10px] h-8 font-black border-accent/30 hover:bg-accent/20 hover:text-accent transition-all uppercase"
              onClick={() => handleDeepScan(false)}
              disabled={isSeeking}
            >
              {isSeeking ? (
                <RefreshCw className="w-3 h-3 animate-spin mr-2" />
              ) : (
                <Layers className="w-3 h-3 mr-2" />
              )}
              {isSeeking ? "Traversing..." : "Manual Deep Traversal"}
            </Button>
          </Card>

          {/* Prompt Input */}
          <div className="space-y-2">
            <div className="bg-card border border-border p-2 rounded-xl focus-within:ring-1 focus-within:ring-accent/50 transition-all">
              <Input 
                placeholder="Agent command..."
                className="bg-transparent border-none focus-visible:ring-0 text-xs h-8 placeholder:text-muted-foreground/40"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartAutomation()}
              />
              <Button 
                size="sm"
                onClick={handleStartAutomation}
                disabled={isGenerating || !prompt.trim() || isSeeking}
                className="w-full h-8 mt-1.5 rounded-lg bg-accent text-background font-black text-[10px] uppercase shadow-[0_0_15px_rgba(67,249,31,0.2)]"
              >
                {isGenerating ? "Synthesizing..." : "Execute Objective"}
              </Button>
            </div>
          </div>

          {/* Progress / Status */}
          {activeTask && activeTask.status === 'running' && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[8px] font-black uppercase tracking-tighter text-muted-foreground">
                <span>Task Intensity</span>
                <span>{Math.round(((activeTask.currentStepIndex + 1) / activeTask.steps.length) * 100)}%</span>
              </div>
              <Progress value={((activeTask.currentStepIndex + 1) / activeTask.steps.length) * 100} className="h-1 bg-muted [&>div]:bg-accent" />
            </div>
          )}

          {/* Log Console */}
          <div className="flex-1 flex flex-col min-h-0 bg-black/40 border border-border rounded-xl p-3 font-code text-[10px]">
            <div className="flex items-center gap-2 mb-2 opacity-50">
              <Terminal className="w-3 h-3" />
              <span className="text-[8px] font-bold uppercase tracking-widest">System_Logs</span>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-1.5">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2 leading-tight">
                    <span className="text-muted-foreground/20 font-mono">{i.toString().padStart(2, '0')}</span>
                    <span className={
                      log.type === 'success' ? 'text-accent' : 
                      log.type === 'warn' ? 'text-destructive' : 
                      'text-foreground/70'
                    }>
                      {log.msg}
                    </span>
                  </div>
                ))}
                {(isGenerating || isSeeking) && <div className="text-accent animate-pulse">_ EXEC_RUNNING</div>}
              </div>
            </ScrollArea>
          </div>

          {/* Hardware Visualization */}
          <div className="grid grid-cols-3 gap-2 opacity-60">
            <div className="p-2 rounded-lg bg-card border border-border flex flex-col items-center gap-1">
               <Cpu className="w-3 h-3 text-primary" />
               <span className="text-[6px] font-black uppercase">CPU-Z</span>
            </div>
            <div className="p-2 rounded-lg bg-card border border-border flex flex-col items-center gap-1">
               <MousePointer2 className="w-3 h-3 text-accent" />
               <span className="text-[6px] font-black uppercase">IO-HID</span>
            </div>
            <div className="p-2 rounded-lg bg-card border border-border flex flex-col items-center gap-1">
               <Fingerprint className="w-3 h-3 text-destructive" />
               <span className="text-[6px] font-black uppercase">BIO-ID</span>
            </div>
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
