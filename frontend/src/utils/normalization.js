// Gesture normalization utilities
// Implements Translation & Scale Invariance for MediaPipe hand landmarks

/**
 * Normalize raw MediaPipe landmarks to be invariant to position and scale.
 * 1. Translate so wrist (landmark 0) is at origin (0,0)
 * 2. Scale by palm size (wrist to middle-finger-MCP distance)
 * 3. Flatten to 1D array of size 42 (21 landmarks × 2 coords)
 *
 * @param {Array} landmarks - Array of 21 {x, y, z} objects from MediaPipe
 * @returns {Float32Array} - Normalized flat array of 42 values
 */
export function normalizeLandmarks(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;

  const wrist = landmarks[0];
  const middleMCP = landmarks[9];

  // 1. Translate: center on wrist
  const centered = landmarks.map(lm => ({
    x: lm.x - wrist.x,
    y: lm.y - wrist.y,
  }));

  // 2. Scale: normalize by palm size
  const palmSize = Math.sqrt(
    Math.pow(middleMCP.x - wrist.x, 2) +
    Math.pow(middleMCP.y - wrist.y, 2)
  );

  // Avoid division by zero
  const scale = palmSize > 0.001 ? palmSize : 0.001;

  const normalized = centered.map(lm => ({
    x: lm.x / scale,
    y: lm.y / scale,
  }));

  // 3. Flatten to 1D array [x0, y0, x1, y1, ..., x20, y20]
  const flat = new Float32Array(42);
  for (let i = 0; i < 21; i++) {
    flat[i * 2] = normalized[i].x;
    flat[i * 2 + 1] = normalized[i].y;
  }

  return flat;
}

/**
 * Calculate Euclidean distance between two flat landmark vectors.
 * Used by the KNN classifier.
 */
export function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}
