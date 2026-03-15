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
  GripVertical,
  XCircle,
  Undo2,
  MessageSquare,
  RotateCcw
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
      case 'ask-user': return <MessageSquare className="w-3.5 h-3.5" />;
      case 'close-tab': return <XCircle className="w-3.5 h-3.5" />;
      case 'refresh': return <RotateCcw className="w-3.5 h-3.5" />;
      case 'navigate-back': return <Undo2 className="w-3.5 h-3.5" />;
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
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl border-white/5 p-8 text-center bg-white/[0.01]">
        <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-4">
          <PlayCircle className="w-6 h-6 text-primary opacity-20" />
        </div>
        <p className="font-black uppercase tracking-[0.2em] text-[10px] text-muted-foreground/40">
          Standby for mission injection
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden shadow-2xl">
      <div className="grid grid-cols-[40px_1fr_60px] gap-2 px-4 py-3 bg-white/[0.03] text-[8px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5">
        <div className="flex justify-center">#</div>
        <div>Tactical Step</div>
        <div className="text-right">Status</div>
      </div>
      
      <ScrollArea className="flex-1 custom-scrollbar">
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <Droppable droppableId="operation-matrix">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef} 
                className="divide-y divide-white/5"
              >
                {steps.map((step, index) => {
                  const isCurrent = index === currentStepIndex;
                  const isActive = isCurrent && (status === 'running' || status === 'intervention_required' || status === 'retrying');
                  const isCompleted = index < currentStepIndex || (index === currentStepIndex && status === 'completed');
                  const isPending = index > currentStepIndex;
                  const isRetrying = isCurrent && status === 'retrying';
                  const needsReview = step.status === 'needs_review' || (isActive && status === 'intervention_required') || step.type === 'ask-user';

                  return (
                    <Draggable key={step.id} draggableId={step.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "group relative grid grid-cols-[40px_1fr_60px] gap-2 px-4 py-4 items-start transition-colors",
                            isActive ? "bg-primary/5 shadow-inner" : "hover:bg-white/[0.01]",
                            snapshot.isDragging && "bg-white/10 scale-[1.02] z-50 rounded-lg border-primary/20 shadow-2xl",
                            isPending && "opacity-30 grayscale-[0.5]"
                          )}
                        >
                          <div 
                            {...provided.dragHandleProps}
                            className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 text-primary/30 cursor-grab"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <div className="flex flex-col items-center">
                            <span className={cn(
                              "text-[10px] font-mono",
                              isActive ? "text-primary font-black" : "text-muted-foreground/50"
                            )}>
                              {index + 1}
                            </span>
                          </div>

                          <div className="space-y-2 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "flex items-center gap-1.5 px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-tight",
                                isActive ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-white/5 text-muted-foreground"
                              )}>
                                {getActionIcon(step.type)}
                                {step.type}
                              </div>
                              {step.retryCount > 0 && (
                                <span className="text-[7px] font-black text-accent uppercase tracking-widest bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">
                                  Retry {step.retryCount}
                                </span>
                              )}
                            </div>
                            
                            <p className={cn(
                              "text-[11px] font-bold leading-relaxed pr-4",
                              isActive ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {step.description}
                            </p>
                            
                            {needsReview && isCurrent && onIntervene && (
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className="h-7 mt-2 w-full text-[8px] font-black uppercase bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 rounded-md"
                                 onClick={() => onIntervene(index)}
                                >
                                 Respond to Operator Link
                               </Button>
                            )}
                          </div>

                          <div className="flex justify-end pt-1">
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center",
                              isActive ? "text-primary" : isCompleted ? "text-accent" : "text-muted-foreground/20"
                            )}>
                              {needsReview && isCurrent ? (
                                <AlertCircle className="w-4 h-4 text-destructive animate-pulse" />
                              ) : isRetrying ? (
                                <RotateCcw className="w-4 h-4 text-accent animate-spin" />
                              ) : isActive ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : isCompleted ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Circle className="w-3 h-3" />
                              )}
                            </div>
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