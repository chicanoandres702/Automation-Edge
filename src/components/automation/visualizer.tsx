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
  Eye,
  ArrowRight,
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
      case 'click': return <MousePointer2 className="w-3 h-3" />;
      case 'type': return <Keyboard className="w-3 h-3" />;
      case 'touch': return <Fingerprint className="w-3 h-3" />;
      case 'navigate': return <Navigation className="w-3 h-3" />;
      case 'wait': return <RefreshCw className="w-3 h-3" />;
      case 'extract': return <Search className="w-3 h-3" />;
      default: return <Circle className="w-3 h-3" />;
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
      <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-2xl border-white/5 p-4 text-center">
        <PlayCircle className="w-10 h-10 opacity-5 mb-3" />
        <p className="font-black uppercase tracking-widest text-[8px] text-primary/40">
          Standby_Inject_Required
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black/20 rounded-2xl border border-white/5 overflow-hidden shadow-xl">
      <div className="grid grid-cols-[30px_1fr_40px] gap-2 px-3 py-2 bg-white/5 text-[7px] font-black uppercase tracking-widest text-muted-foreground/50">
        <div className="flex justify-center">#</div>
        <div>Operation</div>
        <div className="text-right">STS</div>
      </div>
      
      <ScrollArea className="flex-1">
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
                  const needsReview = step.status === 'needs_review' || (isActive && status === 'intervention_required');

                  return (
                    <Draggable key={step.id} draggableId={step.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "group relative grid grid-cols-[30px_1fr_40px] gap-2 px-3 py-3 items-start transition-all",
                            isActive ? "bg-primary/5" : "hover:bg-white/[0.01]",
                            snapshot.isDragging && "bg-white/10 scale-105 z-50",
                            isPending && "opacity-40"
                          )}
                        >
                          <div 
                            {...provided.dragHandleProps}
                            className="absolute -left-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-primary/20 cursor-grab"
                          >
                            <GripVertical className="w-3 h-3" />
                          </div>

                          <div className="flex flex-col items-center">
                            <span className={cn(
                              "text-[8px] font-mono",
                              isActive ? "text-primary font-black" : "text-muted-foreground/30"
                            )}>
                              {index + 1}
                            </span>
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 px-1 py-0.5 rounded border border-white/5 bg-white/5 w-fit">
                                {getActionIcon(step.type)}
                                <span className="text-[6px] font-black uppercase tracking-tighter">{step.type}</span>
                              </div>
                              {step.retryCount > 0 && (
                                <span className="text-[6px] font-black text-accent uppercase tracking-widest bg-accent/10 px-1 rounded">
                                  Retry {step.retryCount}
                                </span>
                              )}
                            </div>
                            
                            <p className={cn(
                              "text-[9px] font-bold leading-tight truncate pr-2",
                              isActive ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {step.description}
                            </p>
                            
                            {needsReview && onIntervene && (
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className="h-6 mt-1 w-full text-[7px] font-black uppercase bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 rounded-lg"
                                 onClick={() => onIntervene(index)}
                               >
                                 Intervene
                               </Button>
                            )}
                          </div>

                          <div className="flex justify-end">
                            <div className={cn(
                              "w-4 h-4 rounded-full flex items-center justify-center",
                              isActive ? "text-primary" : isCompleted ? "text-accent/40" : "text-muted-foreground/20"
                            )}>
                              {needsReview ? (
                                <AlertCircle className="w-3 h-3 text-destructive animate-bounce" />
                              ) : isRetrying ? (
                                <RotateCcw className="w-3 h-3 text-accent animate-spin" />
                              ) : isActive ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : isCompleted ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <Circle className="w-2 h-2" />
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
