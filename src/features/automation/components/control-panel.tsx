"use client";

import { Button } from "@/ui";
import { Play, Pause, Square, ChevronRight, AlertCircle } from "lucide-react";
import { AutomationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ControlPanelProps {
  status: AutomationStatus;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onStep?: () => void;
  disabled?: boolean;
  manualMode?: boolean;
}

export function AgentControlPanel({ 
  status, 
  onStart, 
  onPause, 
  onStop, 
  onStep,
  disabled, 
  manualMode 
}: ControlPanelProps) {
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isIntervention = status === 'intervention_required';
  const isIdle = status === 'idle' || status === 'completed' || status === 'error';

  return (
    <div className="p-4 bg-card/40 border border-white/5 rounded-2xl flex flex-col gap-4 shadow-xl backdrop-blur-md relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary/50 transition-colors" />
      
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isRunning ? "bg-accent animate-pulse" : 
            isIntervention ? "bg-destructive animate-bounce" :
            isPaused ? "bg-yellow-500" : "bg-muted-foreground"
          )} />
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            {isIntervention ? 'Intervention Required' : status === 'idle' ? 'System Ready' : `Agent ${status}`}
          </span>
        </div>
        {manualMode && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-[8px] font-black uppercase text-primary">
            Manual
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={isRunning ? onPause : onStart}
          disabled={disabled || (status === 'completed' && !isRunning)}
          className={cn(
            "h-10 flex items-center justify-center gap-2 rounded-xl transition-all duration-300",
            isRunning ? "bg-primary hover:bg-primary/90" : "bg-accent hover:bg-accent/90 text-background font-black"
          )}
        >
          {isRunning ? (
            <>
              <Pause className="h-4 w-4" />
              <span className="text-[10px] uppercase">Pause</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" />
              <span className="text-[10px] uppercase">Resume</span>
            </>
          )}
        </Button>

        {manualMode ? (
          <Button
            onClick={onStep}
            disabled={disabled || isRunning || status === 'completed'}
            variant="outline"
            className="h-10 flex items-center justify-center gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/10 shadow-[0_0_15px_rgba(0,255,255,0.05)] active:scale-95 transition-all"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="text-[10px] uppercase font-black">Step</span>
          </Button>
        ) : (
          <Button
            onClick={onStop}
            disabled={isIdle || disabled}
            variant="secondary"
            className="h-10 flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10"
          >
            <Square className="h-3 w-3 text-destructive fill-current" />
            <span className="text-[10px] uppercase font-black">Stop</span>
          </Button>
        )}
      </div>

      {isIntervention && (
        <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-3.5 h-3.5 text-destructive" />
          <p className="text-[9px] font-bold text-destructive/90 uppercase tracking-tighter">AI flagged context for review</p>
        </div>
      )}
    </div>
  );
}
