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
  Box,
  RotateCcw
} from "lucide-react";
import { AutomationTask, AutomationStep, ActionType, AutomationStatus } from "@/lib/types";
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

const MAX_GLOBAL_RETRIES = 3;

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

    addLog(`Analysis: ${needsRotation ? 'Masking Required' : 'Stability Prioritized'}`, "system");
    
    if (needsRotation) {
      await runGeoIdSync(true);
    } else {
      setGeoStatus(prev => ({ ...prev, mode: 'persistent' }));
      addLog("Persistence enforced for session safety.", "info");
    }

    await runFleetSync(true);
    addLog(`Synthesizing Plan (Gemini 3.0)...`, "info");
    
    try {
      const result = await generateAutomationFromPrompt(prompt);
      
      const now = Date.now();
      const newSteps: AutomationStep[] = result.workflowSteps.map((s, idx) => ({
        id: `step-${now}-${idx}`,
        description: s,
        type: mapActionType(s),
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
        createdAt: now,
        updatedAt: now,
        manualMode,
        identityMode: needsRotation ? 'rotational' : 'persistent'
      };

      setActiveTask(newTask);
      setPrompt("");
      addLog(`Mission Risk: ${result.estimatedRisk.toUpperCase()}`, "success");
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
    addLog(isRetry ? `Retrying Step [${currentIndex + 1}]...` : "Contextual Re-evaluation...", "system");
    
    const currentDom = await runFleetSync(true);
    
    try {
      const analysis = await contextualSurveyAwareness({
        surveyContent: currentDom,
        taskDescription: activeTask.prompt
      });

      // Handle failure or low confidence
      if (analysis.nextAction === 'FLAG_FOR_REVIEW' || analysis.confidenceScore < 0.4) {
        if (currentStep.retryCount < currentStep.maxRetries) {
          addLog(`Confidence Low (${Math.round(analysis.confidenceScore * 100)}%). Scheduling Retry.`, "warn");
          
          setActiveTask(prev => {
            if (!prev) return null;
            const updatedSteps = [...prev.steps];
            updatedSteps[currentIndex] = {
              ...currentStep,
              status: 'retrying',
              retryCount: currentStep.retryCount + 1,
              lastError: 'Low confidence analysis'
            };
            return { ...prev, steps: updatedSteps, status: 'retrying' as AutomationStatus };
          });

          // Wait before retry
          await new Promise(r => setTimeout(r, 2000));
          return executeNextStep(true);
        } else {
          addLog("Max retries reached. AI Intervention required.", "warn");
          setActiveTask(prev => prev ? { ...prev, status: 'intervention_required' } : null);
          setIsReconsidering(false);
          return;
        }
      }

      // Successful analysis and execution
      setActiveTask(prev => {
        if (!prev) return null;
        
        const isLastStep = prev.currentStepIndex >= prev.steps.length - 1;
        const updatedSteps = [...prev.steps];
        updatedSteps[currentIndex] = { ...currentStep, status: 'completed' };

        if (isLastStep && prev.status === 'running') {
          addLog("Objective Finalized.", "success");
          return { 
            ...prev, 
            steps: updatedSteps,
            status: 'completed' as const, 
            updatedAt: Date.now() 
          };
        }

        const nextIndex = prev.currentStepIndex + 1;
        const nextStepDescription = prev.steps[nextIndex]?.description || "Next Operation";

        addLog(`Executed: ${currentStep.description}`, "success");
        addLog(`Preparing: ${nextStepDescription}`, "info");
        
        return { 
          ...prev, 
          steps: updatedSteps,
          currentStepIndex: nextIndex, 
          status: prev.manualMode ? 'paused' : 'running',
          updatedAt: Date.now() 
        };
      });
    } catch (err) {
      if (currentStep.retryCount < currentStep.maxRetries) {
        addLog(`Logic Fault. Retrying (${currentStep.retryCount + 1}/${currentStep.maxRetries})...`, "warn");
        
        setActiveTask(prev => {
          if (!prev) return null;
          const updatedSteps = [...prev.steps];
          updatedSteps[currentIndex] = {
            ...currentStep,
            status: 'retrying',
            retryCount: currentStep.retryCount + 1
          };
          return { ...prev, steps: updatedSteps, status: 'retrying' as AutomationStatus };
        });

        await new Promise(r => setTimeout(r, 2000));
        return executeNextStep(true);
      }

      addLog("Critical Fault: Sequence halted.", "warn");
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

  const handleManualIntervention = (index: number) => {
    addLog(`Manual Override Step ${index + 1}.`, "system");
    setActiveTask(prev => {
      if (!prev) return null;
      const updatedSteps = [...prev.steps];
      updatedSteps[index].status = 'completed';
      return { ...prev, steps: updatedSteps, status: 'paused' };
    });
  };

  const handleReorderSteps = (newSteps: AutomationStep[]) => {
    setActiveTask(prev => prev ? { ...prev, steps: newSteps, updatedAt: Date.now() } : null);
    addLog("Matrix reordered.", "system");
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
             addLog("Resuming...", "info");
          }
        }}
        onPause={() => {
          if (activeTask) {
            setActiveTask({...activeTask, status: 'paused'});
            addLog("Paused.", "warn");
          }
        }}
        onStop={() => {
          setActiveTask(null);
          addLog("Purged.", "warn");
        }}
        onStep={() => executeNextStep()}
        manualMode={manualMode}
        onToggleManual={(val) => {
          setManualMode(val);
          if (activeTask) {
            setActiveTask(prev => prev ? { ...prev, manualMode: val } : null);
          }
          addLog(`Protocol: ${val ? 'Manual' : 'Auto'}`, "system");
        }}
      />
      
      <SidebarInset className="bg-[#050505] max-w-full overflow-hidden flex flex-col h-screen scanline relative">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-black/40 px-4 backdrop-blur-2xl z-20">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-8 w-8 text-primary hover:bg-primary/20 rounded-lg transition-all" />
            <h2 className="text-[10px] font-black tracking-[0.4em] uppercase text-primary text-glow-primary truncate max-w-[120px]">
              Nexus_v4.2
            </h2>
          </div>
          <div className="flex items-center gap-2">
             {activeTask?.status === 'intervention_required' && (
               <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
             )}
             <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
        </header>

        {/* Compressed Status Bar */}
        <div className="px-4 py-2 border-b border-white/5 bg-black/60 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-2 h-2 rounded-full",
              (activeTask?.status === 'running' || activeTask?.status === 'retrying' || isSyncing || isGenerating || isReconsidering) 
                ? "bg-accent animate-pulse shadow-[0_0_8px_hsl(var(--accent))]" 
                : "bg-muted-foreground/40"
            )} />
            <span className="text-[10px] font-black uppercase tracking-widest text-accent">
              {currentStatus}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Activity className="w-3 h-3 text-primary/50" />
            <span className="text-[9px] font-mono text-muted-foreground/70 uppercase">0.4ms</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col p-4 space-y-4 z-10 relative">
          {/* Quick Stats Grid - Compact */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-3 border-white/5 bg-white/[0.03] rounded-xl flex items-center gap-2">
              <Wifi className={cn("w-3 h-3 text-primary", isSyncing && "animate-pulse")} />
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-muted-foreground uppercase">Fleet</span>
                <span className="text-[9px] font-bold text-primary">SYNC_OK</span>
              </div>
            </Card>

            <Card className="p-3 border-white/5 bg-white/[0.03] rounded-xl flex items-center gap-2">
              <Fingerprint className={cn("w-3 h-3", geoStatus.mode === 'rotational' ? "text-accent" : "text-primary")} />
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-muted-foreground uppercase">Geo</span>
                <span className="text-[9px] font-mono text-foreground/90 truncate max-w-[60px]">{geoStatus.ip}</span>
              </div>
            </Card>
          </div>

          {/* Mission Inject Area */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-accent/30 rounded-xl blur opacity-20 group-focus-within:opacity-50" />
            <div className="relative bg-black/60 border border-white/10 p-2 rounded-xl flex gap-2">
              <Input 
                placeholder="Mission parameters..."
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

          {/* Progress / Task Queue - Mobile Friendly */}
          <div className="flex flex-col min-h-0 space-y-4 pb-20">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Matrix_Queue</h3>
              {activeTask && (
                <div className="flex items-center gap-2">
                  {activeTask.status === 'retrying' && (
                    <RotateCcw className="w-3 h-3 text-accent animate-spin" />
                  )}
                  <span className="text-[8px] font-mono text-muted-foreground/40">{activeTask.currentStepIndex + 1}/{activeTask.steps.length} OPS</span>
                </div>
              )}
            </div>
            
            <div className="min-h-[300px] max-h-[500px] w-full">
              <AgentVisualizer 
                steps={activeTask?.steps || []} 
                currentStepIndex={activeTask?.currentStepIndex || 0}
                status={activeTask?.status || 'idle'}
                onIntervene={handleManualIntervention}
                onReorder={handleReorderSteps}
              />
            </div>

            {/* Compact Insight Card */}
            <Card className="bg-black/40 border-white/5 p-4 rounded-2xl relative overflow-hidden">
               <div className="flex items-center gap-2 mb-3">
                  <BrainCircuit className="w-4 h-4 text-primary" />
                  <span className="text-[8px] font-black text-primary uppercase tracking-[0.3em]">AI_Reasoning</span>
               </div>
               <p className="text-[10px] font-bold text-foreground/70 leading-relaxed font-body">
                {logs[logs.length - 1]?.msg || "Awaiting mission parameters..."}
               </p>
               
               <Button 
                  variant="ghost" 
                  onClick={() => setShowTerminal(true)}
                  className="w-full h-8 mt-4 rounded-lg bg-white/[0.03] text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 border border-white/5"
                >
                  <TerminalIcon className="w-3 h-3 mr-2" />
                  Logs
                </Button>
            </Card>
          </div>

          {/* Terminal Drawer - Animated */}
          <div className={cn(
            "fixed inset-0 z-[100] transition-all duration-500 pointer-events-none",
            showTerminal ? "bg-black/80 backdrop-blur-md opacity-100" : "bg-transparent opacity-0"
          )}>
            <div className={cn(
              "mt-auto w-full max-h-[80vh] bg-background border-t border-white/10 rounded-t-3xl p-6 transition-transform duration-500 pointer-events-auto flex flex-col",
              showTerminal ? "translate-y-0" : "translate-y-full"
            )}>
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">System_Kernel</span>
                <Button variant="ghost" size="icon" onClick={() => setShowTerminal(false)}>
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
