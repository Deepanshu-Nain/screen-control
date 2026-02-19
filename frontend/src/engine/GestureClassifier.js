// KNN-based Gesture Classifier with persistence (localStorage)
// Implements "One-Click" training from the architecture spec

import { normalizeLandmarks, euclideanDistance } from '../utils/normalization';

const STORAGE_KEY = 'gesture_classifier_dataset';
const K = 5; // number of neighbors

export class GestureClassifier {
    constructor() {
        // dataset: { [gestureName]: Float32Array[] }
        this.dataset = {};
        this.loadFromStorage();
    }

    /**
     * Add a training sample for a gesture.
     * @param {string} gestureName
     * @param {Array} rawLandmarks - 21 MediaPipe landmarks
     */
    addSample(gestureName, rawLandmarks) {
        const normalized = normalizeLandmarks(rawLandmarks);
        if (!normalized) return false;

        if (!this.dataset[gestureName]) {
            this.dataset[gestureName] = [];
        }

        this.dataset[gestureName].push(Array.from(normalized));
        this.saveToStorage();
        return true;
    }

    /**
     * Classify the current hand pose.
     * @param {Array} rawLandmarks - 21 MediaPipe landmarks
     * @returns {{ gesture: string, confidence: number } | null}
     */
    classify(rawLandmarks) {
        const normalized = normalizeLandmarks(rawLandmarks);
        if (!normalized) return null;

        const classNames = Object.keys(this.dataset);
        if (classNames.length === 0) return null;

        // Compute distances to ALL samples
        const distances = [];
        for (const className of classNames) {
            for (const sample of this.dataset[className]) {
                const dist = euclideanDistance(normalized, new Float32Array(sample));
                distances.push({ className, dist });
            }
        }

        if (distances.length === 0) return null;

        // Sort by distance (ascending)
        distances.sort((a, b) => a.dist - b.dist);

        // Take K nearest neighbors
        const k = Math.min(K, distances.length);
        const neighbors = distances.slice(0, k);

        // Vote: count how many of each class appear
        const votes = {};
        for (const n of neighbors) {
            votes[n.className] = (votes[n.className] || 0) + 1;
        }

        // Find the class with the most votes
        let bestClass = null;
        let bestVotes = 0;
        for (const [cls, count] of Object.entries(votes)) {
            if (count > bestVotes) {
                bestVotes = count;
                bestClass = cls;
            }
        }

        const confidence = bestVotes / k;
        return { gesture: bestClass, confidence };
    }

    /**
     * Get all gesture names.
     */
    getGestureNames() {
        return Object.keys(this.dataset);
    }

    /**
     * Get sample count for a gesture.
     */
    getSampleCount(gestureName) {
        return this.dataset[gestureName]?.length || 0;
    }

    /**
     * Get total sample count.
     */
    getTotalSamples() {
        return Object.values(this.dataset).reduce((sum, arr) => sum + arr.length, 0);
    }

    /**
     * Remove a gesture class entirely.
     */
    removeGesture(gestureName) {
        delete this.dataset[gestureName];
        this.saveToStorage();
    }

    /**
     * Clear all data.
     */
    clearAll() {
        this.dataset = {};
        this.saveToStorage();
    }

    // --- Persistence ---

    saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.dataset));
        } catch (e) {
            console.warn('[Classifier] Failed to save to localStorage:', e);
        }
    }

    loadFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                this.dataset = JSON.parse(raw);
                console.log('[Classifier] Loaded dataset:', Object.keys(this.dataset).map(k => `${k}(${this.dataset[k].length})`).join(', '));
            }
        } catch (e) {
            console.warn('[Classifier] Failed to load from localStorage:', e);
            this.dataset = {};
        }
    }
}
