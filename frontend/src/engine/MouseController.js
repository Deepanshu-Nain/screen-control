/**
 * MouseController — Real-time hand-to-cursor mapping engine (v2).
 *
 * Cursor position = index fingertip (LM 8) ONLY.
 * Left click  = thumb tip (LM 4) pinches index  tip (LM 8).
 * Right click = thumb tip (LM 4) pinches middle tip (LM 12).
 * Double click = two rapid left-click pinches within 400ms.
 *
 * Uses Exponential Moving Average (EMA) for smooth cursor movement.
 */

// MediaPipe landmark indices
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;

// Tuning constants
const EMA_ALPHA = 0.5;     // Higher = more responsive (was 0.35)
const CLICK_THRESHOLD = 0.045;   // Normalised distance to trigger a pinch-click
const CLICK_RELEASE = 0.065;   // Distance to release (hysteresis prevents flicker)
const CLICK_COOLDOWN = 300;     // ms cooldown between clicks
const DBLCLICK_WINDOW = 400;     // ms window for double-click detection

// Active zone — the region of the webcam frame that maps to the full screen.
// A smaller zone means less hand movement is needed to cover the whole screen.
// Values are in normalized webcam coordinates (0-1).
const ZONE_X_MIN = 0.10;   // Left edge of active zone
const ZONE_X_MAX = 0.90;   // Right edge of active zone
const ZONE_Y_MIN = 0.12;   // Top edge of active zone
const ZONE_Y_MAX = 0.65;   // Bottom edge — you don't need to reach the very
// bottom of the camera frame anymore

export class MouseController {
    constructor() {
        // Smoothed cursor position (normalised 0-1)
        this.smoothX = 0.5;
        this.smoothY = 0.5;
        this.initialised = false;

        // Click state with hysteresis
        this.leftPinching = false;
        this.rightPinching = false;
        this.lastLeftClick = 0;
        this.lastRightClick = 0;

        // Double-click tracking
        this.leftClickTimes = []; // timestamps of recent left clicks

        // Screen dimensions (fetched from backend)
        this.screenW = 1920;
        this.screenH = 1080;
    }

    /** Set actual screen dimensions (call once after fetching /api/screen-info). */
    setScreenSize(w, h) {
        this.screenW = w;
        this.screenH = h;
    }

    /**
     * Process a frame of landmarks.
     * @param {Array} landmarks — 21 normalised landmarks from MediaPipe
     * @returns {Array<{type: string, x: number, y: number}>} commands to send
     */
    update(landmarks) {
        if (!landmarks || landmarks.length < 21) return [];

        const thumb = landmarks[THUMB_TIP];
        const index = landmarks[INDEX_TIP];
        const middle = landmarks[MIDDLE_TIP];

        // --- 1. Cursor position (INDEX FINGER TIP ONLY) ---
        // Mirror x because webcam is mirrored
        const rawX = 1 - index.x;
        const rawY = index.y;

        // Re-map from the active zone to [0, 1] for full screen coverage
        // Hand within [ZONE_Y_MIN..ZONE_Y_MAX] covers the entire screen height
        const mappedX = clamp((rawX - ZONE_X_MIN) / (ZONE_X_MAX - ZONE_X_MIN), 0, 1);
        const mappedY = clamp((rawY - ZONE_Y_MIN) / (ZONE_Y_MAX - ZONE_Y_MIN), 0, 1);

        // EMA smoothing
        if (!this.initialised) {
            this.smoothX = mappedX;
            this.smoothY = mappedY;
            this.initialised = true;
        } else {
            this.smoothX = EMA_ALPHA * mappedX + (1 - EMA_ALPHA) * this.smoothX;
            this.smoothY = EMA_ALPHA * mappedY + (1 - EMA_ALPHA) * this.smoothY;
        }

        // Screen-space coordinates
        const screenX = Math.round(this.smoothX * this.screenW);
        const screenY = Math.round(this.smoothY * this.screenH);

        const commands = [];

        // Always emit a move command
        commands.push({ type: 'move', x: screenX, y: screenY });

        // --- 2. Click detection (with hysteresis + double-click) ---
        const now = Date.now();

        // Left click: thumb ↔ index distance
        const leftDist = dist2D(thumb, index);
        if (!this.leftPinching && leftDist < CLICK_THRESHOLD) {
            this.leftPinching = true;
            if (now - this.lastLeftClick > CLICK_COOLDOWN) {
                this.lastLeftClick = now;

                // Double-click detection: check if another click happened within DBLCLICK_WINDOW
                this.leftClickTimes.push(now);
                // Keep only clicks within the window
                this.leftClickTimes = this.leftClickTimes.filter(t => now - t <= DBLCLICK_WINDOW);

                if (this.leftClickTimes.length >= 2) {
                    // Double click detected!
                    commands.push({ type: 'double_click', x: screenX, y: screenY });
                    this.leftClickTimes = []; // reset
                } else {
                    commands.push({ type: 'left_click', x: screenX, y: screenY });
                }
            }
        } else if (this.leftPinching && leftDist > CLICK_RELEASE) {
            this.leftPinching = false;
        }

        // Right click: thumb ↔ middle distance
        const rightDist = dist2D(thumb, middle);
        if (!this.rightPinching && rightDist < CLICK_THRESHOLD) {
            this.rightPinching = true;
            if (now - this.lastRightClick > CLICK_COOLDOWN) {
                this.lastRightClick = now;
                commands.push({ type: 'right_click', x: screenX, y: screenY });
            }
        } else if (this.rightPinching && rightDist > CLICK_RELEASE) {
            this.rightPinching = false;
        }

        return commands;
    }

    /** Reset state (e.g. when switching modes). */
    reset() {
        this.smoothX = 0.5;
        this.smoothY = 0.5;
        this.initialised = false;
        this.leftPinching = false;
        this.rightPinching = false;
        this.leftClickTimes = [];
    }

    /** Current pinch state for UI feedback. */
    getPinchState() {
        return {
            leftPinching: this.leftPinching,
            rightPinching: this.rightPinching,
        };
    }
}

// --- Helpers ---

function dist2D(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}
