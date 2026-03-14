"use client";

import { AutomationStep } from "@/lib/types";
import { CheckCircle2, Circle, Loader2, PlayCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VisualizerProps {
  steps: AutomationStep[];
  currentStepIndex: number;
  status: string;
}

export function AgentVisualizer({ steps, currentStepIndex, status }: VisualizerProps) {
  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm border-2 border-dashed rounded-xl border-border p-4 text-center">
        <PlayCircle className="w-8 h-8 mb-2 opacity-20" />
        <p>Awaiting instructions... Describe a task to begin visualization.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Live Workflow</h3>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
          status === 'running' ? "bg-accent/20 text-accent animate-pulse" : "bg-muted text-muted-foreground"
        )}>
          {status}
        </span>
      </div>
      
      <ScrollArea className="flex-1 pr-4 -mr-4">
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex && status === 'running';
            const isCompleted = index < currentStepIndex || (index === currentStepIndex && status === 'completed');
            const isPending = index > currentStepIndex;

            return (
              <div 
                key={step.id} 
                className={cn(
                  "relative pl-8 pb-1 transition-all duration-300",
                  isActive ? "scale-[1.02]" : "scale-100"
                )}
              >
                {/* Timeline Line */}
                {index !== steps.length - 1 && (
                  <div className={cn(
                    "absolute left-[11px] top-6 bottom-0 w-[2px]",
                    isCompleted ? "bg-accent/40" : "bg-border"
                  )} />
                )}

                {/* Status Icon */}
                <div className="absolute left-0 top-0.5">
                  {isActive ? (
                    <div className="relative">
                      <div className="absolute inset-0 bg-accent rounded-full animate-ping opacity-40" />
                      <Loader2 className="w-6 h-6 text-accent animate-spin relative z-10" />
                    </div>
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-accent" />
                  ) : step.status === 'failed' ? (
                    <AlertCircle className="w-6 h-6 text-destructive" />
                  ) : (
                    <Circle className="w-6 h-6 text-muted-foreground/30" />
                  )}
                </div>

                <div className={cn(
                  "p-3 rounded-lg border transition-all duration-200",
                  isActive ? "bg-accent/5 border-accent shadow-[0_0_15px_rgba(67,249,31,0.1)]" : "bg-card/50 border-border",
                  isPending && "opacity-50 grayscale-[0.5]"
                )}>
                  <p className={cn(
                    "text-sm font-medium leading-tight",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.description}
                  </p>
                  {isActive && (
                    <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-accent animate-[loading_2s_ease-in-out_infinite]" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}