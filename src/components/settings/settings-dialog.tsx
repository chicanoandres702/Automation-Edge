"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  Globe, 
  Trash2, 
  Shield, 
  Zap, 
  Database,
  Fingerprint,
  RefreshCcw
} from "lucide-react";
import { useFirebase } from "@/firebase";
import { useCollection } from "@/firebase/firestore/use-collection";
import { deleteDoc, doc, updateDoc, arrayRemove } from "firebase/firestore";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { db } = useFirebase();
  const { data: tools } = useCollection<any>("tools");
  const { data: missions } = useCollection<any>("missions");
  
  const [autonomyThreshold, setAutonomyThreshold] = useState([0.85]);
  const [activeTab, setActiveTab] = useState("autonomy");
  const [identityMode, setIdentityMode] = useState(true); // Persistent by default

  const handleDeleteTool = async (id: string) => {
    await deleteDoc(doc(db, "tools", id));
  };

  const handleDeletePattern = async (missionId: string, pattern: any) => {
    const missionRef = doc(db, "missions", missionId);
    await updateDoc(missionRef, {
      learnedPatterns: arrayRemove(pattern)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-3xl border-white/10 rounded-3xl p-0 overflow-hidden ring-1 ring-white/10 shadow-2xl">
        <DialogTitle className="sr-only">Nexus Fleet Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Configure Nexus agent autonomy, shared tool infrastructure, and learned success patterns.
        </DialogDescription>
        <div className="flex h-[550px]">
          {/* Sidebar Navigation */}
          <div className="w-52 border-r border-white/5 bg-white/[0.02] p-5 flex flex-col gap-6">
             <div className="flex items-center gap-3 px-2">
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                  <Settings className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/90">
                  Nexus Settings
                </span>
             </div>
             
             <div className="flex flex-col gap-1.5">
                {[
                  { id: 'autonomy', icon: Zap, label: 'Autonomy' },
                  { id: 'tools', icon: Globe, label: 'Shared Tools' },
                  { id: 'memory', icon: Database, label: 'Pattern Registry' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-300 group",
                      activeTab === item.id 
                        ? "bg-primary/10 text-primary shadow-[inset_0_0_10px_rgba(0,100,255,0.05)]" 
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("w-3.5 h-3.5", activeTab === item.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                      <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
                    </div>
                    {activeTab === item.id && <div className="w-1 h-1 rounded-full bg-primary" />}
                  </button>
                ))}
             </div>

             <div className="mt-auto p-4 rounded-2xl bg-accent/5 border border-accent/10">
                <div className="flex items-center gap-2 mb-2">
                   <Shield className="w-3 h-3 text-accent" />
                   <span className="text-[8px] font-black uppercase tracking-widest text-accent">Security Active</span>
                </div>
                <p className="text-[8px] text-muted-foreground leading-relaxed">Neural persistence is encrypted and siloed per mission.</p>
             </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-8 flex flex-col min-h-0 bg-gradient-to-br from-transparent to-primary/5">
             <ScrollArea className="flex-1 pr-4">
                {activeTab === 'autonomy' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-500">
                    <div className="space-y-2">
                      <h3 className="text-[12px] font-black uppercase tracking-widest text-primary">Autonomy Protocols</h3>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">Configure how the agent handles environmental ambiguity.</p>
                    </div>

                    <div className="space-y-6">
                       <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-5">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-tight">Confidence Bypass Threshold</span>
                             </div>
                             <Badge variant="outline" className="text-[10px] font-mono border-primary/20 text-primary bg-primary/5">{(autonomyThreshold[0] * 100).toFixed(0)}%</Badge>
                          </div>
                          <p className="text-[9px] text-muted-foreground">The AI must meet this certainty score to proceed without an Operator Sync request.</p>
                          <Slider 
                             value={autonomyThreshold} 
                             onValueChange={setAutonomyThreshold} 
                             max={1} 
                             step={0.01} 
                             min={0.5}
                             className="py-2"
                          />
                       </div>

                       <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <Fingerprint className="w-4 h-4 text-accent" />
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-tight">Persistent Identity Mode</span>
                                <span className="text-[8px] text-muted-foreground">Maintains consistent browser fingerprint across tabs.</span>
                             </div>
                          </div>
                          <Switch checked={identityMode} onCheckedChange={setIdentityMode} className="scale-75 data-[state=checked]:bg-accent" />
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                             <span className="text-[9px] font-black uppercase text-accent">Auto-Verify</span>
                             <p className="text-[8px] text-muted-foreground">Bypass confirmation when visual patterns match history.</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                             <span className="text-[9px] font-black uppercase text-primary">Neural Locking</span>
                             <p className="text-[8px] text-muted-foreground">Automatically silo mission memory based on course ID.</p>
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {activeTab === 'tools' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-500">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-[12px] font-black uppercase tracking-widest text-primary">Shared Infrastructure</h3>
                        <p className="text-[10px] text-muted-foreground">Manage universal tool hostnames accessible across all missions.</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase border-white/10 bg-white/5 hover:bg-primary/10 hover:border-primary/30 transition-all">Add Node</Button>
                    </div>

                    <div className="space-y-2">
                       {tools?.map((tool: any) => (
                          <div key={tool.id} className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/20 transition-all">
                             <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                   <Globe className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                   <span className="text-[10px] font-black uppercase tracking-tight">{tool.toolId}</span>
                                   <span className="text-[9px] font-mono text-muted-foreground">{tool.hostname}</span>
                                </div>
                             </div>
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                                onClick={() => handleDeleteTool(tool.id)}
                             >
                                <Trash2 className="w-3.5 h-3.5" />
                             </Button>
                          </div>
                       ))}
                       {tools?.length === 0 && (
                          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground/30 border-2 border-dashed border-white/5 rounded-3xl">
                             <Globe className="w-8 h-8 mb-4 opacity-10" />
                             <p className="text-[10px] font-black uppercase tracking-widest">No shared nodes identified</p>
                          </div>
                       )}
                    </div>
                  </div>
                )}

                {activeTab === 'memory' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-500">
                    <div className="space-y-1">
                      <h3 className="text-[12px] font-black uppercase tracking-widest text-primary">Pattern Registry</h3>
                      <p className="text-[10px] text-muted-foreground">Audit and manage visual evidence patterns used for auto-verification.</p>
                    </div>

                    <div className="space-y-3">
                       {missions?.map((mission: any) => (
                          mission.learnedPatterns?.map((pattern: any, idx: number) => (
                             <div key={`${mission.id}-${idx}`} className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-accent/20 transition-all">
                                <div className="flex-1 min-w-0 pr-4">
                                   <div className="flex items-center gap-2 mb-1.5">
                                      <Badge variant="secondary" className="text-[8px] px-1.5 py-0 font-black bg-primary/10 text-primary border-primary/20">{mission.missionId}</Badge>
                                      <span className="text-[10px] font-black uppercase tracking-tighter text-foreground/80">{pattern.actionType} Logic</span>
                                   </div>
                                   <p className="text-[9px] font-mono text-muted-foreground italic truncate">Evidence: "{pattern.successIndicator}"</p>
                                </div>
                                <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                                   onClick={() => handleDeletePattern(mission.id, pattern)}
                                >
                                   <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                             </div>
                          ))
                       ))}
                       {missions?.every((m: any) => !m.learnedPatterns?.length) && (
                          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground/30 border-2 border-dashed border-white/5 rounded-3xl">
                             <Database className="w-8 h-8 mb-4 opacity-10" />
                             <p className="text-[10px] font-black uppercase tracking-widest">No patterns cached</p>
                          </div>
                       )}
                    </div>
                  </div>
                )}
             </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
