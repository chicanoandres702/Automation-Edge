"use client";

import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader,
} from "@/ui";
import { AgentControlPanel } from "@/features/automation";
import { AutomationTask } from "@/lib/types";
import { Cpu, User, ShieldCheck, Settings, Activity, Globe, Database, Layers } from "lucide-react";
import { Button, Switch, Label } from "@/ui";

interface AppSidebarProps {
  activeTask: AutomationTask | null;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onStep: () => void;
  manualMode: boolean;
  onToggleManual: (val: boolean) => void;
  onOpenSettings: () => void;
}

export function AppSidebar({ 
  activeTask, 
  onStart, 
  onPause, 
  onStop, 
  onStep,
  manualMode,
  onToggleManual,
  onOpenSettings
}: AppSidebarProps) {
  return (
    <Sidebar variant="inset" side="left" className="border-r border-white/5 bg-sidebar">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Cpu className="text-primary-foreground w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline font-black text-lg tracking-tight leading-none uppercase">Nexus</h1>
            <p className="text-[9px] tracking-[0.3em] text-primary font-black uppercase mt-1">Fleet Core</p>
          </div>
        </div>

        <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer group">
          <div className="flex items-center gap-3">
            <Layers className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <Label htmlFor="manual-mode" className="text-[10px] font-black uppercase tracking-widest cursor-pointer text-muted-foreground group-hover:text-foreground">Manual Control</Label>
          </div>
          <Switch 
            id="manual-mode" 
            checked={manualMode} 
            onCheckedChange={onToggleManual} 
            className="scale-75 data-[state=checked]:bg-primary"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-6 py-4 flex flex-col gap-8">
        <div className="space-y-4">
          <h3 className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] px-1">Fleet Telemetry</h3>
          <div className="space-y-2">
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-3.5 h-3.5 text-primary/50" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Nodes</span>
              </div>
              <span className="text-[10px] font-black text-primary">12</span>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-3.5 h-3.5 text-accent/50" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Kernel Sync</span>
              </div>
              <span className="text-[10px] font-black text-accent">99.9%</span>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="w-3.5 h-3.5 text-muted-foreground/50" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Persistence</span>
                </div>
              <span className="text-[10px] font-black text-foreground">NOMINAL</span>
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <AgentControlPanel 
            status={activeTask?.status || 'idle'}
            onStart={onStart}
            onPause={onPause}
            onStop={onStop}
            onStep={onStep}
            manualMode={manualMode}
          />
        </div>
      </SidebarContent>

      <SidebarFooter className="p-6 border-t border-white/5 bg-black/10">
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 overflow-hidden">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black truncate uppercase text-foreground/90">Operator_Alpha</p>
              <p className="text-[8px] text-muted-foreground truncate font-mono uppercase opacity-50">root@nexus</p>
            </div>
            <button type="button" onClick={onOpenSettings} aria-label="Open settings" className="cursor-pointer group bg-transparent border-0 p-0">
              <Settings className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </button>
          </div>
          <Button variant="outline" className="w-full justify-start gap-3 border-white/10 bg-transparent text-[10px] font-black uppercase tracking-widest h-11 rounded-xl hover:bg-primary/5 transition-all">
            <ShieldCheck className="w-4 h-4 text-accent" />
            Nexus Unlimited
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
