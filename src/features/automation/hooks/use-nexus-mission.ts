"use client";

import { useState, useCallback } from "react";
import { useFirebase } from "@/firebase";
import { useToast } from "@/hooks";
import { AutomationTask, AutomationStep } from "@/lib/types";
import { fetchAIPlan, getSharedToolHostnames, purgeMission, useMissionExecution } from "@/features/automation";

export function useNexusMission() {
    const [prompt, setPrompt] = useState("");
    const [missionId, setMissionId] = useState("");
    const [isNeuralLocked, setIsNeuralLocked] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTask, setActiveTask] = useState<AutomationTask | null>(null);
    const [logs, setLogs] = useState<{ msg: string, type: string }[]>([]);
    const [manualMode, setManualMode] = useState(false);

    const { firestore: db, user } = useFirebase();
    useToast();

    const addLog = useCallback((msg: string, type: string = 'info') => {
        setLogs(prev => [...prev.slice(-30), { msg, type }]);
    }, []);

    const execution = useMissionExecution(activeTask, setActiveTask, db, addLog, manualMode);

    const handleStartMission = async (customPrompt?: string) => {
        const finalPrompt = customPrompt || prompt;
        if (!finalPrompt.trim() || !user || !db) return;
        setIsGenerating(true);
        addLog(`Initiating Tactical Neural Link...`, "info");
        try {
            const hostnames = await getSharedToolHostnames(db);
            const key = localStorage.getItem('ai_api_key') || null;
            const result = await fetchAIPlan(finalPrompt, key, hostnames);

            if (result.neuralLock?.missionId) {
                setMissionId(result.neuralLock.missionId);
                setIsNeuralLocked(true);
            }

            const now = Date.now();
            const newSteps: AutomationStep[] = (result.steps || []).map((s: any, idx: number) => ({
                id: `step-${now}-${idx}`, description: s.description || s, type: s.type || 'navigate',
                target: s.target, value: s.value, status: 'pending', retryCount: 0, maxRetries: s.maxRetries || 3
            }));

            setActiveTask({
                id: `task-${now}`, prompt: finalPrompt, status: result.neuralLock?.isAmbiguous ? 'seeking' : 'running',
                steps: newSteps, currentStepIndex: 0, observedTabs: [], memory: [], createdAt: now, updatedAt: now,
                identityMode: 'persistent', missionContext: result.neuralLock?.missionId || missionId
            });
            setPrompt("");
        } catch (error: any) {
            addLog(`AI unavailable: ${error.message}`, "warn");
        } finally {
            setIsGenerating(false);
        }
    };

    const eraseMissionPersistence = async () => {
        if (!db || !missionId) return;
        await purgeMission(db, missionId);
        addLog("Mission Persistence Purged", "warn");
        setMissionId("");
        setIsNeuralLocked(false);
        setActiveTask(null);
    };

    return {
        prompt, setPrompt, missionId, setMissionId, isNeuralLocked, setIsNeuralLocked,
        isGenerating, setIsGenerating, activeTask, setActiveTask, logs, addLog,
        manualMode, onToggleManual: setManualMode, onStep: execution.executeNextStep,
        ...execution, handleStartMission, eraseMissionPersistence
    };
}
