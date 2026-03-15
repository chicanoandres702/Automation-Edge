
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
  Sparkles,
  Cloud,
  Lock,
  Unlock,
  Search,
  Eye
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
  const [pendingActionData, setPendingActionData] = useState<any>(null);

  const addLog = useCallback((msg: string, type: 'info' | 'warn' | 'success' | 'system' = 'info') => {
    setLogs(prev => [...prev.slice(-30), { msg, type }]);
  }, []);

  useEffect(() => {
    setMounted(true);
    addLog("Nexus Kernel v6.5 (Adaptive Autonomy) Initialized", "system");
  }, [addLog]);

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
       addLog("Mission Objective Fulfilled: Final Verification.", "system");
       await verifyGoalCompletion();
       return;
    }

    try {
      addLog(`Syncing Node: ${currentStep.description}`, "info");
      const stateSnapshot = await captureGlobalContext();
      
      let missionMemory: ExecutionMemory[] = [];
      let learnedPatterns: any[] = [];
      
      if (activeTask.missionContext) {
        const missionRef = doc(db, "missions", activeTask.missionContext);
        const missionSnap = await getDoc(missionRef);
        if (missionSnap.exists()) {
          missionMemory = missionSnap.data().memory || [];
          learnedPatterns = missionSnap.data().learnedPatterns || [];
        }
      }

      const toolsSnap = await getDocs(collection(db, "tools"));
      const currentHostname = typeof window !== 'undefined' ? window.location.hostname : "";
      const platformContext = toolsSnap.docs.find(d => d.data().hostname === currentHostname)?.data().toolId;

      const result = await contextualSurveyAwareness({
        goal: activeTask.prompt,
        memory: [...missionMemory, ...activeTask.memory],
        learnedPatterns,
        surveyContent: stateSnapshot,
        missionContext: activeTask.missionContext,
        platformContext: platformContext,
      });

      // Adaptive Autonomy: Bypass intervention if confidence is high or success is visuals
      if (result.action === 'ASK_USER' && result.confidence < 0.85) {
        setInterventionQuestion(result.parameters.question || "Strategic ambiguity encountered.");
        setPendingActionData(result);
        setIsInterventionOpen(true);
        setActiveTask(prev => prev ? { ...prev, status: 'intervention_required' } : null);
        return;
      }

      // If we got here and it's a "success pattern", learn it
      if (result.successPatternIdentified && activeTask.missionContext) {
        const missionRef = doc(db, "missions", activeTask.missionContext);
        setDoc(missionRef, {
          learnedPatterns: arrayUnion({
            actionType: result.action,
            successIndicator: result.successPatternIdentified,
            confidence: 1.0
          })
        }, { merge: true });
        addLog(`Neural Pattern Learned: ${result.successPatternIdentified}`, "success");
      }

      const stepResult: ExecutionMemory = { 
        step: currentStep.description, 
        result: `Verified: ${result.reasoning}` 
      };

      if (activeTask.missionContext) {
        const missionRef = doc(db, "missions", activeTask.missionContext);
        setDoc(missionRef, {
          missionId: activeTask.missionContext,
          memory: arrayUnion({ ...stepResult, timestamp: Date.now() }),
          updatedAt: Date.now()
        }, { merge: true });
      }

      if (result.isGoalAchieved) {
        setActiveTask(prev => prev ? { ...prev, status: 'completed' } : null);
        addLog("Goal achieved via visual verification.", "success");
      } else {
        const nextStepIndex = activeTask.currentStepIndex + 1;
        setActiveTask(prev => prev ? {
          ...prev,
          currentStepIndex: nextStepIndex,
          memory: [...prev.memory, stepResult],
          updatedAt: Date.now()
        } : null);
      }

    } catch (error) {
      addLog("Node error. Attempting self-healing recovery.", "warn");
      setActiveTask(prev => prev ? { ...prev, status: 'running' } : null);
    }
  };

  const verifyGoalCompletion = async () => {
    if (!activeTask) return;
    const stateSnapshot = await captureGlobalContext();
    const result = await contextualSurveyAwareness({
      goal: activeTask.prompt,
      memory: activeTask.memory,
      surveyContent: stateSnapshot,
      missionContext: activeTask.missionContext,
    });

    if (result.isGoalAchieved) {
      setActiveTask(prev => prev ? { ...prev, status: 'completed' } : null);
      addLog("Mission Verified Complete.", "success");
    } else {
      addLog("Work remains. Extending loop.", "system");
      const newStep: AutomationStep = {
        id: `dynamic-${Date.now()}`,
        description: `Resolve pending tasks for ${activeTask.prompt}`,
        type: 'navigate',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3
      };
      setActiveTask(prev => prev ? {
        ...prev,
        steps: [...prev.steps, newStep],
        status: 'running'
      } : null);
    }
  };

  const handleStartMission = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    addLog(`Neural Link established...`, "info");
    try {
      const toolsSnap = await getDocs(collection(db, "tools"));
      const sharedToolHostnames = toolsSnap.docs.map(d => d.data().hostname);
      const result = await generateAutomationFromPrompt({ prompt, missionContext: missionId || undefined, sharedToolHostnames });
      let initialStatus: AutomationTask['status'] = 'running';
      if (result.neuralLock.missionId) {
        setMissionId(result.neuralLock.missionId);
        setIsNeuralLocked(true);
        addLog(`Lock: ${result.neuralLock.missionId}`, "system");
      } else if (result.neuralLock.isAmbiguous) {
        initialStatus = 'seeking';
        addLog(`Seeking context...`, "warn");
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
    } catch (error) {
      addLog("Link error.", "warn");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInterventionSubmit = () => {
    if (!activeTask) return;
    addLog(`Operator sync complete. Pattern cached.`, "system");
    
    // Cache the successful pattern if this was a confirmation
    if (activeTask.missionContext && pendingActionData?.successPatternIdentified) {
       const missionRef = doc(db, "missions", activeTask.missionContext);
       setDoc(missionRef, {
         learnedPatterns: arrayUnion({
           actionType: pendingActionData.action,
           successIndicator: pendingActionData.successPatternIdentified,
           confidence: 1.0
         })
       }, { merge: true });
    }

    setActiveTask({
      ...activeTask,
      status: 'running',
      memory: [...activeTask.memory, { step: "NEURAL_OVERRIDE", result: interventionResponse }]
    });
    setIsInterventionOpen(false);
    setInterventionResponse("");
    setPendingActionData(null);
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
        <div 
          className="absolute left-0 top-0 w-1/3 h-full z-0 opacity-10 pointer-events-none hidden md:block"
          style={{
            backgroundImage: `url(${agentPortrait?.imageUrl})`,
            backgroundSize: 'cover',
            maskImage: 'linear-gradient(to right, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, black, transparent)',
          }}
          data-ai-hint="ai agent silhouette"
        />

        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/50 px-4 md:px-6 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-8 w-8" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Nexus Fleet</span>
              <span className="text-[8px] font-medium text-muted-foreground uppercase">Adaptive v6.5</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className={cn(
               "flex items-center gap-2 px-2 py-1 rounded-md border transition-colors",
               isNeuralLocked ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/5"
             )}>
                {isNeuralLocked ? <Lock className="w-2.5 h-2.5 text-primary" /> : <Unlock className="w-2.5 h-2.5 text-muted-foreground" />}
                <span className={cn("text-[9px] font-black uppercase", isNeuralLocked ? "text-primary" : "text-muted-foreground")}>
                  {isNeuralLocked ? `Lock: ${missionId}` : "Neural Open"}
                </span>
             </div>
             <SettingsIcon className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer" />
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-0 z-10 relative p-4 md:p-6 space-y-4">
          <div className="max-w-4xl mx-auto w-full">
            <Card className="p-1 bg-background/60 backdrop-blur-3xl border-white/5 rounded-2xl shadow-2xl ring-1 ring-white/10">
              <div className="flex flex-col sm:flex-row gap-2 p-2">
                <div className="relative group flex-1">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary" />
                  <Input 
                    placeholder="Enter objective (e.g. Complete all assignments)..."
                    className="bg-transparent border-none text-sm h-12 pl-10 focus-visible:ring-0"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStartMission()}
                  />
                </div>
                <Button 
                  onClick={handleStartMission} 
                  disabled={isGenerating || !prompt.trim()} 
                  className="h-10 px-6 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 transition-transform"
                >
                  {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current mr-2" />}
                  {isGenerating ? "Mapping" : "Initiate"}
                </Button>
              </div>
            </Card>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
            <div className="lg:col-span-8 flex flex-col min-h-0">
              <AgentVisualizer 
                steps={activeTask?.steps || []} 
                currentStepIndex={activeTask?.currentStepIndex || 0}
                status={activeTask?.status || 'idle'}
              />
            </div>

            <div className="lg:col-span-4 hidden md:flex flex-col min-h-0 space-y-3">
               <div className="flex items-center gap-2 px-2">
                <Terminal className="w-4 h-4 text-accent" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Persistence Matrix</h3>
              </div>
              <Card className="flex-1 bg-black/40 backdrop-blur-md border-white/5 p-4 rounded-3xl flex flex-col min-h-0 ring-1 ring-white/5">
                 <ScrollArea className="flex-1">
                   <div className="space-y-3">
                     {logs.map((log, i) => (
                       <div key={i} className="flex gap-2 items-start">
                         <div className={cn("w-1 h-3 mt-1 rounded-full shrink-0", log.type === 'success' ? 'bg-accent' : log.type === 'system' ? 'bg-primary' : 'bg-muted-foreground/30')} />
                         <p className={cn("text-[10px] font-mono leading-relaxed", log.type === 'success' ? 'text-accent' : log.type === 'system' ? 'text-primary' : 'text-muted-foreground')}>
                           {log.msg}
                         </p>
                       </div>
                     ))}
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
                <Eye className="w-5 h-5" />
                Adaptive Confirmation
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-xs font-bold italic">"{interventionQuestion}"</p>
              </div>
              <Input 
                placeholder="Guidance (e.g. Yes, that is correct)..."
                className="bg-background/50 border-white/10 text-xs h-12 rounded-xl"
                value={interventionResponse}
                onChange={(e) => setInterventionResponse(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInterventionSubmit()}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleInterventionSubmit} className="w-full bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest py-6 rounded-2xl">
                Confirm & Learn Pattern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </>
  );
}
