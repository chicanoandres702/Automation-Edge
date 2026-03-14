"use client";

import { useState, useEffect, useCallback } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  Globe, 
  ShieldCheck, 
  RefreshCw, 
  Terminal, 
  Layers, 
  Cpu,
  Zap,
  Monitor,
  Layout,
  Wifi,
  MapPin,
  Lock
} from "lucide-react";
import { AutomationTask, AutomationStep, ActionType } from "@/lib/types";
import { generateAutomationFromPrompt } from "@/ai/flows/generate-automation-from-prompt";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { captureGlobalContext } from "@/lib/dom-traversal";
import { cn } from "@/lib/utils";

export default function FleetNexusPage() {
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTask, setActiveTask] = useState<AutomationTask | null>(null);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'warn' | 'success' | 'system'}[]>([]);
  const [geoStatus, setGeoStatus] = useState({ ip: "Initializing...", location: "Locating...", status: "pending" });
  const { toast } = useToast();

  const addLog = useCallback((msg: string, type: 'info' | 'warn' | 'success' | 'system' = 'info') => {
    setLogs(prev => [...prev.slice(-40), { msg, type }]);
  }, []);

  const runGeoIdSync = useCallback(async () => {
    setGeoStatus(prev => ({ ...prev, status: 'pending' }));
    addLog("Rotational IP Proxy: Cycling Geolocation...", "system");
    
    // Simulate real Geo-ID acquisition
    await new Promise(r => setTimeout(r, 1200));
    
    const mockGeo = {
      ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      location: "San Francisco, US (Proxy)",
      status: "active"
    };
    
    setGeoStatus(mockGeo);
    addLog(`Identity Masked: [${mockGeo.ip}] via ${mockGeo.location}`, "success");
  }, [addLog]);

  const runFleetSync = useCallback(async (isSilent = false) => {
    setIsSyncing(true);
    if (!isSilent) addLog("Initiating Fleet-wide DOM Traversal...", "system");
    
    try {
      const globalContent = await captureGlobalContext();
      await new Promise(r => setTimeout(r, 1000));
      
      const tabCount = (globalContent.match(/TAB:/g) || []).length;
      const frameCount = (globalContent.match(/Frame/g) || []).length;

      addLog(`Fleet Unified: ${tabCount} Tabs, ${frameCount} Interaction Points mapped.`, "success");
    } catch (error) {
      addLog("Fleet Sync Error: Access restricted", "warn");
    } finally {
      setIsSyncing(false);
    }
  }, [addLog]);

  useEffect(() => {
    setMounted(true);
    addLog("Cyber-Nexus OS v4.2 Loaded", "success");
    
    // Automatic Initialization
    const init = async () => {
      await runGeoIdSync();
      await runFleetSync(true);
    };
    init();
  }, [addLog, runGeoIdSync, runFleetSync]);

  const mapActionType = (desc: string): ActionType => {
    const d = desc.toLowerCase();
    if (d.includes('type') || d.includes('fill')) return 'type';
    if (d.includes('click') || d.includes('press')) return 'click';
    if (d.includes('scroll')) return 'scroll';
    if (d.includes('navigate') || d.includes('go to')) return 'navigate';
    if (d.includes('switch') || d.includes('tab')) return 'switch-tab';
    return 'extract';
  };

  const handleStartAutomation = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    addLog(`Pre-flight: Re-syncing Fleet and Identity...`, "system");
    
    // Auto-sync before task
    await Promise.all([runGeoIdSync(), runFleetSync(true)]);
    
    addLog(`Synthesizing objective: "${prompt}"`, "info");
    
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
        status: 'running',
        steps: newSteps,
        currentStepIndex: 0,
        observedTabs: [],
        createdAt: now,
        updatedAt: now
      };

      setActiveTask(newTask);
      setPrompt("");
      addLog("Mission plan locked. Initializing execution...", "success");
    } catch (error) {
      addLog("Synthesis failed: LLM context error", "warn");
    } finally {
      setIsGenerating(false);
    }
  };

  // Execution Simulation
  useEffect(() => {
    if (activeTask && activeTask.status === 'running') {
      const timer = setTimeout(() => {
        if (activeTask.currentStepIndex < activeTask.steps.length - 1) {
          setActiveTask(prev => {
            if (!prev) return null;
            const newIndex = prev.currentStepIndex + 1;
            addLog(`Executing Step ${newIndex + 1}: ${prev.steps[newIndex].description}`, "info");
            return { ...prev, currentStepIndex: newIndex, updatedAt: Date.now() };
          });
        } else {
          setActiveTask({ ...activeTask, status: 'completed' as const });
          addLog("All Fleet Objectives Completed.", "success");
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeTask?.currentStepIndex, activeTask?.status, addLog]);

  if (!mounted) return null;

  return (
    <>
      <AppSidebar 
        activeTask={activeTask}
        onStart={() => activeTask && setActiveTask({...activeTask, status: 'running'})}
        onPause={() => activeTask && setActiveTask({...activeTask, status: 'paused'})}
        onStop={() => {
          setActiveTask(null);
          addLog("Operation aborted by user.", "warn");
        }}
      />
      
      <SidebarInset className="bg-background max-w-full overflow-hidden flex flex-col h-screen scanline relative">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/5 bg-background/50 px-4 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-9 w-9 text-primary hover:bg-primary/10 rounded-lg transition-colors" />
            <div className="flex flex-col">
              <h2 className="text-[10px] font-black tracking-[0.4em] uppercase text-primary">Cyber-Nexus</h2>
              <span className="text-[8px] font-mono text-muted-foreground">AGI_SIDEBAR_v4.2</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5 px-2 py-1 bg-accent/10 border border-accent/20 rounded-md">
               <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
               <span className="text-[8px] font-black text-accent uppercase tracking-wider">Secure</span>
             </div>
             <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex flex-col p-4 space-y-4 z-10">
          {/* Automated Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors group">
              <div className="flex items-center gap-2 mb-2">
                <Wifi className={cn("w-3 h-3 text-primary", isSyncing && "animate-pulse")} />
                <span className="text-[8px] font-black text-primary uppercase tracking-widest">Fleet Link</span>
              </div>
              <div className="text-[11px] font-bold text-foreground/90 truncate">
                {isSyncing ? "Syncing..." : "Fleet Unified"}
              </div>
              <div className="text-[8px] text-muted-foreground font-mono mt-1">
                Last Sync: {new Date().toLocaleTimeString()}
              </div>
            </Card>

            <Card className="p-3 border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors group">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-3 h-3 text-accent" />
                <span className="text-[8px] font-black text-accent uppercase tracking-widest">Geo-ID</span>
              </div>
              <div className="text-[11px] font-bold text-foreground/90 truncate">
                {geoStatus.ip}
              </div>
              <div className="text-[8px] text-muted-foreground font-mono mt-1">
                {geoStatus.location}
              </div>
            </Card>
          </div>

          {/* Prompt Entry */}
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-xl blur opacity-20" />
            <div className="relative bg-card border border-white/5 p-3 rounded-xl space-y-3">
              <Input 
                placeholder="Declare high-level objective..."
                className="bg-background/50 border-none focus-visible:ring-1 focus-visible:ring-primary/50 text-[12px] h-10 placeholder:text-muted-foreground/30 font-medium"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartAutomation()}
              />
              <Button 
                onClick={handleStartAutomation}
                disabled={isGenerating || !prompt.trim() || isSyncing}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-black text-[11px] uppercase tracking-[0.2em] shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Zap className="w-4 h-4 mr-2 fill-current" />
                )}
                {isGenerating ? "Synthesizing..." : "Initiate Protocol"}
              </Button>
            </div>
          </div>

          {/* Progression */}
          {activeTask && activeTask.status === 'running' && (
            <div className="space-y-2 px-1">
              <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-primary/70">
                <span>Task Progression</span>
                <span className="font-mono">{Math.round(((activeTask.currentStepIndex + 1) / activeTask.steps.length) * 100)}%</span>
              </div>
              <Progress value={((activeTask.currentStepIndex + 1) / activeTask.steps.length) * 100} className="h-1.5 bg-white/5 [&>div]:bg-primary shadow-[0_0_10px_rgba(0,255,255,0.2)]" />
            </div>
          )}

          {/* Terminal Console */}
          <div className="flex-1 flex flex-col min-h-0 bg-black/80 border border-white/5 rounded-xl p-4 font-mono text-[11px] relative shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Nexus_Runtime_Logs</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500/20" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                <div className="w-2 h-2 rounded-full bg-green-500/20" />
              </div>
            </div>
            
            <ScrollArea className="flex-1 terminal-scroll">
              <div className="space-y-2">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-3 leading-relaxed group">
                    <span className="text-white/10 shrink-0 select-none">[{i.toString().padStart(3, '0')}]</span>
                    <span className={cn(
                      "transition-colors",
                      log.type === 'success' ? 'text-accent' : 
                      log.type === 'warn' ? 'text-destructive/80' : 
                      log.type === 'system' ? 'text-primary/90 italic' :
                      'text-foreground/70'
                    )}>
                      {log.type === 'system' ? '>> ' : ''}{log.msg}
                    </span>
                  </div>
                ))}
                {(isGenerating || isSyncing) && (
                  <div className="flex items-center gap-3 text-primary mt-3">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                    <span className="text-[9px] font-black animate-pulse uppercase tracking-[0.2em]">Processing Stream...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
