"use client";

import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader,
} from "@/components/ui/sidebar";
import { AgentControlPanel } from "@/components/automation/control-panel";
import { AutomationTask } from "@/lib/types";
import { Cpu, LogOut, User, ShieldCheck, Settings, MousePointer2, Activity, Globe, Database, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface AppSidebarProps {
  activeTask: AutomationTask | null;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onStep: () => void;
  manualMode: boolean;
  onToggleManual: (val: boolean) => void;
  onOpenSettings?: () => void;
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
    <Sidebar variant="inset" side="left" className="border-r border-white/5 bg-sidebar overflow-hidden">
      <SidebarHeader className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center neon-glow-primary shadow-lg">
              <Cpu className="text-background w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline font-black text-lg tracking-tighter leading-none">NEXUS</h1>
              <p className="text-[8px] tracking-[0.5em] text-primary font-black uppercase mt-1">FLEET_OS_4.2</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground/30 hover:text-primary transition-colors"
            onClick={onOpenSettings}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer group shadow-inner">
          <div className="flex items-center gap-3">
            <MousePointer2 className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
            <Label htmlFor="manual-mode" className="text-[10px] font-black uppercase tracking-widest cursor-pointer text-muted-foreground group-hover:text-foreground">Manual Override</Label>
          </div>
          <Switch 
            id="manual-mode" 
            checked={manualMode} 
            onCheckedChange={onToggleManual} 
            className="scale-75 data-[state=checked]:bg-primary"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-6 py-4 flex flex-col gap-6 overflow-hidden">
        <div className="space-y-4">
          <h3 className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.4em] px-1">Fleet_Node_Health</h3>
          <div className="grid gap-2">
            <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between group hover:bg-white/[0.05] transition-all">
              <div className="flex items-center gap-3">
                <Globe className="w-3.5 h-3.5 text-primary opacity-50" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nodes</span>
              </div>
              <span className="text-[10px] font-black text-primary">12 ACTIVE</span>
            </div>
            <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between group hover:bg-white/[0.05] transition-all">
              <div className="flex items-center gap-3">
                <Activity className="w-3.5 h-3.5 text-accent opacity-50" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sync</span>
              </div>
              <span className="text-[10px] font-black text-accent">99.8%</span>
            </div>
            <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between group hover:bg-white/[0.05] transition-all">
              <div className="flex items-center gap-3">
                <Database className="w-3.5 h-3.5 text-muted-foreground opacity-50" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Buffer</span>
              </div>
              <span className="text-[10px] font-black text-muted-foreground">NOMINAL</span>
            </div>
          </div>
        </div>

        <Separator className="bg-white/5" />

        <div className="mt-auto pb-4">
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

      <SidebarFooter className="p-6 border-t border-white/5 bg-black/20">
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20 transition-all group-hover:ring-primary/40 shadow-lg overflow-hidden relative">
              <User className="w-5 h-5 text-primary" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black truncate uppercase tracking-tight text-foreground/90">Operator_Alpha</p>
              <p className="text-[8px] text-muted-foreground truncate font-mono uppercase opacity-50">auth::root_nexus</p>
            </div>
            <LogOut className="w-4 h-4 text-muted-foreground/30 group-hover:text-destructive transition-colors" />
          </div>
          <Button variant="outline" className="w-full justify-start gap-3 border-white/5 bg-transparent text-[10px] font-black uppercase tracking-widest h-11 rounded-2xl hover:bg-primary/10 hover:border-primary/30 transition-all shadow-sm">
            <ShieldCheck className="w-5 h-5 text-accent animate-pulse-accent" />
            Nexus Unlimited
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
