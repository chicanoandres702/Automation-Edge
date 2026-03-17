// public/automation/communication.js

const missionPorts = globalThis.__missionPorts || (globalThis.__missionPorts = {});
const pendingAcks = globalThis.__pendingAcks || (globalThis.__pendingAcks = {});

function sendWithAckToPort(port, payload, missionId) {
    return new Promise((resolve) => {
        if (!port || !port.postMessage) return resolve(false);
        const messageId = `${payload.missionId || missionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        payload.messageId = messageId;
        pendingAcks[messageId] = () => { resolve(true); delete pendingAcks[messageId]; };
        try { port.postMessage(payload); } catch (e) { delete pendingAcks[messageId]; return resolve(false); }

        // fallback timeout
        setTimeout(() => {
            if (pendingAcks[messageId]) { delete pendingAcks[messageId]; resolve(false); }
        }, 1500);
    });
}

export function sendMissionUpdate(missionId, payload) {
    const port = missionPorts[missionId];
    const full = { type: 'MISSION_UPDATE', missionId, ...payload };
    if (port) return sendWithAckToPort(port, full, missionId);
    return new Promise((resolve) => {
        try {
            chrome.runtime.sendMessage(full, () => resolve(true));
        } catch (e) {
            resolve(false);
        }
    });
}

export function registerPort(port) {
    const missionId = port && port.name ? port.name : null;
    if (!missionId) return;
    missionPorts[missionId] = port;

    port.onMessage.addListener((msg) => {
        if (!msg) return;
        if (msg.type === 'ACK' && msg.messageId) {
            const fn = pendingAcks[msg.messageId];
            if (typeof fn === 'function') {
                try { fn(true); } catch (e) { }
                delete pendingAcks[msg.messageId];
            }
        }
    });

    port.onDisconnect.addListener(() => {
        delete missionPorts[missionId];
    });

    return missionId;
}
