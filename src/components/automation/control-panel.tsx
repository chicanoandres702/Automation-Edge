"use client";

import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Power, Settings2 } from "lucide-react";
import { AutomationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ControlPanelProps {
  status: AutomationStatus;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function AgentControlPanel({ status, onStart, onPause, onStop, disabled }: ControlPanelProps) {
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isIdle = status === 'idle' || status === 'completed' || status === 'error';

  return (
    <div className="p-4 bg-card/40 border border-border rounded-2xl flex flex-col gap-4 shadow-xl">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isRunning ? "bg-accent animate-pulse" : isPaused ? "bg-yellow-500" : "bg-muted-foreground"
          )} />
          <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
            {status === 'idle' ? 'System Ready' : `Agent ${status}`}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-accent">
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={isRunning ? onPause : onStart}
          disabled={disabled || (status === 'completed' && !isRunning)}
          className={cn(
            "h-12 flex flex-col gap-1 rounded-xl transition-all duration-300",
            isRunning ? "bg-primary hover:bg-primary/90" : "bg-accent hover:bg-accent/90 text-background font-bold"
          )}
        >
          {isRunning ? (
            <>
              <Pause className="h-4 w-4" />
              <span className="text-[10px] uppercase font-bold">Pause</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span className="text-[10px] uppercase font-bold">Resume</span>
            </>
          )}
        </Button>

        <Button
          onClick={onStop}
          disabled={isIdle || disabled}
          variant="secondary"
          className="h-12 flex flex-col gap-1 rounded-xl bg-muted/50 hover:bg-muted"
        >
          <Square className="h-4 w-4 text-destructive" />
          <span className="text-[10px] uppercase font-bold">Stop</span>
        </Button>

        <Button
          variant="secondary"
          className="h-12 flex flex-col gap-1 rounded-xl bg-muted/50 hover:bg-muted"
        >
          <Power className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] uppercase font-bold">Off</span>
        </Button>
      </div>
    </div>
  );
}