"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  RefreshCw, 
  Terminal as TerminalIcon, 
  Zap,
  Wifi,
  Fingerprint,
  AlertTriangle,
  BrainCircuit,
  Activity,
  ChevronDown,
  Cpu,
  Settings as SettingsIcon,
  Sparkles,
  RotateCcw
} from "lucide-react";
import { AutomationTask, AutomationStep, ActionType, AutomationStatus, ExecutionMemory } from "@/lib/types";
import { generateAutomationFromPrompt } from "@/ai/flows/generate-automation-from-prompt";
import { contextualSurveyAwareness } from "@/ai/flows/contextual-survey-awareness";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentVisualizer } from "@/components/automation/visualizer";
import { captureGlobalContext } from "@/lib/dom-traversal";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function FleetNexusPage() {
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReconsidering, setIsReconsidering] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [activeTask, setActiveTask] = useState<AutomationTask | null>(null);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'warn' | 'success' | 'system'}[]>([]);
  const [geoStatus, setGeoStatus] = useState({ 
    ip: "192.168.1.1", 
    location: "Home Node", 
    status: "active",
    mode: 'persistent' as 'persistent' | 'rotational'
  });
  const [manualMode, setManualMode] = useState(false);
  
  const [isInterventionOpen, setIsInterventionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isIdentityOpen, setIsIdentityOpen] = useState(false);
  const [interventionQuery, setInterventionQuery] = useState("");
  const [interventionResponse, setInterventionResponse] = useState("");

  const { toast } = useToast();
  const executionTimer = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((msg: string, type: 'info' | 'warn' | 'success' | 'system' = 'info') => {
    setLogs(prev => [...prev.slice(-100), { msg, type }]);
  }, []);

  const runGeoIdSync = useCallback(async (forceRotate = false) => {
    if (!forceRotate && geoStatus.mode === 'persistent') {
      addLog("Identity Stability: Maintaining current node.", "info");
      return;
    }

    addLog("Proxy Sync: Cycling Geolocation...", "system");
    await new Promise(r => setTimeout(r, 1200));
    
    const mockGeo = {
      ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      location: "Frankfurt, DE",
      status: "active",
      mode: 'rotational' as const
    };
    
    setGeoStatus(mockGeo);
    addLog(`Identity Masked: [${mockGeo.ip}]`, "success");
  }, [addLog, geoStatus.mode]);

  const runFleetSync = useCallback(async (isSilent = false) => {
    setIsSyncing(true);
    if (!isSilent) addLog("Fleet Traversal initiated...", "system");
    
    try {
      const globalContent = await captureGlobalContext();
      await new Promise(r => setTimeout(r, 1000));
      
      const tabCount = (globalContent.match(/TAB:/g) || []).length || 1;
      if (!isSilent) addLog(`Fleet Unified: ${tabCount} Tabs mapped.`, "success");
      return globalContent;
    } catch (error) {
      addLog("Sync Error: Restricted access", "warn");
      return "";
    } finally {
      setIsSyncing(false);
    }
  }, [addLog]);

  useEffect(() => {
    setMounted(true);
    addLog("Nexus_OS v4.2 Initialized", "success");
    runFleetSync(true);
  }, [addLog, runFleetSync]);

  const mapActionType = (action: string): ActionType => {
    switch (action.toUpperCase()) {
      case 'CLICK': return 'click';
      case 'TYPE': return 'type';
      case 'SCROLL': return 'scroll';
      case 'WAIT': return 'wait';
      case 'SWITCH_TAB': return 'switch-tab';
      case 'CLOSE_TAB': return 'close-tab';
      case 'ASK_USER': return 'ask-user';
      case 'NAVIGATE': return 'navigate';
      case 'REFRESH': return 'refresh';
      case 'NAVIGATE_BACK': return 'navigate-back';
      default: return 'extract';
    }
  };

  const detectContexts = (p: string) => {
    const platformKeywords = [
      'google', 'doc', 'sheet', 'spreadsheet', 'microsoft', 'office', 'vitalsource', 
      'library', 'canvas', 'blackboard', 'capella', 'yellowdig'
    ];
    const foundPlatform = platformKeywords.find(k => p.toLowerCase().includes(k));
    
    const courseMatch = p.match(/[A-Z]{2,4}-?\d{4}/i);
    const missionContext = courseMatch ? courseMatch[0].toUpperCase() : undefined;
    
    return {
      platformContext: foundPlatform ? foundPlatform.charAt(0).toUpperCase() + foundPlatform.slice(1) : undefined,
      missionContext
    };
  };

  const handleStartAutomation = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    const rotationKeywords = ['survey', 'multi', 'account', 'signup', 'register', 'rewards', 'poll', 'vote'];
    const needsRotation = rotationKeywords.some(kw => prompt.toLowerCase().includes(kw));
    const { platformContext, missionContext } = detectContexts(prompt);

    addLog(`Analysis: ${needsRotation ? 'Masking Required' : 'Stability Prioritized'}`, "system");
    if (missionContext) addLog(`Mission Continuity: Active for ${missionContext}`, "info");
    if (platformContext) addLog(`Shared Platform Tool: ${platformContext} Unified Knowledge`, "success");
    
    if (needsRotation) {
      await runGeoIdSync(true);
    } else {
      setGeoStatus(prev => ({ ...prev, mode: 'persistent' }));
      addLog("Persistence enforced for session safety.", "info");
    }

    await runFleetSync(true);
    addLog(`Synthesizing Parameters (Gemini 3.0)...`, "info");
    
    try {
      const result = await generateAutomationFromPrompt({ 
        prompt, 
        missionContext,
        platformContext
      });
      
      const now = Date.now();
      const newSteps: AutomationStep[] = result.workflowSteps.map((s, idx) => ({
        id: `step-${now}-${idx}`,
        description: s,
        type: 'wait',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3
      }));

      const newTask: AutomationTask = {
        id: `task-${now}`,
        prompt,
        status: manualMode ? 'paused' : 'running',
        steps: newSteps,
        currentStepIndex: 0,
        observedTabs: [],
        memory: [],
        createdAt: now,
        updatedAt: now,
        manualMode,
        identityMode: needsRotation ? 'rotational' : 'persistent',
        missionContext,
        platformContext
      };

      setActiveTask(newTask);
      setPrompt("");
      addLog(`Mission Synthesized. Risk: ${result.estimatedRisk.toUpperCase()}`, "success");
    } catch (error) {
      addLog("Synthesis failed: LLM error", "warn");
    } finally {
      setIsGenerating(false);
    }
  };

  const executeNextStep = useCallback(async (isRetry = false) => {
    if (!activeTask) return;

    const currentIndex = activeTask.currentStepIndex;
    const currentStep = activeTask.steps[currentIndex];

    if (!currentStep) return;

    setIsReconsidering(true);
    addLog(isRetry ? `Retrying Operation [${currentIndex + 1}]...` : "Neural Context Evaluation...", "system");
    
    const currentDom = await runFleetSync(true);
    
    try {
      const reasoningOutput = await contextualSurveyAwareness({
        goal: activeTask.prompt,
        memory: activeTask.memory,
        surveyContent: currentDom,
        missionContext: activeTask.missionContext,
        platformContext: activeTask.platformContext
      });

      addLog(`Reasoning: ${reasoningOutput.reasoning}`, "info");

      if (reasoningOutput.action === 'ASK_USER') {
        addLog("Neural Link Requested: Human Intervention required.", "warn");
        setInterventionQuery(reasoningOutput.parameters.question || "Ambiguous state detected.");
        setIsInterventionOpen(true);
        setActiveTask(prev => prev ? { ...prev, status: 'intervention_required' } : null);
        setIsReconsidering(false);
        return;
      }

      const stepMemory: ExecutionMemory = {
        step: `${reasoningOutput.action} ${reasoningOutput.parameters.selector || reasoningOutput.parameters.tab_id || ''}`,
        result: 'Success'
      };

      setActiveTask(prev => {
        if (!prev) return null;
        
        const isLastStep = prev.currentStepIndex >= prev.steps.length - 1;
        const updatedSteps = [...prev.steps];
        
        updatedSteps[currentIndex] = { 
          ...currentStep, 
          status: 'completed',
          type: mapActionType(reasoningOutput.action),
          description: `Executed ${reasoningOutput.action}: ${reasoningOutput.parameters.selector || ''}`
        };

        if (isLastStep && prev.status === 'running') {
          addLog("Objective Finalized.", "success");
          return { 
            ...prev, 
            steps: updatedSteps, 
            status: 'completed' as const, 
            memory: [...prev.memory, stepMemory],
            updatedAt: Date.now() 
          };
        }

        const nextIndex = prev.currentStepIndex + 1;
        addLog(`Protocol Executed: ${reasoningOutput.action}`, "success");
        
        return { 
          ...prev, 
          steps: updatedSteps,
          currentStepIndex: nextIndex, 
          memory: [...prev.memory, stepMemory],
          status: prev.manualMode ? 'paused' : 'running',
          updatedAt: Date.now() 
        };
      });
    } catch (err) {
      if (currentStep.retryCount < currentStep.maxRetries) {
        addLog(`System Fault. Retrying Logic...`, "warn");
        setActiveTask(prev => {
          if (!prev) return null;
          const updatedSteps = [...prev.steps];
          updatedSteps[currentIndex] = { ...currentStep, status: 'retrying', retryCount: currentStep.retryCount + 1 };
          return { ...prev, steps: updatedSteps, status: 'retrying' as AutomationStatus };
        });
        await new Promise(r => setTimeout(r, 2000));
        return executeNextStep(true);
      }
      setActiveTask(prev => prev ? { ...prev, status: 'error' } : null);
    } finally {
      setIsReconsidering(false);
    }
  }, [activeTask, addLog, runFleetSync]);

  useEffect(() => {
    if (activeTask && (activeTask.status === 'running' || activeTask.status === 'retrying') && !activeTask.manualMode && !isReconsidering) {
      executionTimer.current = setTimeout(() => {
        executeNextStep();
      }, 3500);
      return () => {
        if (executionTimer.current) clearTimeout(executionTimer.current);
      };
    }
  }, [activeTask?.currentStepIndex, activeTask?.status, activeTask?.manualMode, executeNextStep, isReconsidering]);

  const handleInterventionSubmit = () => {
    addLog(`Operator Injection: ${interventionResponse}`, "success");
    setIsInterventionOpen(false);
    if (activeTask) {
      const interventionMemory: ExecutionMemory = {
        step: 'Human Intervention',
        result: interventionResponse
      };
      setActiveTask({ 
        ...activeTask, 
        status: 'running', 
        memory: [...activeTask.memory, interventionMemory] 
      });
    }
    setInterventionResponse("");
  };

  if (!mounted) return null;

  const currentStatus = isGenerating ? "GEN" : isSyncing ? "SYNC" : isReconsidering ? "PLAN" : activeTask?.status.toUpperCase() || "IDLE";

  return (
    <>
      <AppSidebar 
        activeTask={activeTask}
        onStart={() => {
          if (activeTask) {
             setActiveTask({...activeTask, status: 'running'});
             addLog("Mission Resumed.", "info");
          }
        }}
        onPause={() => {
          if (activeTask) {
            setActiveTask({...activeTask, status: 'paused'});
            addLog("Mission Halted.", "warn");
          }
        }}
        onStop={() => {
          setActiveTask(null);
          addLog("Session Purged.", "warn");
        }}
        onStep={() => executeNextStep()}
        manualMode={manualMode}
        onToggleManual={(val) => {
          setManualMode(val);
          if (activeTask) {
            setActiveTask(prev => prev ? { ...prev, manualMode: val } : null);
          }
          addLog(`Protocol Shift: ${val ? 'Manual Override' : 'Autonomous'}`, "system");
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      <SidebarInset className="bg-[#050505] max-w-full overflow-hidden flex flex-col h-screen scanline relative">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-black/40 px-4 backdrop-blur-2xl z-20">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-8 w-8 text-primary hover:bg-primary/20 rounded-lg transition-all" />
            <h2 className="text-[10px] font-black tracking-[0.4em] uppercase text-primary text-glow-primary">Nexus_v4.2</h2>
          </div>
          <div className="flex items-center gap-2">
             {activeTask?.status === 'intervention_required' && (
               <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive animate-pulse" onClick={() => setIsInterventionOpen(true)}>
                 <AlertTriangle className="w-4 h-4" />
               </Button>
             )}
             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/40 hover:text-primary" onClick={() => setIsSettingsOpen(true)}>
                <SettingsIcon className="w-4 h-4" />
             </Button>
          </div>
        </header>

        <div className="px-4 py-2 border-b border-white/5 bg-black/60 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-2 h-2 rounded-full",
              (activeTask?.status === 'running' || activeTask?.status === 'retrying' || isSyncing || isGenerating || isReconsidering) 
                ? "bg-accent animate-pulse shadow-[0_0_8px_hsl(var(--accent))]" 
                : "bg-muted-foreground/40"
            )} />
            <span className="text-[10px] font-black uppercase tracking-widest text-accent">{currentStatus}</span>
          </div>
          <div className="flex items-center gap-3">
            <Activity className="w-3 h-3 text-primary/50" />
            <span className="text-[9px] font-mono text-muted-foreground/70">SYNCED</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 space-y-4 z-10 relative">
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-3 border-white/5 bg-white/[0.03] rounded-xl flex items-center gap-2 cursor-pointer hover:bg-white/[0.06] transition-all" onClick={() => runFleetSync()}>
              <Wifi className={cn("w-3 h-3 text-primary", isSyncing && "animate-spin")} />
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">Fleet</span>
                <span className="text-[9px] font-bold text-primary">SCAN_SYNC</span>
              </div>
            </Card>

            <Card className="p-3 border-white/5 bg-white/[0.03] rounded-xl flex items-center gap-2 cursor-pointer hover:bg-white/[0.06] transition-all" onClick={() => setIsIdentityOpen(true)}>
              <Fingerprint className={cn("w-3 h-3", geoStatus.mode === 'rotational' ? "text-accent" : "text-primary")} />
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">Identity</span>
                <span className="text-[9px] font-mono text-foreground/90">{geoStatus.ip}</span>
              </div>
            </Card>
          </div>

          <div className="relative group">
            {!activeTask && (
              <div className="absolute -top-6 left-1 flex items-center gap-2 text-[8px] font-black text-primary/40 uppercase tracking-[0.2em] animate-pulse">
                <Sparkles className="w-2.5 h-2.5" />
                Awaiting Mission Parameters...
              </div>
            )}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-accent/30 rounded-xl blur opacity-20 group-focus-within:opacity-50 transition-opacity" />
            <div className="relative bg-black/60 border border-white/10 p-2 rounded-xl flex gap-2">
              <Input 
                placeholder={activeTask ? "Update objectives..." : "Inject mission parameters..."}
                className="bg-white/[0.03] border-none text-[10px] h-9 px-3 placeholder:text-muted-foreground/20 font-medium rounded-lg flex-1"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartAutomation()}
              />
              <Button 
                onClick={handleStartAutomation}
                disabled={isGenerating || !prompt.trim() || isSyncing}
                size="icon"
                className="h-9 w-9 rounded-lg bg-primary text-primary-foreground shadow-lg active:scale-95 transition-all"
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
              </Button>
            </div>
          </div>

          <div className="flex flex-col min-h-0 space-y-4 pb-20">
            <div className="flex items-center justify-between px-1">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Matrix_Queue</h3>
                <div className="flex flex-wrap gap-1">
                  {(activeTask?.platformContext) && (
                    <span className="text-[7px] font-black text-primary uppercase tracking-widest bg-primary/10 px-1 rounded border border-primary/20 w-fit">
                      {activeTask.platformContext} (Shared Tool)
                    </span>
                  )}
                  {(activeTask?.missionContext) && (
                    <span className="text-[7px] font-black text-accent uppercase tracking-widest bg-accent/10 px-1 rounded border border-accent/20 w-fit">
                      {activeTask.missionContext} (Continuous Mission)
                    </span>
                  )}
                </div>
              </div>
              {activeTask && (
                <div className="flex items-center gap-2">
                  {activeTask.status === 'retrying' && <RotateCcw className="w-3 h-3 text-accent animate-spin" />}
                  <span className="text-[8px] font-mono text-muted-foreground/40">{activeTask.currentStepIndex + 1}/{activeTask.steps.length} OPS</span>
                </div>
              )}
            </div>
            
            <div className="min-h-[250px] w-full">
              <AgentVisualizer 
                steps={activeTask?.steps || []} 
                currentStepIndex={activeTask?.currentStepIndex || 0}
                status={activeTask?.status || 'idle'}
                onIntervene={() => setIsInterventionOpen(true)}
              />
            </div>

            <Card className="bg-black/40 border-white/5 p-4 rounded-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                  <BrainCircuit className="w-12 h-12 text-primary" />
               </div>
               <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-3.5 h-3.5 text-accent animate-pulse" />
                  <span className="text-[8px] font-black text-accent uppercase tracking-[0.3em]">AI_Core_Stream</span>
               </div>
               <p className="text-[10px] font-bold text-foreground/80 leading-relaxed font-body min-h-[40px]">
                {logs[logs.length - 1]?.msg || "System standby. Waiting for operator mission injection."}
               </p>
               
               <Button 
                  variant="ghost" 
                  onClick={() => setShowTerminal(true)}
                  className="w-full h-8 mt-4 rounded-lg bg-white/[0.03] text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 border border-white/5 hover:bg-white/10"
                >
                  <TerminalIcon className="w-3 h-3 mr-2" />
                  Kernel Logs
                </Button>
            </Card>
          </div>

          <Dialog open={isInterventionOpen} onOpenChange={setIsInterventionOpen}>
            <DialogContent className="bg-background border-destructive/20 max-w-[90vw] rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="text-destructive flex items-center gap-2 uppercase text-[12px] font-black tracking-widest">
                  <AlertTriangle className="w-5 h-5" />
                  Contextual Intervention
                </DialogTitle>
              </DialogHeader>
              <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 my-4">
                <p className="text-[11px] font-bold italic opacity-70">"{interventionQuery}"</p>
              </div>
              <Input 
                placeholder="Direct the agent..." 
                className="bg-white/5 border-none h-12 text-[11px]" 
                value={interventionResponse}
                onChange={(e) => setInterventionResponse(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInterventionSubmit()}
              />
              <DialogFooter className="mt-6">
                <Button className="bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase w-full" onClick={handleInterventionSubmit}>Continue Mission</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isIdentityOpen} onOpenChange={setIsIdentityOpen}>
            <DialogContent className="bg-background border-white/10 max-w-[90vw] rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="text-primary flex items-center gap-2 uppercase text-[12px] font-black tracking-widest">
                  <Fingerprint className="w-5 h-5" />
                  Identity Matrix
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 my-6">
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-muted-foreground uppercase">Current IP</span>
                    <span className="text-[11px] font-mono text-primary">{geoStatus.ip}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => runGeoIdSync(true)}>
                    <RotateCcw className="w-4 h-4 text-accent" />
                  </Button>
                </div>
              </div>
              <Button className="w-full bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase h-12" onClick={() => setIsIdentityOpen(false)}>Close Interface</Button>
            </DialogContent>
          </Dialog>

          <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <SheetContent side="right" className="bg-background border-white/10 p-6">
              <SheetHeader className="mb-8">
                <SheetTitle className="text-primary text-[14px] font-black uppercase tracking-widest flex items-center gap-3">
                  <SettingsIcon className="w-5 h-5" />
                  System Kernel
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Reasoning Depth</label>
                    <div className="grid grid-cols-3 gap-2">
                       {['Low', 'Mid', 'Max'].map(d => (
                         <Button key={d} variant="outline" className={cn("h-8 text-[9px] font-black uppercase rounded-lg border-white/5", d === 'Max' && "border-primary text-primary bg-primary/10")}>{d}</Button>
                       ))}
                    </div>
                 </div>
                 <div className="pt-8">
                    <Button variant="destructive" className="w-full rounded-xl text-[10px] font-black uppercase h-11" onClick={() => setActiveTask(null)}>Purge All State</Button>
                 </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className={cn(
            "fixed inset-0 z-[100] transition-all duration-500 pointer-events-none",
            showTerminal ? "bg-black/80 backdrop-blur-md opacity-100" : "bg-transparent opacity-0"
          )}>
            <div className={cn(
              "mt-auto w-full max-h-[80vh] bg-background border-t border-white/10 rounded-t-3xl p-6 transition-transform duration-500 pointer-events-auto flex flex-col",
              showTerminal ? "translate-y-0" : "translate-y-full"
            )}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <TerminalIcon className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">System_Kernel</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowTerminal(false)} className="rounded-full hover:bg-white/5">
                  <ChevronDown className="w-5 h-5" />
                </Button>
              </div>
              <ScrollArea className="flex-1 font-mono text-[9px] leading-relaxed">
                {logs.map((log, i) => (
                  <div key={i} className={cn(
                    "mb-1 break-all",
                    log.type === 'success' ? 'text-accent' : log.type === 'warn' ? 'text-destructive' : 'text-foreground/50'
                  )}>
                    <span className="opacity-20 mr-2">[{i}]</span>
                    {log.msg}
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
