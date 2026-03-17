"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Unlock, Settings as SettingsIcon, Terminal, ShieldCheck } from "lucide-react";
import { AgentVisualizer } from "@/components/automation/visualizer";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { TacticalControlCard } from "@/components/automation/TacticalControlCard";
import { MissionRegistry } from "@/components/automation/MissionRegistry";
import { ControlModal } from "@/components/automation/ControlModal";
import { useNexusMission } from "@/hooks/use-nexus-mission";
import { cn } from "@/lib/utils";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function NexusControlCenter() {
  const [mounted, setMounted] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const mission = useNexusMission();

  useEffect(() => {
    setMounted(true);
    mission.addLog("Nexus Kernel v6.8 AI-CORE Initialized", "system");
  }, []);

  if (!mounted) return null;

  return (
    <>
      <AppSidebar
        activeTask={mission.activeTask}
        onStart={() => mission.executeNextStep()}
        onPause={() => mission.setActiveTask(prev => prev ? { ...prev, status: 'paused' } : null)}
        onStop={() => { mission.setActiveTask(null); mission.setIsNeuralLocked(false); mission.setMissionId(""); }}
        onStep={mission.onStep}
        manualMode={mission.manualMode}
        onToggleManual={mission.onToggleManual}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <SidebarInset className="bg-background flex flex-col h-screen relative overflow-hidden">
        <img src={PlaceHolderImages.find(img => img.id === 'agent-portrait')?.imageUrl} alt="" className="absolute left-0 top-0 w-full md:w-1/2 h-full z-0 opacity-5 pointer-events-none transition-opacity duration-1000" />

        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/50 px-4 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-8 w-8" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Nexus AI Fleet</span>
              <span className="text-[8px] font-medium text-muted-foreground uppercase">Gemini 3.0 Flash Core</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={cn("flex items-center gap-2 px-2.5 py-1 rounded-lg border", mission.isNeuralLocked ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/5")}>
              {mission.isNeuralLocked ? <Lock className="w-2.5 h-2.5 text-primary" /> : <Unlock className="w-2.5 h-2.5 text-muted-foreground" />}
              <span className={cn("text-[9px] font-black uppercase tracking-tighter", mission.isNeuralLocked ? "text-primary" : "text-muted-foreground")}>
                {mission.isNeuralLocked ? `Lock: ${mission.missionId}` : "Neural Open"}
              </span>
            </div>
            <SettingsIcon className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary" onClick={() => setIsSettingsOpen(true)} />
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-0 z-10 p-4 md:p-6 space-y-6">
          <div className="max-w-4xl mx-auto w-full space-y-4">
            <TacticalControlCard prompt={mission.prompt} setPrompt={mission.setPrompt} isGenerating={mission.isGenerating} onInitiate={mission.handleStartMission} activeStatus={mission.activeTask?.status} />
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
            <div className="lg:col-span-8 flex flex-col min-h-0">
              <Tabs defaultValue="matrix" className="flex-1 flex flex-col min-h-0">
                <TabsList className="bg-white/5 p-1 mb-4 inline-flex w-fit"><TabsTrigger value="matrix" className="text-[10px] font-black uppercase tracking-widest">Operation Matrix</TabsTrigger><TabsTrigger value="history" className="text-[10px] font-black uppercase tracking-widest">Mission Registry</TabsTrigger></TabsList>
                <TabsContent value="matrix" className="flex-1 mt-0"><AgentVisualizer steps={mission.activeTask?.steps || []} currentStepIndex={mission.activeTask?.currentStepIndex || 0} status={mission.activeTask?.status || 'idle'} onReorder={(s) => mission.setActiveTask(prev => prev ? { ...prev, steps: s } : null)} /></TabsContent>
                <TabsContent value="history" className="flex-1 mt-0"><MissionRegistry /></TabsContent>
              </Tabs>
            </div>

            <div className="lg:col-span-4 hidden md:flex flex-col min-h-0 space-y-4">
              <div className="flex items-center justify-between px-2"><div className="flex items-center gap-2"><Terminal className="w-4 h-4 text-accent" /><h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Log Stream</h3></div><ShieldCheck className="w-3.5 h-3.5 text-primary opacity-40" /></div>
              <Card className="flex-1 bg-black/60 border-white/5 p-4 rounded-3xl flex flex-col min-h-0 shadow-inner"><ScrollArea><div className="space-y-4">{mission.logs.map((log, i) => (<div key={i} className="flex gap-3 items-start"><div className={cn("w-1 h-3 mt-1 rounded-full", log.type === 'success' ? 'bg-accent' : log.type === 'system' ? 'bg-primary' : log.type === 'warn' ? 'bg-destructive' : 'bg-muted-foreground/30')} /><p className={cn("text-[10px] font-mono", log.type === 'success' ? 'text-accent' : log.type === 'system' ? 'text-primary' : log.type === 'warn' ? 'text-destructive/80' : 'text-muted-foreground')}>{log.msg}</p></div>))}</div></ScrollArea></Card>
            </div>
          </div>
        </main>

        <ControlModal
          isOpen={mission.isInterventionOpen}
          onOpenChange={mission.setIsInterventionOpen}
          question={mission.interventionQuestion}
          onConfirm={(r, l) => { mission.setActiveTask(prev => prev ? { ...prev, status: 'running', memory: [...prev.memory, { step: "OPERATOR", result: r }] } : null); mission.setIsInterventionOpen(false); }}
          onEraseActions={mission.eraseMissionPersistence}
          onReprompt={mission.handleStartMission}
          onSkip={mission.onSkip}
        />
        <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      </SidebarInset>
    </>
  );
}
