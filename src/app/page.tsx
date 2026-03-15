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
  Orbit,
  Globe,
  Database,
  Lock,
  Box
} from "lucide-react";
import { AutomationTask, AutomationStep, ActionType } from "@/lib/types";
import { generateAutomationFromPrompt } from "@/ai/flows/generate-automation-from-prompt";
import { contextualSurveyAwareness } from "@/ai/flows/contextual-survey-awareness";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AgentVisualizer } from "@/components/automation/visualizer";
import { captureGlobalContext } from "@/lib/dom-traversal";
import { cn } from "@/lib/utils";

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
  const { toast } = useToast();
  
  const executionTimer = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((msg: string, type: 'info' | 'warn' | 'success' | 'system' = 'info') => {
    setLogs(prev => [...prev.slice(-100), { msg, type }]);
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

      if (!isSilent) addLog(`Fleet Unified: ${tabCount} Tabs, ${frameCount} Interaction Points mapped.`, "success");
      return globalContent;
    } catch (error) {
      addLog("Fleet Sync Error: Access restricted", "warn");
      return "";
    } finally {
      setIsSyncing(false);
    }
  }, [addLog]);

  useEffect(() => {
    setMounted(true);
    addLog("Nexus_OS v4.2 Initialized: Gemini 3.0 Flash Ready", "success");
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

    addLog(`Agent Analysis: ${needsRotation ? 'Dynamic Masking Required' : 'Session Stability Prioritized'}`, "system");
    
    if (needsRotation) {
      await runGeoIdSync(true);
    } else {
      setGeoStatus(prev => ({ ...prev, mode: 'persistent' }));
      addLog("Maintaining Persistent Identity for session safety.", "info");
    }

    await runFleetSync(true);
    addLog(`Synthesizing Mission Plan using Gemini 3.0 Flash...`, "info");
    
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
        identityMode: needsRotation ? 'rotational' : 'persistent'
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

  const executeNextStep = useCallback(async () => {
    if (!activeTask) return;

    setIsReconsidering(true);
    addLog("Step Complete. Agent Reconsidering Context...", "system");
    
    const currentDom = await runFleetSync(true);
    
    try {
      const analysis = await contextualSurveyAwareness({
        surveyContent: currentDom,
        taskDescription: activeTask.prompt
      });

      addLog(`Re-evaluation Logic: ${analysis.reasoning}`, "info");
      
      if (analysis.nextAction === 'FLAG_FOR_REVIEW' || analysis.confidenceScore < 0.4) {
        addLog("AI detected unexpected context. Pausing for Operator Review.", "warn");
        setActiveTask(prev => prev ? { ...prev, status: 'intervention_required' } : null);
        setIsReconsidering(false);
        return;
      }

      setActiveTask(prev => {
        if (!prev) return null;
        
        const isLastStep = prev.currentStepIndex >= prev.steps.length - 1;
        
        if (isLastStep && prev.status === 'running') {
          addLog("Objective Finalized. Protocol Terminal.", "success");
          return { ...prev, status: 'completed' as const, updatedAt: Date.now() };
        }

        const nextIndex = prev.currentStepIndex + 1;
        const nextStep = prev.steps[nextIndex];

        addLog(`Agent executing ${nextStep.type.toUpperCase()}: ${nextStep.description}`, "info");
        
        return { 
          ...prev, 
          currentStepIndex: nextIndex, 
          status: prev.manualMode ? 'paused' : 'running',
          updatedAt: Date.now() 
        };
      });
    } catch (err) {
      addLog("Re-evaluation Fault: Defaulting to planned sequence.", "warn");
      setActiveTask(prev => {
        if (!prev) return null;
        const nextIndex = prev.currentStepIndex + 1;
        if (nextIndex >= prev.steps.length) return { ...prev, status: 'completed' };
        return { ...prev, currentStepIndex: nextIndex };
      });
    } finally {
      setIsReconsidering(false);
    }
  }, [activeTask, addLog, runFleetSync]);

  const handleReorderSteps = (newSteps: AutomationStep[]) => {
    setActiveTask(prev => prev ? { ...prev, steps: newSteps, updatedAt: Date.now() } : null);
    addLog("Operator reordered task priority.", "system");
  };

  useEffect(() => {
    if (activeTask && activeTask.status === 'running' && !activeTask.manualMode && !isReconsidering) {
      executionTimer.current = setTimeout(() => {
        executeNextStep();
      }, 3500);
      return () => {
        if (executionTimer.current) clearTimeout(executionTimer.current);
      };
    }
  }, [activeTask?.currentStepIndex, activeTask?.status, activeTask?.manualMode, executeNextStep, isReconsidering]);

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

  const lastLog = logs[logs.length - 1];
  const currentStatus = isGenerating ? "GENERATING" : isSyncing ? "SYNCING" : isReconsidering ? "REVALUATING" : activeTask?.status.toUpperCase() || "IDLE";

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
        manualMode={manualMode}
        onToggleManual={(val) => {
          setManualMode(val);
          if (activeTask) {
            setActiveTask(prev => prev ? { ...prev, manualMode: val } : null);
          }
          addLog(`Protocol: ${val ? 'Manual Override' : 'Full Autonomy'}`, "system");
        }}
      />
      
      <SidebarInset className="bg-[#050505] max-w-full overflow-hidden flex flex-col h-screen scanline relative">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-black/40 px-6 backdrop-blur-2xl z-20">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="h-9 w-9 text-primary hover:bg-primary/20 rounded-xl transition-all neon-glow-primary" />
            <div className="flex flex-col">
              <h2 className="text-xs font-black tracking-[0.6em] uppercase text-primary flex items-center gap-2 text-glow-primary">
                <BrainCircuit className="w-3.5 h-3.5 animate-pulse" />
                Gemini_3.0_Nexus
              </h2>
              <span className="text-[8px] font-mono text-muted-foreground uppercase opacity-60 tracking-[0.2em]">AGENTIC_DEEP_REASONING_v4.2</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
             {activeTask?.status === 'intervention_required' && (
               <div className="flex items-center gap-2 px-3 py-1 bg-destructive/20 border border-destructive/40 rounded-full animate-pulse">
                 <AlertTriangle className="w-4 h-4 text-destructive" />
                 <span className="text-[10px] font-black text-destructive uppercase tracking-widest">Intervention Required</span>
               </div>
             )}
             <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
               <ShieldCheck className="w-4 h-4 text-primary" />
               <span className="text-[10px] font-black text-primary uppercase tracking-tighter">Secure_Node</span>
             </div>
          </div>
        </header>

        {/* Dynamic Telemetry Status Bar */}
        <div className="px-6 py-3 border-b border-white/5 bg-black/60 backdrop-blur-xl flex items-center justify-between z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-3 h-3 rounded-full transition-all duration-700",
                (activeTask?.status === 'running' || isSyncing || isGenerating || isReconsidering) 
                  ? "bg-accent animate-pulse shadow-[0_0_12px_hsl(var(--accent))]" 
                  : "bg-muted-foreground/40 shadow-inner"
              )} />
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">System_Status</span>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest transition-colors",
                  (activeTask?.status === 'running' || isSyncing || isGenerating || isReconsidering) ? "text-accent text-glow-accent" : "text-primary/70"
                )}>
                  {currentStatus}
                </span>
              </div>
            </div>
            
            <Separator orientation="vertical" className="h-6 bg-white/10" />
            
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Cpu className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Core_Engine</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Gemini 3.0 Flash</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3 text-muted-foreground/40" />
                <span className="text-[9px] font-mono text-muted-foreground/70 uppercase">Fleet Context Map</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-[85%] bg-primary/40 animate-loading" />
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-accent/50" />
                <span className="text-[9px] font-mono text-accent/80">982.4 MB/S</span>
              </div>
              <span className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-widest">LATENCY_0.4MS</span>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-hidden flex flex-col p-6 space-y-6 z-10 relative">
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4 border-white/5 bg-white/[0.03] hover:bg-white/[0.05] transition-all group relative overflow-hidden rounded-2xl shadow-2xl backdrop-blur-md">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-50" />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wifi className={cn("w-4 h-4 text-primary", isSyncing && "animate-pulse")} />
                  <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">Fleet_Sync</span>
                </div>
                <Database className="w-3.5 h-3.5 text-muted-foreground/20" />
              </div>
              <div className="text-xs font-bold text-foreground/90 truncate uppercase tracking-tight flex items-center gap-2">
                {isSyncing ? "Scanning..." : "Sync Active"}
              </div>
            </Card>

            <Card className="p-4 border-white/5 bg-white/[0.03] hover:bg-white/[0.05] transition-all group relative overflow-hidden rounded-2xl shadow-2xl backdrop-blur-md">
               <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent/60 to-transparent opacity-50" />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Fingerprint className={cn("w-4 h-4", geoStatus.mode === 'rotational' ? "text-accent" : "text-primary")} />
                  <span className={cn("text-[9px] font-black uppercase tracking-[0.3em]", geoStatus.mode === 'rotational' ? "text-accent" : "text-primary")}>
                    {geoStatus.mode === 'rotational' ? 'Mask_Active' : 'Identity_Locked'}
                  </span>
                </div>
                <Lock className="w-3.5 h-3.5 text-muted-foreground/20" />
              </div>
              <div className="text-xs font-bold text-foreground/90 truncate tracking-widest font-mono">
                {geoStatus.ip}
              </div>
            </Card>

            <div className="col-span-2 relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-[1.5rem] blur opacity-20 group-focus-within:opacity-50 transition-all duration-500" />
              <div className="relative bg-black/60 border border-white/10 p-4 rounded-[1.25rem] flex gap-3 shadow-3xl">
                <Input 
                  placeholder="Declare high-fidelity mission objective..."
                  className="bg-white/[0.03] border-white/10 focus-visible:ring-2 focus-visible:ring-primary/40 text-xs h-10 px-5 placeholder:text-muted-foreground/20 font-medium rounded-xl flex-1"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartAutomation()}
                />
                <Button 
                  onClick={handleStartAutomation}
                  disabled={isGenerating || !prompt.trim() || isSyncing}
                  className="h-10 px-6 rounded-xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:shadow-[0_0_30px_rgba(0,255,255,0.4)] transition-all group overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-loading" />
                  {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex gap-6 min-h-0">
            {/* Task Manager (Expanded Room) */}
            <div className="flex-[2] flex flex-col min-w-0">
              <div className="mb-4 flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Operation_Matrix_Queue</h3>
                </div>
                {activeTask && (
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-muted-foreground/40">{activeTask.steps.length} Protocol Steps</span>
                    <Progress value={((activeTask.currentStepIndex + 1) / activeTask.steps.length) * 100} className="w-32 h-1.5 bg-white/5 [&>div]:bg-primary shadow-2xl rounded-full" />
                  </div>
                )}
              </div>
              <AgentVisualizer 
                steps={activeTask?.steps || []} 
                currentStepIndex={activeTask?.currentStepIndex || 0}
                status={activeTask?.status || 'idle'}
                onIntervene={handleManualIntervention}
                onReorder={handleReorderSteps}
              />
            </div>

            {/* Agent Insight Card (Secondary Room) */}
            <Card className="flex-1 flex flex-col min-h-0 bg-black/60 border border-white/10 rounded-[2rem] p-6 font-mono relative shadow-3xl backdrop-blur-2xl group overflow-hidden">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-[100px] rounded-full group-hover:bg-primary/20 transition-all duration-700" />
              
              <div className="flex flex-col h-full space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 neon-glow-primary">
                    <BrainCircuit className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-primary uppercase tracking-[0.5em] text-glow-primary">Cognitive_Stream</span>
                    <span className="text-[10px] font-bold text-foreground/90 mt-0.5 uppercase tracking-tight">V3 Deep Reasoning</span>
                  </div>
                </div>

                <div className="flex-1 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Box className="w-3 h-3 text-muted-foreground/40" />
                      <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Current_Logic_Node</span>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl shadow-inner min-h-[100px]">
                      <p className="text-[11px] font-bold leading-relaxed text-foreground/90 animate-in fade-in slide-in-from-bottom-2 duration-700 font-body">
                        {lastLog?.msg || "Awaiting mission parameters for deep context synthesis..."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.4em] opacity-40">System_Integrity</span>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full w-full bg-gradient-to-r from-accent/40 to-accent animate-pulse-slow" />
                        </div>
                        <span className="text-[9px] font-black text-accent uppercase tracking-widest">Stable</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.4em] opacity-40">Context_Latency</span>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full w-[25%] bg-gradient-to-r from-primary/40 to-primary" />
                        </div>
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">0.8s</span>
                      </div>
                    </div>
                  </div>

                  {isReconsidering && (
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center gap-3 animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
                      <span className="text-[9px] font-black text-primary uppercase tracking-[0.4em] text-glow-primary">Re-evaluating...</span>
                    </div>
                  )}
                </div>

                <Button 
                  variant="ghost" 
                  onClick={() => setShowTerminal(true)}
                  className="w-full h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 border border-white/10 transition-all duration-300"
                >
                  <TerminalIcon className="w-3.5 h-3.5 mr-2" />
                  Kernel Logs
                </Button>
              </div>
            </Card>
          </div>

          {/* Animated System Kernel Drawer */}
          <div className={cn(
            "fixed inset-0 z-[100] transition-all duration-700 flex flex-col pointer-events-none",
            showTerminal ? "bg-black/90 backdrop-blur-2xl opacity-100" : "bg-transparent opacity-0"
          )}>
            <div className={cn(
              "mt-auto w-full max-h-[75vh] bg-background border-t border-white/15 rounded-t-[3rem] p-8 shadow-[0_-20px_100px_rgba(0,0,0,0.8)] transition-transform duration-700 ease-out pointer-events-auto flex flex-col relative overflow-hidden",
              showTerminal ? "translate-y-0" : "translate-y-full"
            )}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1.5 bg-white/10 rounded-full mt-4" />
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 neon-glow-primary">
                    <Cpu className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-primary uppercase tracking-[0.6em] text-glow-primary">System_Kernel_Output</span>
                    <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-[0.2em] mt-1">Real-Time Log Pipeline :: Buffer 8192_KB</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowTerminal(false)}
                  className="rounded-full h-12 w-12 hover:bg-white/10 transition-all"
                >
                  <ChevronDown className="w-6 h-6 text-muted-foreground" />
                </Button>
              </div>

              <ScrollArea className="flex-1 terminal-scroll font-mono text-xs">
                <div className="space-y-4 pb-12">
                  {logs.map((log, i) => (
                    <div key={i} className="flex gap-6 leading-relaxed group animate-in fade-in slide-in-from-left-4 duration-500">
                      <span className="text-white/10 shrink-0 select-none text-[10px] font-mono mt-0.5">[{i.toString().padStart(4, '0')}]</span>
                      <span className={cn(
                        "transition-colors break-all tracking-tight",
                        log.type === 'success' ? 'text-accent text-glow-accent font-bold' : 
                        log.type === 'warn' ? 'text-destructive font-black' : 
                        log.type === 'system' ? 'text-primary italic opacity-90' :
                        'text-foreground/70'
                      )}>
                        <span className="mr-2 opacity-50">{log.type === 'system' ? '>>' : '>'}</span>
                        {log.msg}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-muted-foreground/30 uppercase tracking-[0.3em]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                    BUFFER_HEALTH_NOMINAL
                  </span>
                  <span>::</span>
                  <span>SYNC_ACTIVE</span>
                </div>
                <span>v4.2.0_STABLE</span>
              </div>
            </div>
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
