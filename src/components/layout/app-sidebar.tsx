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
import { Cpu, Zap, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface AppSidebarProps {
  activeTask: AutomationTask | null;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
}

export function AppSidebar({ activeTask, onStart, onPause, onStop }: AppSidebarProps) {
  const { isMobile } = useSidebar();

  return (
    <Sidebar variant="inset" side="left" className="border-r border-border bg-sidebar">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center neon-glow">
            <Cpu className="text-background w-6 h-6" />
          </div>
          <div>
            <h1 className="font-headline font-bold text-lg leading-tight">AUTOMATON</h1>
            <p className="text-[10px] tracking-[0.2em] text-accent font-bold uppercase opacity-80">Edge Engine</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-2 flex flex-col gap-6">
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

      <SidebarFooter className="p-4 bg-background/40">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">Operator Pro</p>
              <p className="text-[10px] text-muted-foreground truncate">pro.user@automaton.edge</p>
            </div>
            <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-destructive transition-colors" />
          </div>
          <Button variant="outline" className="w-full justify-start gap-2 border-border/50 text-xs py-5 rounded-xl">
            <Zap className="w-3.5 h-3.5 text-accent" />
            Upgrade to Enterprise
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}