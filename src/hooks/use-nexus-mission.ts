"use client";

import { useState, useCallback, useEffect } from "react";
import { useFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { AutomationTask, AutomationStep } from "@/lib/types";
import { fetchAIPlan, getSharedToolHostnames, purgeMission } from "../features/automation/services/mission.service";
import { useMissionExecution } from "../features/automation/hooks/use-mission-execution";
import { getAIKey } from "@/lib/ai-client";

export function useNexusMission() {
    const [prompt, setPrompt] = useState("");
    const [missionId, setMissionId] = useState("");
    const [isNeuralLocked, setIsNeuralLocked] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTask, setActiveTask] = useState<AutomationTask | null>(null);
    const [logs, setLogs] = useState<{ msg: string, type: string }[]>([]);
    const [manualMode, setManualMode] = useState(false);

    const { firestore: db, user } = useFirebase();
    const { toast } = useToast();

    const addLog = useCallback((msg: string, type: string = 'info') => {
        setLogs(prev => [...prev.slice(-30), { msg, type }]);
    }, []);

    const execution = useMissionExecution(activeTask, setActiveTask, db, addLog, manualMode);

    // Synchronize HUD Controls with Runtime
    useEffect(() => {
        if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

        const listener = (msg: any) => {
            if (msg.type === 'MISSION_CONTROL') {
                console.log('[Mission-HUD] Action:', msg.action);
                switch (msg.action) {
                    case 'PLAY-PAUSE':
                        setActiveTask(prev => prev ? { 
                            ...prev, 
                            status: prev.status === 'paused' ? 'running' : 'paused' 
                        } : null);
                        break;
                    case 'NEXT':
                        execution.skipCurrentStep();
                        break;
                    case 'BACK':
                        setActiveTask(prev => prev ? { 
                            ...prev, 
                            currentStepIndex: Math.max(0, prev.currentStepIndex - 1),
                            status: 'paused' // Pause when going back to allow inspection
                        } : null);
                        break;
                    case 'STOP':
                        setActiveTask(null);
                        break;
                }
            }
        };

        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    }, [execution.skipCurrentStep]);

    const handleStartMission = async (customPrompt?: string) => {
        const finalPrompt = customPrompt || prompt;
        if (!finalPrompt.trim() || !user || !db) {
            console.log('[Mission] Initiation aborted: Missing prompt, user, or db');
            return;
        }
        setIsGenerating(true);
        addLog(`Initiating Tactical Neural Link...`, "info");
        console.log('[Mission] Starting mission for prompt:', finalPrompt);
        try {
            const hostnames = await getSharedToolHostnames(db);

            // Robust Key Retrieval
            const key = await getAIKey();

            console.log('[Mission] Fetching AI Plan...');
            const result = await fetchAIPlan(finalPrompt, key, hostnames);
            console.log('[Mission] AI Plan received:', result);

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
            console.log('[Mission] Active task set');
            setPrompt("");
        } catch (error: any) {
            console.error('[Mission] Critical failure during initiation:', error);
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
        onSkip: execution.skipCurrentStep,
        ...execution, handleStartMission, eraseMissionPersistence
    };
}

