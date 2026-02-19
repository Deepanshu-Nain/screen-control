// CameraView — Main viewport component
// Handles webcam capture, MediaPipe hand landmark detection,
// and canvas overlay rendering.
//
// FIXED: Uses refs for callback props to avoid recreating the detection loop.

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

// MediaPipe Hands skeleton connections for drawing
const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],       // Index
    [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
    [0, 13], [13, 14], [14, 15], [15, 16],// Ring
    [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
    [5, 9], [9, 13], [13, 17],            // Palm
];

const CameraView = forwardRef(function CameraView({ isActive, onLandmarks, gestureLabel, gestureState, appMode }, ref) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const handLandmarkerRef = useRef(null);
    const animFrameRef = useRef(null);
    const lastVideoTimeRef = useRef(-1);
    const lastLandmarksRef = useRef(null);

    // Store callbacks/props in refs so the detection loop never needs to be recreated
    const onLandmarksRef = useRef(onLandmarks);
    const gestureStateRef = useRef(gestureState);
    const appModeRef = useRef(appMode);

    const [cameraReady, setCameraReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Keep refs in sync with props
    useEffect(() => { onLandmarksRef.current = onLandmarks; }, [onLandmarks]);
    useEffect(() => { gestureStateRef.current = gestureState; }, [gestureState]);
    useEffect(() => { appModeRef.current = appMode; }, [appMode]);

    // Expose current landmarks to parent
    useImperativeHandle(ref, () => ({
        getCurrentLandmarks: () => lastLandmarksRef.current,
    }));

    // Initialize MediaPipe + Camera + Detection loop
    useEffect(() => {
        if (!isActive) {
            // Stop everything
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = null;
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            setCameraReady(false);
            setError(null);
            return;
        }

        let cancelled = false;

        async function init() {
            // 1. Load MediaPipe
            setLoading(true);
            setError(null);

            try {
                if (!handLandmarkerRef.current) {
                    console.log('[MediaPipe] Loading HandLandmarker...');
                    const vision = await import('@mediapipe/tasks-vision');
                    const { HandLandmarker, FilesetResolver } = vision;

                    const filesetResolver = await FilesetResolver.forVisionTasks(
                        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
                    );

                    if (cancelled) return;

                    const handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
                        baseOptions: {
                            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                            delegate: 'GPU',
                        },
                        runningMode: 'VIDEO',
                        numHands: 1,
                        minHandDetectionConfidence: 0.5,
                        minHandPresenceConfidence: 0.5,
                        minTrackingConfidence: 0.5,
                    });

                    if (cancelled) return;
                    handLandmarkerRef.current = handLandmarker;
                    console.log('[MediaPipe] HandLandmarker ready!');
                }
            } catch (err) {
                console.error('[MediaPipe] Failed to initialize:', err);
                setError('Failed to load hand tracking model. Check your internet connection.');
                setLoading(false);
                return;
            }

            if (cancelled) return;

            // 2. Start Camera
            try {
                console.log('[Camera] Requesting webcam...');
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
                    audio: false,
                });

                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                streamRef.current = stream;
                const video = videoRef.current;
                if (video) {
                    video.srcObject = stream;
                    await video.play();
                    console.log('[Camera] Webcam started');
                    setCameraReady(true);
                    setLoading(false);

                    // 3. Start Detection Loop (only once, using refs for dependencies)
                    lastVideoTimeRef.current = -1;
                    startDetectLoop(video);
                }
            } catch (err) {
                console.error('[Camera] Failed to start:', err);
                setError('Camera access denied. Please allow camera permissions and refresh.');
                setLoading(false);
            }
        }

        function startDetectLoop(video) {
            const canvas = canvasRef.current;
            const handLandmarker = handLandmarkerRef.current;
            if (!canvas || !handLandmarker || cancelled) return;

            const ctx = canvas.getContext('2d');

            // *** Web Worker Timer — NOT throttled in background tabs ***
            // Browsers throttle setInterval to ~1/sec in background tabs.
            // Web Workers run on a separate thread and are exempt from this.
            // The Worker posts 'tick' messages at full speed (~33fps) even
            // when the user switches to another app/tab.
            const workerBlob = new Blob([
                `let id = null;
                 self.onmessage = function(e) {
                     if (e.data === 'start') {
                         if (id) clearInterval(id);
                         id = setInterval(() => self.postMessage('tick'), 16);
                     } else if (e.data === 'stop') {
                         if (id) { clearInterval(id); id = null; }
                     }
                 };`
            ], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(workerBlob);
            const timerWorker = new Worker(workerUrl);

            timerWorker.onmessage = () => {
                if (cancelled) return;

                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;

                if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
                    lastVideoTimeRef.current = video.currentTime;

                    try {
                        const results = handLandmarker.detectForVideo(video, performance.now());
                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        if (results.landmarks && results.landmarks.length > 0) {
                            const landmarks = results.landmarks[0];
                            lastLandmarksRef.current = landmarks;
                            drawSkeleton(ctx, landmarks, canvas.width, canvas.height, gestureStateRef.current, appModeRef.current);
                            onLandmarksRef.current?.(landmarks);
                        } else {
                            lastLandmarksRef.current = null;
                            onLandmarksRef.current?.(null);
                        }
                    } catch (err) {
                        // MediaPipe can occasionally throw on frame skip; just continue
                    }
                }
            };

            timerWorker.postMessage('start');
            // Store worker ref for cleanup
            animFrameRef.current = { worker: timerWorker, blobUrl: workerUrl };
        }

        init();

        return () => {
            cancelled = true;
            if (animFrameRef.current) {
                if (animFrameRef.current.worker) {
                    animFrameRef.current.worker.postMessage('stop');
                    animFrameRef.current.worker.terminate();
                    URL.revokeObjectURL(animFrameRef.current.blobUrl);
                } else {
                    clearInterval(animFrameRef.current);
                }
                animFrameRef.current = null;
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            setCameraReady(false);
        };
    }, [isActive]); // ONLY depends on isActive — everything else is via refs

    // Determine overlay badge
    const overlayClass = gestureState === 'recording'
        ? 'recording'
        : gestureLabel
            ? 'detected'
            : 'idle';

    const overlayText = gestureState === 'recording'
        ? '🔴 Recording...'
        : gestureLabel
            ? `✅ ${gestureLabel}`
            : '👋 Show your hand';

    return (
        <div className="main-viewport">
            <div className="camera-container">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ display: cameraReady ? 'block' : 'none' }}
                />
                <canvas ref={canvasRef} />

                {!cameraReady && (
                    <div className="camera-placeholder">
                        <div className="icon">{loading ? '⏳' : error ? '⚠️' : '📷'}</div>
                        <p>{
                            error ? error
                                : loading ? 'Loading hand tracking model... (first time may take ~10s)'
                                    : isActive ? 'Starting camera...'
                                        : 'Click "Active" to start camera'
                        }</p>
                    </div>
                )}

                <div className={`gesture-overlay ${overlayClass}`}>
                    {overlayText}
                </div>
            </div>
        </div>
    );
});

