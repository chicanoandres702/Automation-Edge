"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  RefreshCw, 
  Terminal, 
  Zap,
  Wifi,
  Fingerprint,
  AlertTriangle,
  Sparkles
} from "lucide-react";
import { AutomationTask, AutomationStep, ActionType } from "@/lib/types";
import { generateAutomationFromPrompt } from "@/ai/flows/generate-automation-from-prompt";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { captureGlobalContext } from "@/lib/dom-traversal";
import { cn } from "@/lib/utils";

export default function FleetNexusPage() {
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTask, setActiveTask] = useState<AutomationTask | null>(null);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'warn' | 'success' | 'system'}[]>([]);
  const [geoStatus, setGeoStatus] = useState({ 
    ip: "192.168.1.1", 
    location: "Home Node", 
    status: "active",
    mode: 'persistent' as 'persistent' | 'rotational'
  });
  const [manualMode, setManualMode] = useState(false);
  const { toast } = useToast();
  
  const executionTimer = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((msg: string, type: 'info' | 'warn' | 'success' | 'system' = 'info') => {
    setLogs(prev => [...prev.slice(-40), { msg, type }]);
  }, []);

  const runGeoIdSync = useCallback(async (forceRotate = false) => {
    if (!forceRotate && geoStatus.mode === 'persistent') {
      addLog("Identity Stability Enforced: Maintaining current node.", "info");
      return;
    }

    addLog("Rotational IP Proxy: Cycling Geolocation...", "system");
    await new Promise(r => setTimeout(r, 1200));
    
    const mockGeo = {
      ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      location: "Frankfurt, DE (Encrypted Node)",
      status: "active",
      mode: 'rotational' as const
    };
    
    setGeoStatus(mockGeo);
    addLog(`Identity Masked: [${mockGeo.ip}] via ${mockGeo.location}`, "success");
  }, [addLog, geoStatus.mode]);

  const runFleetSync = useCallback(async (isSilent = false) => {
    setIsSyncing(true);
    if (!isSilent) addLog("Initiating Fleet-wide DOM Traversal...", "system");
    
    try {
      const globalContent = await captureGlobalContext();
      await new Promise(r => setTimeout(r, 1000));
      
      const tabCount = (globalContent.match(/TAB:/g) || []).length || 1;
      const frameCount = (globalContent.match(/Frame/g) || []).length || 3;

      addLog(`Fleet Unified: ${tabCount} Tabs, ${frameCount} Interaction Points mapped.`, "success");
    } catch (error) {
      addLog("Fleet Sync Error: Access restricted", "warn");
    } finally {
      setIsSyncing(false);
    }
  }, [addLog]);

  useEffect(() => {
    setMounted(true);
    addLog("Cyber-Nexus OS v4.2 Loaded", "success");
    runFleetSync(true);
  }, [addLog, runFleetSync]);

  const mapActionType = (desc: string): ActionType => {
    const d = desc.toLowerCase();
    if (d.includes('type') || d.includes('fill')) return 'type';
    if (d.includes('click') || d.includes('press')) return 'click';
    if (d.includes('scroll')) return 'scroll';
    if (d.includes('navigate') || d.includes('go to')) return 'navigate';
    if (d.includes('switch') || d.includes('tab')) return 'switch-tab';
    if (d.includes('touch')) return 'touch';
    return 'extract';
  };

  const handleStartAutomation = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    
    const rotationKeywords = ['survey', 'multi', 'account', 'signup', 'register', 'rewards', 'poll', 'vote'];
    const needsRotation = rotationKeywords.some(kw => prompt.toLowerCase().includes(kw));
    const identityMode = needsRotation ? 'rotational' : 'persistent';

    addLog(`Agent Analysis: ${needsRotation ? 'Dynamic Masking Required' : 'Session Stability Prioritized'}`, "system");
    
    if (needsRotation) {
      await runGeoIdSync(true);
    } else {
      setGeoStatus(prev => ({ ...prev, mode: 'persistent' }));
      addLog("Maintaining Persistent Identity for session safety.", "info");
    }

    await runFleetSync(true);
    addLog(`Synthesizing Mission Plan using Gemini 2.0 Flash...`, "info");
    
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
        status: manualMode ? 'paused' : 'running',
        steps: newSteps,
        currentStepIndex: 0,
        observedTabs: [],
        createdAt: now,
        updatedAt: now,
        manualMode,
        identityMode
      };

      setActiveTask(newTask);
      setPrompt("");
      addLog(`Agent Reasoning: ${result.reasoning}`, "system");
      addLog(`Mission synthesized. Risk Level: ${result.estimatedRisk.toUpperCase()}`, "success");
    } catch (error) {
      addLog("Synthesis failed: LLM context error", "warn");
    } finally {
      setIsGenerating(false);
    }
  };

  const executeNextStep = useCallback(() => {
    setActiveTask(prev => {
      if (!prev) return null;
      
      const isLastStep = prev.currentStepIndex >= prev.steps.length - 1;
      const nextIndex = isLastStep ? prev.currentStepIndex : prev.currentStepIndex + 1;
      const nextStep = prev.steps[nextIndex];

      if (isLastStep && prev.status === 'running') {
        addLog("All Objectives Completed.", "success");
        return { ...prev, status: 'completed' as const, updatedAt: Date.now() };
      }

      addLog(`Agent executing ${nextStep.type.toUpperCase()}: ${nextStep.description}`, "info");
      
      const nextStatus = prev.manualMode ? 'paused' : 'running';
      
      return { 
        ...prev, 
        currentStepIndex: nextIndex, 
        status: nextStatus,
        updatedAt: Date.now() 
      };
    });
  }, [addLog]);

  const handleReorderSteps = (newSteps: AutomationStep[]) => {
    setActiveTask(prev => prev ? { ...prev, steps: newSteps, updatedAt: Date.now() } : null);
    addLog("Operator reordered task priority.", "system");
  };

  useEffect(() => {
    if (activeTask && activeTask.status === 'running' && !activeTask.manualMode) {
      executionTimer.current = setTimeout(() => {
        executeNextStep();
      }, 3000);
      return () => {
        if (executionTimer.current) clearTimeout(executionTimer.current);
      };
    }
  }, [activeTask?.currentStepIndex, activeTask?.status, activeTask?.manualMode, executeNextStep]);

  const handleManualIntervention = (index: number) => {
    addLog(`Manual Override successful for Step ${index + 1}.`, "system");
    setActiveTask(prev => {
      if (!prev) return null;
      const updatedSteps = [...prev.steps];
      updatedSteps[index].status = 'completed';
      return { ...prev, steps: updatedSteps, status: 'paused' };
    });
  };

  if (!mounted) return null;

  return (
    <>
      <AppSidebar 
        activeTask={activeTask}
        onStart={() => {
          if (activeTask) {
             setActiveTask({...activeTask, status: 'running'});
             addLog("Resuming protocol...", "info");
          }
        }}
        onPause={() => {
          if (activeTask) {
            setActiveTask({...activeTask, status: 'paused'});
            addLog("Protocol paused.", "warn");
          }
        }}
        onStop={() => {
          setActiveTask(null);
          addLog("Mission purged.", "warn");
        }}
        onStep={executeNextStep}
        onIntervene={handleManualIntervention}
        onReorder={handleReorderSteps}
        manualMode={manualMode}
        onToggleManual={(val) => {
          setManualMode(val);
          if (activeTask) {
            setActiveTask(prev => prev ? { ...prev, manualMode: val } : null);
          }
          addLog(`Protocol: ${val ? 'Manual Override' : 'Full Autonomy'}`, "system");
        }}
      />
      
      <SidebarInset className="bg-background max-w-full overflow-hidden flex flex-col h-screen scanline relative">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/5 bg-background/50 px-4 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg transition-colors" />
            <div className="flex flex-col">
              <h2 className="text-[10px] font-black tracking-[0.4em] uppercase text-primary flex items-center gap-2">
                <Sparkles className="w-2.5 h-2.5" />
                Gemini_Agent
              </h2>
              <span className="text-[7px] font-mono text-muted-foreground uppercase opacity-50">FLASH_V2_ACTIVE</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {activeTask?.status === 'intervention_required' && (
               <div className="flex items-center gap-1.5 px-2 py-0.5 bg-destructive/10 border border-destructive/20 rounded-md animate-pulse">
                 <AlertTriangle className="w-3 h-3 text-destructive" />
                 <span className="text-[8px] font-black text-destructive uppercase tracking-wider">Intervention</span>
               </div>
             )}
             <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex flex-col p-4 space-y-4 z-10">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 border-white/5 bg-white/5 hover:bg-white/10 transition-all group relative overflow-hidden rounded-2xl">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
              <div className="flex items-center gap-2 mb-2">
                <Wifi className={cn("w-3 h-3 text-primary", isSyncing && "animate-pulse")} />
                <span className="text-[8px] font-black text-primary uppercase tracking-widest">Fleet_Sync</span>
              </div>
              <div className="text-[11px] font-bold text-foreground/90 truncate uppercase tracking-tighter">
                {isSyncing ? "Scanning Fleet..." : "Tabs Unified"}
              </div>
            </Card>

            <Card className="p-3 border-white/5 bg-white/5 hover:bg-white/10 transition-all group relative overflow-hidden rounded-2xl">
               <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-50" />
              <div className="flex items-center gap-2 mb-2">
                <Fingerprint className={cn("w-3 h-3", geoStatus.mode === 'rotational' ? "text-accent" : "text-primary")} />
                <span className={cn("text-[8px] font-black uppercase tracking-widest", geoStatus.mode === 'rotational' ? "text-accent" : "text-primary")}>
                  {geoStatus.mode === 'rotational' ? 'Mask_On' : 'Identity_Locked'}
                </span>
              </div>
              <div className="text-[11px] font-bold text-foreground/90 truncate tracking-tight">
                {geoStatus.ip}
              </div>
            </Card>
          </div>

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-10 group-focus-within:opacity-30 transition-opacity" />
            <div className="relative bg-black/40 border border-white/10 p-4 rounded-2xl space-y-3">
              <Input 
                placeholder="Declare high-level mission objective..."
                className="bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary/30 text-[11px] h-10 placeholder:text-muted-foreground/30 font-medium"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartAutomation()}
                suppressHydrationWarning
              />
              <Button 
                onClick={handleStartAutomation}
                disabled={isGenerating || !prompt.trim() || isSyncing}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Zap className="w-3.5 h-3.5 mr-2 fill-current" />
                )}
                {isGenerating ? "Reasoning..." : "Execute Objective"}
              </Button>
            </div>
          </div>

          {activeTask && (activeTask.status === 'running' || activeTask.status === 'paused') && (
            <div className="space-y-2 px-1">
              <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-primary/70">
                <span>Mission_Progress</span>
                <span className="font-mono">{Math.round(((activeTask.currentStepIndex + 1) / activeTask.steps.length) * 100)}%</span>
              </div>
              <Progress value={((activeTask.currentStepIndex + 1) / activeTask.steps.length) * 100} className="h-1 bg-white/5 [&>div]:bg-primary shadow-[0_0_10px_rgba(0,255,255,0.1)] rounded-full" />
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-0 bg-black/60 border border-white/5 rounded-3xl p-5 font-mono text-[10px] relative shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-muted-foreground/50">Runtime_Kernel_Logs</span>
              </div>
            </div>
            
            <ScrollArea className="flex-1 terminal-scroll">
              <div className="space-y-2">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-4 leading-relaxed group animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="text-white/10 shrink-0 select-none text-[8px] font-mono">[{i.toString().padStart(3, '0')}]</span>
                    <span className={cn(
                      "transition-colors break-all tracking-tight",
                      log.type === 'success' ? 'text-accent' : 
                      log.type === 'warn' ? 'text-destructive/80 font-bold' : 
                      log.type === 'system' ? 'text-primary/90 italic' :
                      'text-foreground/70'
                    )}>
                      {log.type === 'system' ? '>> ' : ''}{log.msg}
                    </span>
                  </div>
                ))}
                {(isGenerating || isSyncing) && (
                  <div className="flex items-center gap-4 text-primary mt-4">
                    <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                    <span className="text-[9px] font-black animate-pulse uppercase tracking-[0.2em]">Synthesizing...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
