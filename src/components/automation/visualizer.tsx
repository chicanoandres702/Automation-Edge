
"use client";

import { AutomationStep } from "@/lib/types";
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  PlayCircle, 
  AlertCircle,
  MousePointer2,
  Keyboard,
  Fingerprint,
  RefreshCw,
  Navigation,
  Search,
  Eye,
  GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface VisualizerProps {
  steps: AutomationStep[];
  currentStepIndex: number;
  status: string;
  onIntervene?: (index: number) => void;
  onReorder?: (steps: AutomationStep[]) => void;
}

export function AgentVisualizer({ steps, currentStepIndex, status, onIntervene, onReorder }: VisualizerProps) {
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'click': return <MousePointer2 className="w-3.5 h-3.5" />;
      case 'type': return <Keyboard className="w-3.5 h-3.5" />;
      case 'touch': return <Fingerprint className="w-3.5 h-3.5" />;
      case 'navigate': return <Navigation className="w-3.5 h-3.5" />;
      case 'wait': return <RefreshCw className="w-3.5 h-3.5" />;
      case 'extract': return <Search className="w-3.5 h-3.5" />;
      default: return <Circle className="w-3.5 h-3.5" />;
    }
  };

  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination || !onReorder) return;
    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    onReorder(items);
  };

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 text-[10px] border-2 border-dashed rounded-3xl border-white/5 p-8 text-center animate-in fade-in zoom-in duration-500">
        <PlayCircle className="w-12 h-12 mb-6 opacity-5 animate-pulse" />
        <p className="font-black uppercase tracking-[0.3em] leading-loose text-primary/40">
          Nexus_Ready.<br/>Inject_Objective_Script.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-4 bg-primary rounded-full neon-glow-primary" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/70">Objective_Queue</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono text-muted-foreground/40">{steps.length} STACKED_OPS</span>
          <span className={cn(
            "text-[8px] px-2.5 py-0.5 rounded-full font-black uppercase border transition-all shadow-sm",
            status === 'running' ? "bg-primary/10 text-primary border-primary/20 animate-pulse" : 
            status === 'intervention_required' ? "bg-destructive/10 text-destructive border-destructive/20" :
            "bg-white/5 text-muted-foreground border-white/5"
          )}>
            {status}
          </span>
        </div>
      </div>
      
      <ScrollArea className="flex-1 -mr-2 pr-2">
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <Droppable droppableId="steps">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef} 
                className="space-y-3 pb-6"
              >
                {steps.map((step, index) => {
                  const isActive = index === currentStepIndex && (status === 'running' || status === 'intervention_required');
                  const isCompleted = index < currentStepIndex || (index === currentStepIndex && status === 'completed');
                  const isPending = index > currentStepIndex;
                  const needsReview = step.status === 'needs_review' || (isActive && status === 'intervention_required');

                  return (
                    <Draggable key={step.id} draggableId={step.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "relative pl-10 pr-2 transition-all duration-300",
                            isActive ? "scale-[1.02] z-10" : "scale-100",
                            snapshot.isDragging && "opacity-50 scale-105"
                          )}
                        >
                          {/* Drag Handle */}
                          <div 
                            {...provided.dragHandleProps}
                            className="absolute left-1 top-1/2 -translate-y-1/2 p-2 text-muted-foreground/20 hover:text-primary/50 transition-colors cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Connection Line */}
                          {index < steps.length - 1 && (
                            <div className="absolute left-5 top-8 bottom-[-12px] w-[1px] bg-gradient-to-b from-white/10 to-transparent" />
                          )}

                          {/* Status Marker */}
                          <div className={cn(
                            "absolute left-3 top-3 w-4 h-4 rounded-full border bg-background flex items-center justify-center transition-all z-20",
                            needsReview ? "border-destructive text-destructive shadow-[0_0_8px_rgba(255,0,0,0.3)]" :
                            isActive ? "border-primary text-primary shadow-[0_0_8px_hsla(190,100%,50%,0.3)]" : 
                            isCompleted ? "border-accent/40 text-accent/60 bg-accent/5" : 
                            "border-white/10 text-muted-foreground/30"
                          )}>
                            {needsReview ? (
                              <AlertCircle className="w-2.5 h-2.5 animate-pulse" />
                            ) : isActive ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : isCompleted ? (
                              <CheckCircle2 className="w-2.5 h-2.5" />
                            ) : (
                              getActionIcon(step.type)
                            )}
                          </div>

                          <div className={cn(
                            "group/card p-4 rounded-2xl border transition-all duration-300 backdrop-blur-md relative overflow-hidden",
                            needsReview ? "bg-destructive/5 border-destructive/30 shadow-[inset_0_0_20px_rgba(255,0,0,0.05)]" :
                            isActive ? "bg-primary/5 border-primary/40 shadow-[0_0_20px_rgba(0,255,255,0.05)]" : "bg-white/[0.02] border-white/5",
                            isPending && "opacity-40 grayscale-[0.5]"
                          )}>
                            {/* Accent Glow */}
                            {isActive && (
                              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
                            )}

                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <span className="text-[7px] font-black uppercase text-muted-foreground/40 tracking-[0.2em]">OP_{index.toString().padStart(2, '0')}</span>
                                <div className="px-1.5 py-0.5 rounded bg-white/5 text-[6px] uppercase font-black text-primary/70 border border-primary/10 tracking-widest">{step.type}</div>
                              </div>
                              {needsReview && onIntervene && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-[7px] font-black uppercase bg-destructive/20 text-destructive hover:bg-destructive/30 border border-destructive/20 rounded-md"
                                  onClick={() => onIntervene(index)}
                                >
                                  <Eye className="w-3 h-3 mr-1.5" />
                                  Manual_Override
                                </Button>
                              )}
                            </div>
                            
                            <p className={cn(
                              "text-[10px] font-bold leading-relaxed tracking-tight break-words",
                              needsReview ? "text-destructive" :
                              isActive ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {step.description}
                            </p>
                            
                            {isActive && !needsReview && (
                              <div className="mt-4 space-y-2">
                                <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary animate-[loading_2s_linear_infinite]" />
                                </div>
                                <div className="flex justify-between items-center px-0.5">
                                  <span className="text-[8px] font-black text-primary/60 animate-pulse tracking-[0.3em] uppercase">Processing_Buffer...</span>
                                  <div className="flex gap-1.5">
                                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </ScrollArea>
    </div>
  );
}
