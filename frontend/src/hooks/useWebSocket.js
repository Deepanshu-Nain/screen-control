// WebSocket hook for communicating with the Python backend (execution layer)

import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'ws://127.0.0.1:8765/ws';
const RECONNECT_INTERVAL = 3000;

export function useWebSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef(null);
    const reconnectTimerRef = useRef(null);

    const connect = useCallback(() => {
        // Clean up previous
        if (wsRef.current) {
            wsRef.current.close();
        }

        try {
            const ws = new WebSocket(WS_URL);

            ws.onopen = () => {
                console.log('[WS] Connected to backend');
                setIsConnected(true);
            };

            ws.onclose = () => {
                console.log('[WS] Disconnected from backend');
                setIsConnected(false);
                // Auto-reconnect
                reconnectTimerRef.current = setTimeout(connect, RECONNECT_INTERVAL);
            };

            ws.onerror = (err) => {
                console.warn('[WS] Connection error', err);
                ws.close();
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('[WS] Message from backend:', data);
                } catch {
                    // ignore non-JSON messages
                }
            };

            wsRef.current = ws;
        } catch (err) {
            console.warn('[WS] Failed to create WebSocket connection:', err);
            reconnectTimerRef.current = setTimeout(connect, RECONNECT_INTERVAL);
        }
    }, []);

    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (wsRef.current) wsRef.current.close();
        };
    }, [connect]);

    const sendCommand = useCallback((command, confidence = 1.0) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const payload = JSON.stringify({ command, confidence });
            wsRef.current.send(payload);
            console.log('[WS] Sent:', payload);
            return true;
        }
        return false;
    }, []);

    // Low-latency mouse data sender with built-in throttle
    // Caps move sends at ~30/sec to prevent WebSocket flooding.
    // Clicks are always sent instantly.
    const lastMouseSendRef = useRef(0);
    const lastMousePosRef = useRef({ x: -1, y: -1 });
    const pendingMoveRef = useRef(null);
    const moveTimerRef = useRef(null);

    const sendMouseData = useCallback((action, x, y) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return false;

        // Clicks always go through immediately
        if (action !== 'move') {
            wsRef.current.send(JSON.stringify({ type: 'mouse', action, x, y }));
            return true;
        }

        // Skip duplicate positions
        if (lastMousePosRef.current.x === x && lastMousePosRef.current.y === y) return true;

        const now = Date.now();
        const elapsed = now - lastMouseSendRef.current;

        if (elapsed >= 33) {
            // Enough time has passed — send immediately
            lastMouseSendRef.current = now;
            lastMousePosRef.current = { x, y };
            wsRef.current.send(JSON.stringify({ type: 'mouse', action: 'move', x, y }));
        } else {
            // Too soon — store pending and schedule flush
            pendingMoveRef.current = { x, y };
            if (!moveTimerRef.current) {
                moveTimerRef.current = setTimeout(() => {
                    moveTimerRef.current = null;
                    const pos = pendingMoveRef.current;
                    if (pos && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        lastMouseSendRef.current = Date.now();
                        lastMousePosRef.current = pos;
                        wsRef.current.send(JSON.stringify({ type: 'mouse', action: 'move', x: pos.x, y: pos.y }));
                        pendingMoveRef.current = null;
                    }
                }, 33 - elapsed);
            }
        }
        return true;
    }, []);

    return { isConnected, sendCommand, sendMouseData };
}
