
"use client";

import { useState, useEffect, useCallback } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Zap,
  Terminal,
  BrainCircuit,
  Settings as SettingsIcon,
  RefreshCw,
  Sparkles,
  Lock,
  Unlock,
  ChevronRight,
  ShieldCheck,
  History,
  BookOpen,
  Globe,
  Search
} from "lucide-react";
import { AutomationTask, AutomationStep, ExecutionMemory } from "@/lib/types";
import { generateAutomationFromPrompt } from "@/ai/flows/generate-automation-from-prompt";
import { contextualSurveyAwareness } from "@/ai/flows/contextual-survey-awareness";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentVisualizer } from "@/components/automation/visualizer";
import { captureGlobalContext, executeAction } from "@/lib/dom-traversal";
import { cn } from "@/lib/utils";
import { useFirebase, useMemoFirebase, useCollection, initiateAnonymousSignIn } from "@/firebase";
import { doc, setDoc, collection, getDocs, getDoc, arrayUnion } from "firebase/firestore";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NexusControlCenter() {
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [missionId, setMissionId] = useState("");
  const [isNeuralLocked, setIsNeuralLocked] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTask, setActiveTask] = useState<AutomationTask | null>(null);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'warn' | 'success' | 'system'}[]>([]);
  
  const { auth, firestore: db, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  
  const [isInterventionOpen, setIsInterventionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [interventionQuestion, setInterventionQuestion] = useState("");
  const [interventionResponse, setInterventionResponse] = useState("");
  const [pendingActionData, setPendingActionData] = useState<any>(null);
  const [shouldLearnPattern, setShouldLearnPattern] = useState(true);

  const addLog = useCallback((msg: string, type: 'info' | 'warn' | 'success' | 'system' = 'info') => {
    setLogs(prev => [...prev.slice(-30), { msg, type }]);
  }, []);

  useEffect(() => {
    setMounted(true);
    addLog("Nexus Kernel v6.5 Initialized", "system");
  }, [addLog]);

  // Ensure operator is authenticated for Neural Lock access
  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      addLog("Synchronizing Operator Identity...", "system");
      initiateAnonymousSignIn(auth);
    } else if (user) {
      addLog("Operator Identity Synced", "success");
    }
  }, [isUserLoading, user, auth, addLog]);

  useEffect(() => {
    if (activeTask?.status === 'running' || activeTask?.status === 'seeking') {
      const timer = setTimeout(async () => {
        await executeNextStep();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeTask?.status, activeTask?.currentStepIndex]);

  const executeNextStep = async () => {
    if (!activeTask || !user) return;

    const currentStep = activeTask.steps[activeTask.currentStepIndex];
    if (!currentStep) {
       addLog("Verifying Mission Finality...", "system");
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

      if (result.action === 'ASK_USER' && result.confidence < 0.85) {
        setInterventionQuestion(result.parameters.question || "Strategic ambiguity encountered.");
        setPendingActionData(result);
        setIsInterventionOpen(true);
        setActiveTask(prev => prev ? { ...prev, status: 'intervention_required' } : null);
        return;
      }

      if (result.action !== 'ASK_USER' && result.action !== 'WAIT') {
        await executeAction(result.action, result.parameters);
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
        addLog("Objective achieved via visual verification.", "success");
      } else {
        const nextStepIndex = activeTask.currentStepIndex + 1;
        setActiveTask(prev => prev ? {
          ...prev,
          currentStepIndex: nextStepIndex,
          memory: [...prev.memory, stepResult],
          updatedAt: Date.now()
        } : null);
      }

    } catch (error: any) {
      addLog(`Execution Error: ${error.message || "Unknown hurdle"}`, "warn");
      setActiveTask(prev => prev ? { ...prev, status: 'running' } : null);
    }
  };

  const verifyGoalCompletion = async () => {
    if (!activeTask) return;
    try {
      const stateSnapshot = await captureGlobalContext();
      const result = await contextualSurveyAwareness({
        goal: activeTask.prompt,
        memory: activeTask.memory,
        surveyContent: stateSnapshot,
        missionContext: activeTask.missionContext,
      });

      if (result.isGoalAchieved) {
        setActiveTask(prev => prev ? { ...prev, status: 'completed' } : null);
        addLog("Mission Objective Verified: Complete.", "success");
      } else {
        addLog("Incomplete state detected. Extending loop.", "system");
        const newStep: AutomationStep = {
          id: `dynamic-${Date.now()}`,
          description: `Resolve pending tasks for: ${activeTask.prompt}`,
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
    } catch (e) {
      addLog("Verification node timed out.", "warn");
    }
  };

  const handleStartMission = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim() || !user) {
      if (!user) {
        toast({
          variant: "destructive",
          title: "Identity Not Synced",
          description: "Please wait for kernel operator synchronization."
        });
      }
      return;
    }
    setIsGenerating(true);
    addLog(`Initiating Tactical Neural Link...`, "info");
    try {
      const toolsSnap = await getDocs(collection(db, "tools"));
      const sharedToolHostnames = toolsSnap.docs.map(d => d.data().hostname);
      const result = await generateAutomationFromPrompt({ prompt: finalPrompt, missionContext: missionId || undefined, sharedToolHostnames });
      
      let initialStatus: AutomationTask['status'] = 'running';
      if (result.neuralLock.missionId) {
        setMissionId(result.neuralLock.missionId);
        setIsNeuralLocked(true);
        addLog(`Neural Lock established: ${result.neuralLock.missionId}`, "system");
      } else if (result.neuralLock.isAmbiguous) {
        initialStatus = 'seeking';
        addLog(`Seeking environment context...`, "warn");
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
        prompt: finalPrompt,
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
    } catch (error: any) {
      addLog(`Neural link failure: ${error.message || "Connection refused"}`, "warn");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInterventionSubmit = () => {
    if (!activeTask) return;
    
    if (shouldLearnPattern && activeTask.missionContext && pendingActionData?.successPatternIdentified) {
       addLog(`Caching Neural Pattern: ${pendingActionData.successPatternIdentified}`, "success");
       const missionRef = doc(db, "missions", activeTask.missionContext);
       setDoc(missionRef, {
         learnedPatterns: arrayUnion({
           actionType: pendingActionData.action,
           successIndicator: pendingActionData.successPatternIdentified,
           confidence: 1.0
         })
       }, { merge: true });
    }

    addLog(`Operator override synced. Resuming...`, "system");
    setActiveTask({
      ...activeTask,
      status: 'running',
      memory: [...activeTask.memory, { step: "OPERATOR_SYNC", result: interventionResponse }]
    });
    setIsInterventionOpen(false);
    setInterventionResponse("");
    setPendingActionData(null);
  };

  const quickStarts = [
    { label: "Scan Capella for assignments", prompt: "Scan Capella Courseroom for all pending assignments", icon: BookOpen },
    { label: "Complete SWK-2400 Week 3", prompt: "Complete all Week 3 requirements for course SWK-2400", icon: Search },
    { label: "Resolve active hurdles", prompt: "Scan dashboard for any tasks requiring immediate intervention", icon: Globe }
  ];

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
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      <SidebarInset className="bg-background flex flex-col h-screen relative overflow-hidden">
        {/* Background Fade Portrait */}
        <div 
          className="absolute left-0 top-0 w-full md:w-1/2 h-full z-0 opacity-5 pointer-events-none transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${agentPortrait?.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'left center',
            maskImage: 'linear-gradient(to right, black 20%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, black 20%, transparent)',
          }}
          data-ai-hint="ai agent silhouette"
        />

        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/50 px-4 md:px-6 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-8 w-8" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Nexus Fleet</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                <span className="text-[8px] font-medium text-muted-foreground uppercase">Adaptive v6.5 Active</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className={cn(
               "flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all duration-500",
               isNeuralLocked ? "bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(0,100,255,0.1)]" : "bg-white/5 border-white/5"
             )}>
                {isNeuralLocked ? <Lock className="w-2.5 h-2.5 text-primary" /> : <Unlock className="w-2.5 h-2.5 text-muted-foreground" />}
                <span className={cn("text-[9px] font-black uppercase tracking-tighter", isNeuralLocked ? "text-primary" : "text-muted-foreground")}>
                  {isNeuralLocked ? `Lock: ${missionId}` : "Neural Open"}
                </span>
             </div>
             <div 
              className="p-2 hover:bg-white/5 rounded-full transition-all cursor-pointer group"
              onClick={() => setIsSettingsOpen(true)}
             >
                <SettingsIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
             </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-0 z-10 relative p-4 md:p-6 space-y-6">
          <div className="max-w-4xl mx-auto w-full space-y-4">
            <Card className="p-1.5 bg-black/40 backdrop-blur-3xl border-white/10 rounded-2xl shadow-2xl ring-1 ring-white/10 group transition-all duration-300 hover:ring-primary/20">
              <div className="flex flex-col sm:flex-row gap-2 p-2">
                <div className="relative flex-1">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="Enter Tactical Objective (e.g. Complete Week 3 for SWK-2400)..."
                    className="bg-transparent border-none text-sm h-12 pl-10 focus-visible:ring-0 placeholder:text-muted-foreground/40"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStartMission()}
                  />
                </div>
                <Button 
                  onClick={() => handleStartMission()} 
                  disabled={isGenerating || !prompt.trim() || !user} 
                  className="h-12 px-8 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                  {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current mr-2" />}
                  {isGenerating ? "Mapping" : "Initiate"}
                </Button>
              </div>
            </Card>

            <div className="flex flex-wrap gap-2 px-2">
               {quickStarts.map((start, i) => (
                 <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartMission(start.prompt)}
                  disabled={isGenerating || !user}
                  className="h-8 bg-white/5 border-white/5 hover:bg-white/10 hover:border-primary/30 text-[9px] font-black uppercase tracking-widest rounded-lg px-4 gap-2 transition-all"
                 >
                   <start.icon className="w-3 h-3 text-primary/60" />
                   {start.label}
                 </Button>
               ))}
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
            <div className="lg:col-span-8 flex flex-col min-h-0">
              <Tabs defaultValue="matrix" className="flex-1 flex flex-col min-h-0">
                <TabsList className="bg-white/5 border-white/5 p-1 mb-4 inline-flex w-fit">
                  <TabsTrigger value="matrix" className="text-[10px] font-black uppercase tracking-widest">Operation Matrix</TabsTrigger>
                  <TabsTrigger value="history" className="text-[10px] font-black uppercase tracking-widest">Mission Registry</TabsTrigger>
                </TabsList>
                <TabsContent value="matrix" className="flex-1 min-h-0 mt-0">
                  <AgentVisualizer 
                    steps={activeTask?.steps || []} 
                    currentStepIndex={activeTask?.currentStepIndex || 0}
                    status={activeTask?.status || 'idle'}
                    onReorder={(newSteps) => setActiveTask(prev => prev ? { ...prev, steps: newSteps } : null)}
                  />
                </TabsContent>
                <TabsContent value="history" className="flex-1 min-h-0 mt-0">
                  {user && !isUserLoading ? <PersistenceRegistry /> : (
                    <div className="flex flex-col items-center justify-center h-full opacity-20">
                      <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                      <p className="text-[10px] font-black uppercase">Syncing Persistence Matrix...</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <div className="lg:col-span-4 hidden md:flex flex-col min-h-0 space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-accent" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Persistence Matrix</h3>
                </div>
                <ShieldCheck className="w-3.5 h-3.5 text-primary opacity-40" />
              </div>
              <Card className="flex-1 bg-black/60 backdrop-blur-md border-white/5 p-4 rounded-3xl flex flex-col min-h-0 ring-1 ring-white/5 shadow-inner">
                 <ScrollArea className="flex-1">
                   <div className="space-y-4">
                     {logs.map((log, i) => (
                       <div key={i} className="flex gap-3 items-start animate-in fade-in slide-in-from-left-2 duration-300">
                         <div className={cn(
                           "w-1 h-3 mt-1 rounded-full shrink-0", 
                           log.type === 'success' ? 'bg-accent' : 
                           log.type === 'system' ? 'bg-primary' : 
                           log.type === 'warn' ? 'bg-destructive' : 'bg-muted-foreground/30'
                         )} />
                         <p className={cn(
                           "text-[10px] font-mono leading-relaxed tracking-tight", 
                           log.type === 'success' ? 'text-accent' : 
                           log.type === 'system' ? 'text-primary' : 
                           log.type === 'warn' ? 'text-destructive/80' : 'text-muted-foreground'
                         )}>
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
          <DialogContent className="bg-background/95 border-primary/20 backdrop-blur-3xl max-w-md rounded-3xl p-8 ring-1 ring-primary/20 shadow-2xl">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-primary font-black uppercase tracking-widest text-xs flex items-center gap-3">
                <BrainCircuit className="w-5 h-5" />
                Operator Sync Required
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-8">
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 shadow-inner">
                <p className="text-xs font-bold leading-relaxed opacity-90 italic">"{interventionQuestion}"</p>
              </div>
              
              <div className="space-y-4">
                <Input 
                  placeholder="Neural Guidance (e.g. Yes, that is correct)..."
                  className="bg-black/20 border-white/10 text-xs h-14 rounded-2xl px-5 focus-visible:ring-primary/30"
                  value={interventionResponse}
                  onChange={(e) => setInterventionResponse(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInterventionSubmit()}
                />
                
                <div className="flex items-center space-x-3 px-1">
                  <Checkbox 
                    id="learn-pattern" 
                    checked={shouldLearnPattern} 
                    onCheckedChange={(val) => setShouldLearnPattern(!!val)}
                    className="border-primary/40 data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="learn-pattern" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    Lock Response & Cache Success Pattern
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-8">
              <Button onClick={handleInterventionSubmit} className="w-full bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest py-7 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20">
                Confirm & Resynchronize
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      </SidebarInset>
    </>
  );
}

function PersistenceRegistry() {
  const { firestore: db, user, isUserLoading } = useFirebase();
  
  const missionsRef = useMemoFirebase(() => {
    if (isUserLoading || !user || !db) return null;
    return collection(db, "missions");
  }, [db, user, isUserLoading]);
  
  const { data: missions, isLoading } = useCollection<any>(missionsRef);
  
  return (
    <Card className="flex-1 bg-black/40 backdrop-blur-md border-white/5 p-6 rounded-3xl flex flex-col min-h-0 overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <History className="w-4 h-4 text-primary" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Mission Registry</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {missions?.map((mission: any) => (
            <div key={mission.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between hover:border-primary/20 transition-all group">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-primary uppercase">{mission.missionId}</span>
                <span className="text-[9px] text-muted-foreground">Updated {new Date(mission.updatedAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-accent/10 px-2 py-1 rounded-lg border border-accent/20">
                  <span className="text-[8px] font-black text-accent uppercase">{mission.memory?.length || 0} Nodes Synced</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
          {!missions?.length && !isLoading && !isUserLoading && (
             <div className="py-20 flex flex-col items-center justify-center opacity-20 border-2 border-dashed rounded-3xl border-white/5">
                <Terminal className="w-12 h-12 mb-4" />
                <p className="text-[10px] font-black uppercase">No persisted missions found</p>
             </div>
          )}
          {(isLoading || isUserLoading) && (
            <div className="flex justify-center p-10">
              <RefreshCw className="w-5 h-5 animate-spin text-primary/40" />
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