// --- Drawing Helpers ---

function drawSkeleton(ctx, landmarks, w, h, state, mode) {
    // Mirror the x-coordinates to match the mirrored video
    const mirroredLandmarks = landmarks.map(lm => ({
        x: 1 - lm.x,
        y: lm.y,
    }));

    if (mode === 'mouse') {
        // Mouse mode: special color scheme
        // Connections in muted cyan
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;

        for (const [i, j] of HAND_CONNECTIONS) {
            const a = mirroredLandmarks[i];
            const b = mirroredLandmarks[j];
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
        }

        // Draw all points small
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < mirroredLandmarks.length; i++) {
            const lm = mirroredLandmarks[i];
            ctx.beginPath();
            ctx.arc(lm.x * w, lm.y * h, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#64748b';
            ctx.fill();
        }

        // Highlight key fingertips: thumb=red, index=blue, middle=green
        ctx.globalAlpha = 1;
        const tipColors = { 4: '#ef4444', 8: '#3b82f6', 12: '#22c55e' };
        for (const [idx, color] of Object.entries(tipColors)) {
            const lm = mirroredLandmarks[parseInt(idx)];
            ctx.beginPath();
            ctx.arc(lm.x * w, lm.y * h, 8, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw cursor crosshair at index fingertip position
        const cursorX = mirroredLandmarks[8].x;
        const cursorY = mirroredLandmarks[8].y;
        const cx = cursorX * w;
        const cy = cursorY * h;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12); ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();

        return;
    }

    // --- Gesture mode: original drawing ---
    const color = state === 'recording'
        ? '#ef4444'
        : state === 'detected'
            ? '#22c55e'
            : '#94a3b8';

    const pointColor = state === 'recording'
        ? '#fca5a5'
        : state === 'detected'
            ? '#86efac'
            : '#cbd5e1';

    // Draw connections
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;

    for (const [i, j] of HAND_CONNECTIONS) {
        const a = mirroredLandmarks[i];
        const b = mirroredLandmarks[j];
        ctx.beginPath();
        ctx.moveTo(a.x * w, a.y * h);
        ctx.lineTo(b.x * w, b.y * h);
        ctx.stroke();
    }

    // Draw points
    ctx.globalAlpha = 1;
    for (let i = 0; i < mirroredLandmarks.length; i++) {
        const lm = mirroredLandmarks[i];
        const radius = [0, 4, 8, 12, 16, 20].includes(i) ? 5 : 3;
        ctx.beginPath();
        ctx.arc(lm.x * w, lm.y * h, radius, 0, Math.PI * 2);
        ctx.fillStyle = pointColor;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

export default CameraView;
