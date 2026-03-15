
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
  Cloud
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
import { useFirebase, useUser, useDoc, useCollection } from "@/firebase";
import { doc, setDoc, serverTimestamp, collection, getDocs, query, where } from "firebase/firestore";
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTask, setActiveTask] = useState<AutomationTask | null>(null);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'warn' | 'success' | 'system'}[]>([]);
  const [geoStatus, setGeoStatus] = useState({ ip: "192.168.1.1", mode: 'persistent' });
  
  const { user } = useUser();
  const { db } = useFirebase();
  const { toast } = useToast();
  
  const [isInterventionOpen, setIsInterventionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [interventionQuery, setInterventionQuery] = useState("");
  const [interventionResponse, setInterventionResponse] = useState("");

  const addLog = useCallback((msg: string, type: 'info' | 'warn' | 'success' | 'system' = 'info') => {
    setLogs(prev => [...prev.slice(-100), { msg, type }]);
  }, []);

  const runFleetSync = useCallback(async (isSilent = false) => {
    setIsSyncing(true);
    if (!isSilent) addLog("Fleet Traversal initiated...", "system");
    try {
      const globalContent = await captureGlobalContext();
      if (!isSilent) addLog(`Fleet Unified.`, "success");
      return globalContent;
    } finally {
      setIsSyncing(false);
    }
  }, [addLog]);

  useEffect(() => {
    setMounted(true);
    addLog("Nexus_OS v4.2 Initialized", "success");
  }, [addLog]);

  const handleStartAutomation = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    addLog(`Synthesizing Persistence Strategy...`, "info");
    
    try {
      // 1. Get Shared Tools from Firestore
      const toolsSnap = await getDocs(collection(db, "tools"));
      const sharedToolHostnames = toolsSnap.docs.map(d => d.data().hostname);

      // 2. Generate Plan with AI
      const result = await generateAutomationFromPrompt({ 
        prompt, 
        sharedToolHostnames 
      });

      // 3. Persistent Tool Classification
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
      };

      setActiveTask(newTask);
      setPrompt("");
      addLog(`Mission Synced to Firestore.`, "success");
    } catch (error) {
      addLog("Synthesis failed", "warn");
    } finally {
      setIsGenerating(false);
    }
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
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      <SidebarInset className="bg-black max-w-full overflow-hidden flex flex-col h-screen scanline relative">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-black/40 px-4 backdrop-blur-2xl z-20">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-8 w-8 text-primary" />
            <h2 className="text-[10px] font-black uppercase text-primary tracking-widest">Nexus_v4.2</h2>
          </div>
          <div className="flex items-center gap-2">
             <Cloud className="w-3 h-3 text-accent animate-pulse" />
             <span className="text-[8px] font-black text-accent">SYNC_ACTIVE</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4 z-10">
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-3 bg-white/[0.03] border-white/5 rounded-xl flex items-center gap-2">
              <Database className="w-3 h-3 text-primary" />
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-muted-foreground uppercase">Persistence</span>
                <span className="text-[9px] font-bold text-primary">FIRESTORE_LINKED</span>
              </div>
            </Card>

            <Card className="p-3 bg-white/[0.03] border-white/5 rounded-xl flex items-center gap-2">
              <BrainCircuit className="w-3 h-3 text-accent" />
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-muted-foreground uppercase">Memory</span>
                <span className="text-[9px] font-bold text-accent">MULTI_CONTEXT</span>
              </div>
            </Card>
          </div>

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-accent/30 rounded-xl blur opacity-20" />
            <div className="relative bg-black/60 border border-white/10 p-2 rounded-xl flex gap-2">
              <Input 
                placeholder="Inject mission parameters..."
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

          <div className="flex flex-col min-h-0 space-y-4 pb-20">
            <AgentVisualizer 
              steps={activeTask?.steps || []} 
              currentStepIndex={activeTask?.currentStepIndex || 0}
              status={activeTask?.status || 'idle'}
            />

            <Card className="bg-black/40 border-white/5 p-4 rounded-2xl">
               <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-3.5 h-3.5 text-accent animate-pulse" />
                  <span className="text-[8px] font-black text-accent uppercase tracking-widest">Real-time Persistence Stream</span>
               </div>
               <p className="text-[10px] font-bold text-foreground/80 leading-relaxed min-h-[40px]">
                {logs[logs.length - 1]?.msg || "System standby. Firestore connected."}
               </p>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
