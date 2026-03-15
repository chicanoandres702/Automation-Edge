
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
  Search,
  Cloud,
  Layers,
  Sparkles
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
    addLog("Nexus Kernel v5.0 Initialized", "system");
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
       addLog("All objectives fulfilled.", "success");
       return;
    }

    try {
      addLog(`Executing: ${currentStep.description}`, "info");
      const stateSnapshot = await captureGlobalContext();
      
      let missionMemory: ExecutionMemory[] = activeTask.memory;
      if (activeTask.missionContext) {
        const missionRef = doc(db, "missions", activeTask.missionContext);
        const missionSnap = await getDoc(missionRef);
        if (missionSnap.exists()) {
          const cloudMemory = missionSnap.data().memory || [];
          missionMemory = [...cloudMemory, ...activeTask.memory];
        }
      }

      const result = await contextualSurveyAwareness({
        goal: activeTask.prompt,
        memory: missionMemory,
        surveyContent: stateSnapshot,
        missionContext: activeTask.missionContext,
      });

      if (result.action === 'ASK_USER') {
        setInterventionQuestion(result.parameters.question || "Strategic input required.");
        setIsInterventionOpen(true);
        setActiveTask(prev => prev ? { ...prev, status: 'intervention_required' } : null);
        return;
      }

      const nextStepIndex = activeTask.currentStepIndex + 1;
      const stepResult: ExecutionMemory = { 
        step: currentStep.description, 
        result: `Action ${result.action} Verified` 
      };

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

      addLog(`Node Sync: ${result.action}`, "success");

    } catch (error) {
      addLog("Stream interrupted. Recovering...", "warn");
    }
  };

  const handleStartMission = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    addLog(`AI Parsing tactical objective...`, "info");
    
    try {
      const toolsSnap = await getDocs(collection(db, "tools"));
      const sharedToolHostnames = toolsSnap.docs.map(d => d.data().hostname);

      const result = await generateAutomationFromPrompt({ 
        prompt, 
        missionContext: missionId || undefined,
        sharedToolHostnames 
      });

      // AI Context Extraction - Try to detect context ID from result or prompt
      const detectedMission = result.classifiedPlatforms.find(p => p.type === 'mission_specific')?.reason.match(/[A-Z]{2,}-\d{4}/)?.[0] || missionId;
      if (detectedMission && !missionId) {
        setMissionId(detectedMission);
        addLog(`AI context lock: ${detectedMission}`, "system");
      }

      const now = Date.now();
      const newSteps: AutomationStep[] = result.workflowSteps.map((s, idx) => ({
        id: `step-${now}-${idx}`,
        description: s,
        type: 'wait',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3
      }));

      setActiveTask({
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
        missionContext: detectedMission || missionId
      });
      
      setPrompt("");
      addLog(`Mission Live. Knowledge siloing active.`, "success");
    } catch (error) {
      addLog("Synthesis failed. Kernel offline.", "warn");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInterventionSubmit = () => {
    if (!activeTask) return;
    addLog(`Neural injection received.`, "system");
    setActiveTask({
      ...activeTask,
      status: 'running',
      memory: [...activeTask.memory, { step: "OPERATOR_OVERRIDE", result: interventionResponse }]
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
        onStop={() => setActiveTask(null)}
        onStep={() => {}}
        manualMode={false}
        onToggleManual={() => {}}
      />
      
      <SidebarInset className="bg-background flex flex-col h-screen relative overflow-hidden">
        {/* Cinematic Portrait Background - Left Aligned & Faded */}
        <div 
          className="absolute left-0 top-0 w-1/2 h-full z-0 opacity-20 pointer-events-none transition-opacity duration-1000 hidden lg:block"
          style={{
            backgroundImage: `url(${agentPortrait?.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'left center',
            maskImage: 'linear-gradient(to right, black 40%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 40%, transparent 100%)',
          }}
          data-ai-hint="holographic ai portrait"
        />

        {/* Streamlined Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/50 px-4 md:px-6 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-8 w-8" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Nexus Fleet</span>
              <span className="text-[8px] font-medium text-muted-foreground uppercase">Autonomy Active</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-md bg-accent/5 border border-accent/10">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[9px] font-black text-accent uppercase">Link Stable</span>
             </div>
             <SettingsIcon className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-0 z-10 relative">
          {/* Mission Injection - Streamlined & AI-first */}
          <div className="p-4 md:p-6 pb-2 space-y-4">
            <div className="max-w-4xl mx-auto w-full">
              <Card className="p-1 bg-background/60 backdrop-blur-md border-white/5 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex flex-col md:flex-row gap-2 p-2">
                  <div className="relative group flex-1">
                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="Input mission objectives (e.g. Finish SWK-2400 assignment)..."
                      className="bg-transparent border-none text-sm h-12 pl-10 focus-visible:ring-0 focus-visible:ring-offset-0"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleStartMission()}
                    />
                  </div>
                  <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-white/5 pt-2 md:pt-0 md:pl-2">
                    <div className="relative w-32 hidden sm:block">
                      <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                      <Input 
                        placeholder="Context ID"
                        className="bg-transparent border-none text-[10px] h-10 pl-8 font-mono focus-visible:ring-0"
                        value={missionId}
                        onChange={(e) => setMissionId(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={handleStartMission} 
                      disabled={isGenerating || !prompt.trim()} 
                      className="h-10 px-6 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 transition-transform"
                    >
                      {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current mr-2" />}
                      {isGenerating ? "Syncing" : "Deploy"}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Core Telemetry Display - Optimized for Mobile */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6 p-4 md:p-6 pt-0">
            {/* Task Manager (Operation Matrix) - Largest Element */}
            <div className="lg:col-span-8 flex flex-col min-h-0 space-y-3">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Operation Matrix</h3>
                </div>
                {activeTask && (
                   <div className="flex items-center gap-2">
                     <span className="text-[8px] font-bold text-muted-foreground uppercase">Context:</span>
                     <span className="text-[9px] font-black text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                       {activeTask.missionContext || 'Global'}
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

            {/* Persistence Logs - Streamlined */}
            <div className="lg:col-span-4 hidden md:flex flex-col min-h-0 space-y-3">
              <div className="flex items-center gap-2 px-2">
                <Terminal className="w-4 h-4 text-accent" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Kernel Stream</h3>
              </div>
              <Card className="flex-1 bg-black/40 backdrop-blur-md border-white/5 p-4 rounded-2xl flex flex-col min-h-0">
                 <ScrollArea className="flex-1">
                   <div className="space-y-3">
                     {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20">
                          <Cloud className="w-10 h-10 mb-4" />
                          <p className="text-[10px] font-mono uppercase tracking-widest text-center">Standby for<br/>Link established</p>
                        </div>
                     ) : (
                       logs.map((log, i) => (
                         <div key={i} className="flex gap-3 items-start animate-in fade-in slide-in-from-left-1">
                           <div className={cn(
                             "w-1 h-3 mt-1 rounded-full shrink-0",
                             log.type === 'success' ? 'bg-accent' : 
                             log.type === 'warn' ? 'bg-destructive' : 
                             log.type === 'system' ? 'bg-primary' : 'bg-muted-foreground/30'
                           )} />
                           <p className={cn(
                             "text-[10px] font-mono leading-relaxed",
                             log.type === 'success' ? 'text-accent' : 
                             log.type === 'warn' ? 'text-destructive' : 
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

        {/* Neural Link Modal */}
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
                <span className="text-[8px] font-black text-primary uppercase">Agent Query</span>
                <p className="text-xs font-bold text-foreground leading-relaxed italic">
                  "{interventionQuestion}"
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-[8px] font-black text-muted-foreground uppercase">Override Instruction</span>
                <Input 
                  placeholder="Resolve ambiguity..."
                  className="bg-background/50 border-white/10 text-xs h-12 rounded-xl focus:ring-1"
                  value={interventionResponse}
                  onChange={(e) => setInterventionResponse(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInterventionSubmit()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleInterventionSubmit} className="w-full bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest py-6 rounded-2xl">
                Inject Strategic Guidance
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </>
  );
}
