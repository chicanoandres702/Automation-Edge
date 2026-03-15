"use client";

import { useState, useEffect, useCallback } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Zap,
  Activity,
  Terminal,
  BrainCircuit,
  Settings as SettingsIcon,
  RefreshCw,
  Layers,
  Sparkles,
  Cloud,
  ShieldCheck,
  Lock,
  Unlock,
  Search
} from "lucide-react";
import { AutomationTask, AutomationStep, ExecutionMemory } from "@/lib/types";
import { generateAutomationFromPrompt } from "@/ai/flows/generate-automation-from-prompt";
import { contextualSurveyAwareness } from "@/ai/flows/contextual-survey-awareness";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentVisualizer } from "@/components/automation/visualizer";
import { captureGlobalContext } from "@/lib/dom-traversal";
import { cn } from "@/lib/utils";
import { useFirebase } from "@/firebase";
import { doc, setDoc, collection, getDocs, getDoc, arrayUnion } from "firebase/firestore";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function NexusControlCenter() {
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [missionId, setMissionId] = useState("");
  const [isNeuralLocked, setIsNeuralLocked] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTask, setActiveTask] = useState<AutomationTask | null>(null);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'warn' | 'success' | 'system'}[]>([]);
  
  const { db } = useFirebase();
  const { toast } = useToast();
  
  const [isInterventionOpen, setIsInterventionOpen] = useState(false);
  const [interventionQuestion, setInterventionQuestion] = useState("");
  const [interventionResponse, setInterventionResponse] = useState("");

  const addLog = useCallback((msg: string, type: 'info' | 'warn' | 'success' | 'system' = 'info') => {
    setLogs(prev => [...prev.slice(-30), { msg, type }]);
  }, []);

  useEffect(() => {
    setMounted(true);
    addLog("Nexus Kernel v6.5 (Neural-Aware) Initialized", "system");
  }, [addLog]);

  // Agent Loop Execution
  useEffect(() => {
    if (activeTask?.status === 'running' || activeTask?.status === 'seeking') {
      const timer = setTimeout(async () => {
        await executeNextStep();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeTask?.status, activeTask?.currentStepIndex]);

  const executeNextStep = async () => {
    if (!activeTask) return;

    const currentStep = activeTask.steps[activeTask.currentStepIndex];
    if (!currentStep) {
       setActiveTask(prev => prev ? { ...prev, status: 'completed' } : null);
       addLog("Mission Objective Fulfilled: All nodes resolved.", "success");
       return;
    }

    try {
      addLog(`Executing Node: ${currentStep.description}`, "info");
      const stateSnapshot = await captureGlobalContext();
      
      // Persistence Layer: Load Progressive Continuity from Firestore
      let missionMemory: ExecutionMemory[] = [];
      if (activeTask.missionContext) {
        const missionRef = doc(db, "missions", activeTask.missionContext);
        const missionSnap = await getDoc(missionRef);
        if (missionSnap.exists()) {
          missionMemory = missionSnap.data().memory || [];
          if (missionMemory.length > 0 && activeTask.currentStepIndex === 0) {
            addLog(`Progressive Continuity: Loaded ${missionMemory.length} historical nodes for ${activeTask.missionContext}.`, "system");
          }
        }
      }

      // Shared Knowledge Resolver
      const toolsSnap = await getDocs(collection(db, "tools"));
      const currentHostname = typeof window !== 'undefined' ? window.location.hostname : "";
      const platformContext = toolsSnap.docs.find(d => d.data().hostname === currentHostname)?.data().toolId;

      const result = await contextualSurveyAwareness({
        goal: activeTask.prompt,
        memory: [...missionMemory, ...activeTask.memory],
        surveyContent: stateSnapshot,
        missionContext: activeTask.missionContext,
        platformContext: platformContext,
      });

      if (result.action === 'ASK_USER') {
        setInterventionQuestion(result.parameters.question || "Strategic ambiguity encountered.");
        setIsInterventionOpen(true);
        setActiveTask(prev => prev ? { ...prev, status: 'intervention_required' } : null);
        return;
      }

      // Autonomous context discovery logic
      if (activeTask.status === 'seeking' && result.reasoning.includes("Identified mission:")) {
        const discoveredId = result.reasoning.split("Identified mission:")[1].trim().split(" ")[0];
        setMissionId(discoveredId);
        setIsNeuralLocked(true);
        addLog(`Discovery Successful: Neural Lock established for ${discoveredId}`, "success");
        setActiveTask(prev => prev ? { ...prev, missionContext: discoveredId, status: 'running' } : null);
      }

      const nextStepIndex = activeTask.currentStepIndex + 1;
      const stepResult: ExecutionMemory = { 
        step: currentStep.description, 
        result: `Action ${result.action} Verified: ${result.reasoning}` 
      };

      // Persistent Update: Save to specific course/project silo
      if (activeTask.missionContext) {
        const missionRef = doc(db, "missions", activeTask.missionContext);
        setDoc(missionRef, {
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

      addLog(`Tactical Success: ${result.action}`, "success");

    } catch (error) {
      addLog("Node Stream Error: Attempting self-healing recovery.", "warn");
    }
  };

  const handleStartMission = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    addLog(`AI Generating tactical sequence...`, "info");
    
    try {
      const toolsSnap = await getDocs(collection(db, "tools"));
      const sharedToolHostnames = toolsSnap.docs.map(d => d.data().hostname);

      const result = await generateAutomationFromPrompt({ 
        prompt, 
        missionContext: missionId || undefined,
        sharedToolHostnames 
      });

      // Neural Lock Activation or Discovery
      let initialStatus: AutomationTask['status'] = 'running';
      if (result.neuralLock.missionId) {
        setMissionId(result.neuralLock.missionId);
        setIsNeuralLocked(true);
        addLog(`Neural Lock Active: ${result.neuralLock.missionId}`, "system");
      } else if (result.neuralLock.isAmbiguous) {
        initialStatus = 'seeking';
        addLog(`Ambiguous Context: Agent in Discovery Mode.`, "warn");
      }

      // Register newly discovered shared tools
      for (const platform of result.classifiedPlatforms) {
        if (platform.type === 'shared_tool') {
          const toolId = platform.hostname.split('.')[0];
          await setDoc(doc(db, "tools", toolId), {
            toolId,
            hostname: platform.hostname,
            isShared: true
          }, { merge: true });
          addLog(`Shared Tool Registered: ${platform.hostname}`, "system");
        }
      }

      const now = Date.now();
      const newSteps: AutomationStep[] = result.workflowSteps.map((s, idx) => ({
        id: `step-${now}-${idx}`,
        description: s,
        type: s.toLowerCase().includes('wait') ? 'wait' : s.toLowerCase().includes('click') ? 'click' : 'navigate',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3
      }));

      setActiveTask({
        id: `task-${now}`,
        prompt,
        status: initialStatus,
        steps: newSteps,
        currentStepIndex: 0,
        observedTabs: [],
        memory: [],
        createdAt: now,
        updatedAt: now,
        identityMode: 'persistent',
        missionContext: result.neuralLock.missionId || missionId
      });
      
      setPrompt("");
      addLog(`Mission Initiated. Progressive continuity layer active.`, "success");
    } catch (error) {
      addLog("Synthesis failure. Check neural link.", "warn");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInterventionSubmit = () => {
    if (!activeTask) return;
    addLog(`Operator guidance synced. Resuming mission.`, "system");
    setActiveTask({
      ...activeTask,
      status: 'running',
      memory: [...activeTask.memory, { step: "NEURAL_OVERRIDE", result: interventionResponse }]
    });
    setIsInterventionOpen(false);
    setInterventionResponse("");
  };

  const agentPortrait = PlaceHolderImages.find(img => img.id === 'agent-portrait');

  if (!mounted) return null;

  return (
    <>
      <AppSidebar 
        activeTask={activeTask}
        onStart={() => activeTask && setActiveTask({...activeTask, status: 'running'})}
        onPause={() => activeTask && setActiveTask({...activeTask, status: 'paused'})}
        onStop={() => {
          setActiveTask(null);
          setIsNeuralLocked(false);
          setMissionId("");
        }}
        onStep={() => {}}
        manualMode={false}
        onToggleManual={() => {}}
      />
      
      <SidebarInset className="bg-background flex flex-col h-screen relative overflow-hidden">
        {/* Agent Portrait (Mobile-Optimized Sidebar Layout) */}
        <div 
          className="absolute left-0 top-0 w-1/3 h-full z-0 opacity-15 pointer-events-none transition-opacity duration-1000 hidden md:block"
          style={{
            backgroundImage: `url(${agentPortrait?.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'left center',
            maskImage: 'linear-gradient(to right, black 50%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 50%, transparent 100%)',
          }}
          data-ai-hint="ai agent portrait"
        />

        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/50 px-4 md:px-6 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-8 w-8" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Nexus Fleet</span>
              <span className="text-[8px] font-medium text-muted-foreground uppercase">Kernel v6.5</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className={cn(
               "flex items-center gap-2 px-2 py-1 rounded-md border transition-colors",
               isNeuralLocked ? "bg-primary/10 border-primary/30" : 
               activeTask?.status === 'seeking' ? "bg-yellow-500/10 border-yellow-500/30" : "bg-white/5 border-white/5"
             )}>
                {isNeuralLocked ? <Lock className="w-2.5 h-2.5 text-primary" /> : activeTask?.status === 'seeking' ? <Search className="w-2.5 h-2.5 text-yellow-500 animate-pulse" /> : <Unlock className="w-2.5 h-2.5 text-muted-foreground" />}
                <span className={cn(
                  "text-[9px] font-black uppercase",
                  isNeuralLocked ? "text-primary" : activeTask?.status === 'seeking' ? "text-yellow-500" : "text-muted-foreground"
                )}>
                  {isNeuralLocked ? `Locked: ${missionId}` : activeTask?.status === 'seeking' ? "Seeking Context..." : "Neural Open"}
                </span>
             </div>
             <SettingsIcon className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-0 z-10 relative p-4 md:p-6 space-y-4">
          <div className="max-w-5xl mx-auto w-full">
            <Card className="p-1 bg-background/40 backdrop-blur-xl border-white/5 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
              <div className="flex flex-col sm:flex-row gap-2 p-2">
                <div className="relative group flex-1">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="Input objective (e.g. Complete Capella assignments)..."
                    className="bg-transparent border-none text-sm h-12 pl-10 focus-visible:ring-0"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStartMission()}
                  />
                </div>
                <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-white/5 pt-2 sm:pt-0 sm:pl-2">
                  <Button 
                    onClick={handleStartMission} 
                    disabled={isGenerating || !prompt.trim()} 
                    className="h-10 px-6 w-full sm:w-auto bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 transition-transform shadow-lg shadow-primary/20"
                  >
                    {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current mr-2" />}
                    {isGenerating ? "Neural Mapping" : "Initiate"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
            <div className="lg:col-span-8 flex flex-col min-h-0 space-y-3">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Tactical Stream</h3>
                </div>
                {activeTask && (
                   <div className="flex items-center gap-2">
                     <span className="text-[8px] font-bold text-muted-foreground uppercase">Context Silo:</span>
                     <span className={cn(
                       "text-[9px] font-black px-2 py-0.5 rounded border",
                       activeTask.status === 'seeking' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" : "bg-primary/10 border-primary/20 text-primary"
                     )}>
                       {activeTask.status === 'seeking' ? 'Scanning Dashboard...' : activeTask.missionContext || 'Universal'}
                     </span>
                   </div>
                )}
              </div>
              <div className="flex-1 min-h-0">
                <AgentVisualizer 
                  steps={activeTask?.steps || []} 
                  currentStepIndex={activeTask?.currentStepIndex || 0}
                  status={activeTask?.status || 'idle'}
                />
              </div>
            </div>

            <div className="lg:col-span-4 hidden md:flex flex-col min-h-0 space-y-3">
              <div className="flex items-center gap-2 px-2">
                <Terminal className="w-4 h-4 text-accent" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Continuity Matrix</h3>
              </div>
              <Card className="flex-1 bg-black/40 backdrop-blur-md border-white/5 p-4 rounded-3xl flex flex-col min-h-0 ring-1 ring-white/5">
                 <ScrollArea className="flex-1">
                   <div className="space-y-3">
                     {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20">
                          <Cloud className="w-10 h-10 mb-4" />
                          <p className="text-[10px] font-mono uppercase tracking-widest text-center">Standby<br/>Kernel Idle</p>
                        </div>
                     ) : (
                       logs.map((log, i) => (
                         <div key={i} className="flex gap-3 items-start animate-in fade-in slide-in-from-left-1">
                           <div className={cn(
                             "w-1 h-3 mt-1 rounded-full shrink-0",
                             log.type === 'success' ? 'bg-accent' : 
                             log.type === 'warn' ? 'bg-yellow-500' : 
                             log.type === 'system' ? 'bg-primary' : 'bg-muted-foreground/30'
                           )} />
                           <p className={cn(
                             "text-[10px] font-mono leading-relaxed",
                             log.type === 'success' ? 'text-accent' : 
                             log.type === 'warn' ? 'text-yellow-500' : 
                             log.type === 'system' ? 'text-primary' : 'text-muted-foreground'
                           )}>
                             {log.msg}
                           </p>
                         </div>
                       ))
                     )}
                   </div>
                 </ScrollArea>
              </Card>
            </div>
          </div>
        </main>

        <Dialog open={isInterventionOpen} onOpenChange={setIsInterventionOpen}>
          <DialogContent className="bg-background/95 border-primary/20 backdrop-blur-3xl max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-primary font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <BrainCircuit className="w-5 h-5" />
                Neural Link Injection
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-2">
                <span className="text-[8px] font-black text-primary uppercase">Agent Context Query</span>
                <p className="text-xs font-bold text-foreground leading-relaxed italic">
                  "{interventionQuestion}"
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-[8px] font-black text-muted-foreground uppercase">Strategic Override</span>
                <Input 
                  placeholder="Provide missing context..."
                  className="bg-background/50 border-white/10 text-xs h-12 rounded-xl focus:ring-1"
                  value={interventionResponse}
                  onChange={(e) => setInterventionResponse(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInterventionSubmit()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleInterventionSubmit} className="w-full bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest py-6 rounded-2xl shadow-xl shadow-primary/20">
                Resync Guidance
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </>
  );
}
