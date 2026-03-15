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
  Settings as SettingsIcon,
  Sparkles,
  RotateCcw,
  Database,
  Cloud,
  Layers,
  Search
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
import { useFirebase, useUser } from "@/firebase";
import { doc, setDoc, serverTimestamp, collection, getDocs, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function FleetNexusPage() {
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [missionId, setMissionId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTask, setActiveTask] = useState<AutomationTask | null>(null);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'warn' | 'success' | 'system'}[]>([]);
  
  const { user } = useUser();
  const { db } = useFirebase();
  const { toast } = useToast();
  
  const [isInterventionOpen, setIsInterventionOpen] = useState(false);
  const [interventionQuestion, setInterventionQuestion] = useState("");
  const [interventionResponse, setInterventionResponse] = useState("");

  const addLog = useCallback((msg: string, type: 'info' | 'warn' | 'success' | 'system' = 'info') => {
    setLogs(prev => [...prev.slice(-100), { msg, type }]);
  }, []);

  const runFleetSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const globalContent = await captureGlobalContext();
      return globalContent;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    addLog("Nexus_OS v4.2 Initialized", "success");
  }, [addLog]);

  // Agent Loop Execution
  useEffect(() => {
    if (activeTask?.status === 'running') {
      const timer = setTimeout(async () => {
        await executeNextStep();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [activeTask?.status, activeTask?.currentStepIndex]);

  const executeNextStep = async () => {
    if (!activeTask) return;

    const currentStep = activeTask.steps[activeTask.currentStepIndex];
    if (!currentStep) {
       setActiveTask(prev => prev ? { ...prev, status: 'completed' } : null);
       addLog("Mission Objective Achieved.", "success");
       return;
    }

    addLog(`Executing: ${currentStep.description}`, "info");

    try {
      // 1. Capture current environment state
      const stateSnapshot = await runFleetSync();
      
      // 2. Fetch Mission Context (Progressive Memory)
      let missionMemory: ExecutionMemory[] = activeTask.memory;
      if (activeTask.missionContext) {
        const missionRef = doc(db, "missions", activeTask.missionContext);
        const missionSnap = await getDoc(missionRef);
        if (missionSnap.exists()) {
          const cloudMemory = missionSnap.data().memory || [];
          // Merge memory ensuring unique steps
          missionMemory = [...cloudMemory, ...activeTask.memory];
        }
      }

      // 3. Determine if current platform is a shared tool
      // (Mock check for hostname - in a real extension we'd use current tab URL)
      const currentHost = "campus.capella.edu"; // Mock
      const toolRef = doc(db, "tools", currentHost.replace(/\./g, '_'));
      const toolSnap = await getDoc(toolRef);
      const platformContext = toolSnap.exists() ? currentHost : undefined;

      // 4. Call Reasoning Flow
      const result = await contextualSurveyAwareness({
        goal: activeTask.prompt,
        memory: missionMemory,
        surveyContent: stateSnapshot,
        missionContext: activeTask.missionContext,
        platformContext
      });

      // 5. Handle Action
      if (result.action === 'ASK_USER') {
        setInterventionQuestion(result.parameters.question || "Awaiting instruction.");
        setIsInterventionOpen(true);
        setActiveTask(prev => prev ? { ...prev, status: 'intervention_required' } : null);
        return;
      }

      // 6. Update Local and Cloud State
      const nextStepIndex = activeTask.currentStepIndex + 1;
      const stepResult: ExecutionMemory = { 
        step: currentStep.description, 
        result: `Success: ${result.action}` 
      };

      // Persistent Mission Storage (Progressive Continuity)
      if (activeTask.missionContext) {
        const missionRef = doc(db, "missions", activeTask.missionContext);
        await setDoc(missionRef, {
          missionId: activeTask.missionContext,
          memory: arrayUnion({ ...stepResult, timestamp: Date.now() }),
          updatedAt: Date.now()
        }, { merge: true });
      }

      setActiveTask(prev => prev ? {
        ...prev,
        currentStepIndex: nextStepIndex,
        memory: [...prev.memory, stepResult],
        updatedAt: Date.now()
      } : null);

    } catch (error) {
      addLog("Step execution failed. Retrying...", "warn");
      // Handle Retry Logic...
    }
  };

  const handleStartAutomation = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    addLog(`Synthesizing Mission Strategy [Context: ${missionId || 'GLOBAL'}]...`, "info");
    
    try {
      const toolsSnap = await getDocs(collection(db, "tools"));
      const sharedToolHostnames = toolsSnap.docs.map(d => d.data().hostname);

      const result = await generateAutomationFromPrompt({ 
        prompt, 
        missionContext: missionId,
        sharedToolHostnames 
      });

      // Persistent Tool Classification
      result.classifiedPlatforms.forEach(p => {
        if (p.type === 'shared_tool') {
          const toolRef = doc(db, "tools", p.hostname.replace(/\./g, '_'));
          setDoc(toolRef, { hostname: p.hostname, isShared: true }, { merge: true });
        }
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
        status: 'running',
        steps: newSteps,
        currentStepIndex: 0,
        observedTabs: [],
        memory: [],
        createdAt: now,
        updatedAt: now,
        identityMode: 'persistent',
        missionContext: missionId
      };

      setActiveTask(newTask);
      setPrompt("");
      addLog(`Mission Live. Progressive Continuity Active.`, "success");
    } catch (error) {
      addLog("Synthesis failed", "warn");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInterventionSubmit = () => {
    if (!activeTask) return;
    addLog(`User Intervention: ${interventionResponse}`, "system");
    setActiveTask({
      ...activeTask,
      status: 'running',
      memory: [...activeTask.memory, { step: "USER_INTERVENTION", result: interventionResponse }]
    });
    setIsInterventionOpen(false);
    setInterventionResponse("");
  };

  if (!mounted) return null;

  return (
    <>
      <AppSidebar 
        activeTask={activeTask}
        onStart={() => activeTask && setActiveTask({...activeTask, status: 'running'})}
        onPause={() => activeTask && setActiveTask({...activeTask, status: 'paused'})}
        onStop={() => setActiveTask(null)}
        onStep={() => {}}
        manualMode={false}
        onToggleManual={() => {}}
      />
      
      <SidebarInset className="bg-black max-w-full overflow-hidden flex flex-col h-screen scanline relative">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-black/40 px-4 backdrop-blur-2xl z-20">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-8 w-8 text-primary" />
            <h2 className="text-[10px] font-black uppercase text-primary tracking-widest">Nexus_Fleet_v4.2</h2>
          </div>
          <div className="flex items-center gap-2">
             <Cloud className="w-3 h-3 text-accent animate-pulse" />
             <span className="text-[8px] font-black text-accent uppercase">Cloud_Sync_Active</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4 z-10 pb-24">
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-3 bg-white/[0.03] border-white/5 rounded-xl flex items-center gap-2">
              <Layers className="w-3 h-3 text-primary" />
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-muted-foreground uppercase">Active Context</span>
                <span className="text-[9px] font-bold text-primary truncate">{missionId || "GLOBAL_DOMAIN"}</span>
              </div>
            </Card>

            <Card className="p-3 bg-white/[0.03] border-white/5 rounded-xl flex items-center gap-2">
              <Database className="w-3 h-3 text-accent" />
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-muted-foreground uppercase">Persistence</span>
                <span className="text-[9px] font-bold text-accent uppercase">Prog_Continuity</span>
              </div>
            </Card>
          </div>

          {!activeTask && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
               <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl">
                  <h3 className="text-xs font-black text-primary uppercase mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Awaiting Mission Parameters
                  </h3>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Inject a project-specific mission (e.g., SWK-2400 Week 2) to trigger progressive continuity. Shared tools like Google Docs will be automatically classified.
                  </p>
               </div>
            </div>
          )}

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-accent/30 rounded-xl blur opacity-20" />
            <div className="relative bg-black/60 border border-white/10 p-2 rounded-xl flex flex-col gap-2">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50" />
                  <Input 
                    placeholder="Mission ID (Optional)..."
                    className="bg-white/[0.03] border-none text-[10px] h-9 pl-8 font-mono"
                    value={missionId}
                    onChange={(e) => setMissionId(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Inject tactical objective..."
                  className="bg-white/[0.03] border-none text-[10px] h-9 font-medium"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartAutomation()}
                />
                <Button onClick={handleStartAutomation} disabled={isGenerating} size="icon" className="h-9 w-9 bg-primary">
                  {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col min-h-0 space-y-4">
            <AgentVisualizer 
              steps={activeTask?.steps || []} 
              currentStepIndex={activeTask?.currentStepIndex || 0}
              status={activeTask?.status || 'idle'}
            />

            <Card className="bg-black/40 border-white/5 p-4 rounded-2xl">
               <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-3.5 h-3.5 text-accent animate-pulse" />
                  <span className="text-[8px] font-black text-accent uppercase tracking-widest">Persistence Stream</span>
               </div>
               <ScrollArea className="h-24">
                 <div className="space-y-1">
                   {logs.map((log, i) => (
                     <p key={i} className={cn(
                       "text-[9px] font-mono leading-tight",
                       log.type === 'success' ? 'text-accent' : 
                       log.type === 'warn' ? 'text-destructive' : 
                       log.type === 'system' ? 'text-primary' : 'text-muted-foreground'
                     )}>
                       [{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}] {log.msg}
                     </p>
                   ))}
                   {logs.length === 0 && (
                     <p className="text-[9px] font-mono text-muted-foreground/30 italic">Fleet_Link_Standby...</p>
                   )}
                 </div>
               </ScrollArea>
            </Card>
          </div>
        </main>

        <Dialog open={isInterventionOpen} onOpenChange={setIsInterventionOpen}>
          <DialogContent className="bg-card/95 border-primary/20 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-primary font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <BrainCircuit className="w-5 h-5" />
                Neural_Link_Intervention
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-[11px] font-bold text-foreground/80 leading-relaxed italic border-l-2 border-accent pl-4">
                "{interventionQuestion}"
              </p>
              <Input 
                placeholder="Resolve ambiguity..."
                className="bg-white/5 border-white/10 text-xs"
                value={interventionResponse}
                onChange={(e) => setInterventionResponse(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInterventionSubmit()}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleInterventionSubmit} className="bg-primary text-background font-black uppercase text-[10px]">
                Inject Instruction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </>
  );
}
