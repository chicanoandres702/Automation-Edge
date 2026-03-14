"use client";

import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader,
  useSidebar
} from "@/components/ui/sidebar";
import { AgentVisualizer } from "@/components/automation/visualizer";
import { AgentControlPanel } from "@/components/automation/control-panel";
import { AutomationTask } from "@/lib/types";
import { Cpu, Zap, LogOut, User, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface AppSidebarProps {
  activeTask: AutomationTask | null;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
}

export function AppSidebar({ activeTask, onStart, onPause, onStop }: AppSidebarProps) {
  return (
    <Sidebar variant="inset" side="left" className="border-r border-white/5 bg-sidebar">
      <SidebarHeader className="p-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center neon-glow-primary">
            <Cpu className="text-background w-7 h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline font-black text-xl tracking-tighter leading-none">NEXUS</h1>
            <p className="text-[10px] tracking-[0.4em] text-primary font-black uppercase mt-1">Fleet Core</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-5 py-2 flex flex-col gap-8">
        <div className="flex-1 min-h-0">
          <AgentVisualizer 
            steps={activeTask?.steps || []} 
            currentStepIndex={activeTask?.currentStepIndex || 0}
            status={activeTask?.status || 'idle'}
          />
        </div>

        <div className="mt-auto">
          <AgentControlPanel 
            status={activeTask?.status || 'idle'}
            onStart={onStart}
            onPause={onPause}
            onStop={onStop}
          />
        </div>
      </SidebarContent>

      <SidebarFooter className="p-5">
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/20">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate">Operator_Alpha</p>
              <p className="text-[10px] text-muted-foreground truncate font-mono">auth::root_nexus</p>
            </div>
            <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-destructive transition-colors" />
          </div>
          <Button variant="outline" className="w-full justify-start gap-3 border-white/10 bg-transparent text-[11px] font-black uppercase tracking-widest h-12 rounded-2xl hover:bg-primary/10 hover:border-primary/30 transition-all">
            <ShieldCheck className="w-4 h-4 text-accent" />
            Nexus Unlimited
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
