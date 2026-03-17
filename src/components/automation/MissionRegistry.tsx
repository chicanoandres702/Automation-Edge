"use client";

import { Button } from "@/components/ui/button";
import { History, ChevronRight, RefreshCw, Terminal } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { collection } from "firebase/firestore";
import { useFirebase, useMemoFirebase, useCollection } from "@/firebase";

export function MissionRegistry() {
    const { firestore: db, user, isUserLoading } = useFirebase();

    const missionsRef = useMemoFirebase(() => {
        if (isUserLoading || !user || !db) return null;
        return collection(db, "missions");
    }, [db, user, isUserLoading]);

    const { data: missions, isLoading } = useCollection<any>(missionsRef);

    return (
        <Card className="flex-1 bg-black/40 backdrop-blur-md border-white/5 p-6 rounded-3xl flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
                <History className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Mission Registry</h3>
            </div>
            <ScrollArea className="flex-1">
                <div className="space-y-3">
                    {missions?.map((mission: any) => (
                        <div key={mission.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between hover:border-primary/20 transition-all group">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-primary uppercase">{mission.missionId}</span>
                                <span className="text-[9px] text-muted-foreground">Updated {new Date(mission.updatedAt).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 bg-accent/10 px-2 py-1 rounded-lg border border-accent/20">
                                    <span className="text-[8px] font-black text-accent uppercase">{mission.memory?.length || 0} Nodes Synced</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>
                    ))}
                    {!missions?.length && !isLoading && !isUserLoading && (
                        <div className="py-20 flex flex-col items-center justify-center opacity-20 border-2 border-dashed rounded-3xl border-white/5">
                            <Terminal className="w-12 h-12 mb-4" />
                            <p className="text-[10px] font-black uppercase">No persisted missions found</p>
                        </div>
                    )}
                    {(isLoading || isUserLoading) && (
                        <div className="flex justify-center p-10">
                            <RefreshCw className="w-5 h-5 animate-spin text-primary/40" />
                        </div>
                    )}
                </div>
            </ScrollArea>
        </Card>
    );
}
