"use client";

import { useState, useEffect, useCallback } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Zap,
  Activity,
  Layers,
  Database,
  Cloud,
  Terminal,
  BrainCircuit,
  Settings as SettingsIcon,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle
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
import { useFirebase, useUser } from "@/firebase";
import { doc, setDoc, collection, getDocs, getDoc, arrayUnion } from "firebase/firestore";
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
    setLogs(prev => [...prev.slice(-50), { msg, type }]);
  }, []);

  useEffect(() => {
    setMounted(true);
    addLog("Nexus Kernel v4.5 Live", "system");
  }, [addLog]);

  // Agent Loop Execution
  useEffect(() => {
    if (activeTask?.status === 'running') {
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
       addLog("Mission parameters fulfilled.", "success");
       return;
    }

    try {
      addLog(`Analyzing: ${currentStep.description}`, "info");
      const stateSnapshot = await captureGlobalContext();
      
      // Fetch Progressive Continuity Memory
      let missionMemory: ExecutionMemory[] = activeTask.memory;
      if (activeTask.missionContext) {
        const missionRef = doc(db, "missions", activeTask.missionContext);
        const missionSnap = await getDoc(missionRef);
        if (missionSnap.exists()) {
          const cloudMemory = missionSnap.data().memory || [];
          missionMemory = [...cloudMemory, ...activeTask.memory];
        }
      }

      // Identify Shared Platform Tools
      const currentHost = "campus.capella.edu"; // Mocked for extension context
      const toolRef = doc(db, "tools", currentHost.replace(/\./g, '_'));
      const toolSnap = await getDoc(toolRef);
      const platformContext = toolSnap.exists() ? currentHost : undefined;

      const result = await contextualSurveyAwareness({
        goal: activeTask.prompt,
        memory: missionMemory,
        surveyContent: stateSnapshot,
        missionContext: activeTask.missionContext,
        platformContext
      });

      if (result.action === 'ASK_USER') {
        setInterventionQuestion(result.parameters.question || "Operator input required.");
        setIsInterventionOpen(true);
        setActiveTask(prev => prev ? { ...prev, status: 'intervention_required' } : null);
        return;
      }

      // Update State & Persistence
      const nextStepIndex = activeTask.currentStepIndex + 1;
      const stepResult: ExecutionMemory = { 
        step: currentStep.description, 
        result: `Completed: ${result.action}` 
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

      addLog(`Step achieved: ${result.action}`, "success");

    } catch (error) {
      addLog("Interruption detected. Retrying loop...", "warn");
    }
  };

  const handleStartMission = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    addLog(`Synthesizing strategy for ${missionId || 'Global Context'}...`, "info");
    
    try {
      const toolsSnap = await getDocs(collection(db, "tools"));
      const sharedToolHostnames = toolsSnap.docs.map(d => d.data().hostname);

      const result = await generateAutomationFromPrompt({ 
        prompt, 
        missionContext: missionId,
        sharedToolHostnames 
      });

      // Persistent Tool Learning
      result.classifiedPlatforms.forEach(p => {
        if (p.type === 'shared_tool') {
          const toolRef = doc(db, "tools", p.hostname.replace(/\./g, '_'));
          setDoc(toolRef, { hostname: p.hostname, isShared: true }, { merge: true });
          addLog(`New shared tool classified: ${p.hostname}`, "system");
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
        missionContext: missionId
      });
      
      setPrompt("");
      addLog(`Mission Live. Progressive continuity enabled.`, "success");
    } catch (error) {
      addLog("Synthesis failure. Check network kernel.", "warn");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInterventionSubmit = () => {
    if (!activeTask) return;
    addLog(`Operator override: ${interventionResponse}`, "system");
    setActiveTask({
      ...activeTask,
      status: 'running',
      memory: [...activeTask.memory, { step: "OPERATOR_LINK", result: interventionResponse }]
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
      
      <SidebarInset className="bg-background flex flex-col h-screen relative overflow-hidden">
        {/* Header - Practical & Streamlined */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card/50 px-6 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-8 w-8" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-primary">Nexus Fleet</span>
              <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
              <span className="text-[10px] font-medium text-muted-foreground">v4.5.2</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent/10 border border-accent/20">
                <Cloud className="w-3 h-3 text-accent" />
                <span className="text-[9px] font-black text-accent uppercase">Persistence Sync</span>
             </div>
             <SettingsIcon className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 pb-24">
          {/* Mission Config Area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2 p-1 bg-white/[0.02] border-white/5 rounded-xl shadow-2xl">
              <div className="flex flex-col p-3 gap-3">
                <div className="flex gap-2">
                  <div className="w-1/3 relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Mission Context ID..."
                      className="bg-background/50 border-white/5 text-xs h-10 pl-9 font-mono focus:ring-1"
                      value={missionId}
                      onChange={(e) => setMissionId(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Enter tactical objectives..."
                      className="bg-background/50 border-white/5 text-xs h-10 pl-9 focus:ring-1"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleStartMission()}
                    />
                  </div>
                  <Button 
                    onClick={handleStartMission} 
                    disabled={isGenerating} 
                    className="h-10 px-6 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest"
                  >
                    {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current mr-2" />}
                    {isGenerating ? "Synthesizing" : "Inject"}
                  </Button>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
              <Card className="p-3 bg-white/[0.02] border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Database className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-muted-foreground uppercase">Persistence Mode</span>
                  <span className="text-[10px] font-bold text-foreground">Progressive Continuity</span>
                </div>
              </Card>
              <Card className="p-3 bg-white/[0.02] border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <BrainCircuit className="w-4 h-4 text-accent" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-muted-foreground uppercase">Reasoning Engine</span>
                  <span className="text-[10px] font-bold text-foreground">Flash 3.0 Experimental</span>
                </div>
              </Card>
            </div>
          </div>

          {/* Execution & Visualizer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary animate-pulse" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Operation Matrix</h3>
                </div>
                {activeTask && (
                   <span className="text-[9px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                     {activeTask.status.toUpperCase()}
                   </span>
                )}
              </div>
              <AgentVisualizer 
                steps={activeTask?.steps || []} 
                currentStepIndex={activeTask?.currentStepIndex || 0}
                status={activeTask?.status || 'idle'}
              />
            </div>

            <div className="space-y-4 flex flex-col h-full">
              <div className="flex items-center gap-2 px-2">
                <Terminal className="w-4 h-4 text-accent" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Persistence Stream</h3>
              </div>
              <Card className="flex-1 bg-black/40 border-white/5 p-4 rounded-xl flex flex-col min-h-[300px]">
                 <ScrollArea className="flex-1">
                   <div className="space-y-2">
                     {logs.map((log, i) => (
                       <div key={i} className="flex gap-3 items-start animate-in fade-in slide-in-from-left-1">
                         <div className={cn(
                           "w-1 h-3 mt-0.5 rounded-full shrink-0",
                           log.type === 'success' ? 'bg-accent' : 
                           log.type === 'warn' ? 'bg-destructive' : 
                           log.type === 'system' ? 'bg-primary' : 'bg-muted-foreground/30'
                         )} />
                         <p className={cn(
                           "text-[10px] font-mono leading-tight",
                           log.type === 'success' ? 'text-accent' : 
                           log.type === 'warn' ? 'text-destructive' : 
                           log.type === 'system' ? 'text-primary' : 'text-muted-foreground'
                         )}>
                           {log.msg}
                         </p>
                       </div>
                     ))}
                     {logs.length === 0 && (
                       <div className="flex flex-col items-center justify-center h-48 opacity-20">
                         <Cloud className="w-12 h-12 mb-4" />
                         <p className="text-[10px] font-mono uppercase tracking-widest">Link Standby</p>
                       </div>
                     )}
                   </div>
                 </ScrollArea>
              </Card>
            </div>
          </div>
        </main>

        {/* Operator Link Modal */}
        <Dialog open={isInterventionOpen} onOpenChange={setIsInterventionOpen}>
          <DialogContent className="bg-card border-primary/20 backdrop-blur-3xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-primary font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <BrainCircuit className="w-5 h-5" />
                Operator Neural Link
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                <span className="text-[8px] font-black text-primary uppercase">Agent Feedback</span>
                <p className="text-xs font-bold text-foreground leading-relaxed italic">
                  "{interventionQuestion}"
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-[8px] font-black text-muted-foreground uppercase">Injection Response</span>
                <Input 
                  placeholder="Resolve tactical ambiguity..."
                  className="bg-background border-white/10 text-xs h-12"
                  value={interventionResponse}
                  onChange={(e) => setInterventionResponse(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInterventionSubmit()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleInterventionSubmit} className="w-full bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest py-6">
                Inject Instruction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </>
  );
}