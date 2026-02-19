// TrainingWizard — Step-by-step modal for recording new gestures
// Follows the "Wizard Pattern" from the architecture spec:
// 1. Instruction → 2. Countdown → 3. Recording → 4. Verification → 5. Binding
//
// FIXED: Uses a landmark callback instead of a stale ref prop.

import { useState, useEffect, useRef } from 'react';
import { AVAILABLE_ACTIONS } from '../config/gestures.jsx';

const RECORDING_FRAMES = 50;
const COUNTDOWN_SECONDS = 3;

export default function TrainingWizard({ isOpen, onClose, onTrain, classifier, getLandmarks, prefillName, prefillAction }) {
    const [step, setStep] = useState('setup');
    const [gestureName, setGestureName] = useState('');
    const [selectedAction, setSelectedAction] = useState('switch_tab');
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
    const [recordedFrames, setRecordedFrames] = useState(0);
    const [verifyResult, setVerifyResult] = useState(null);

    const recordingRef = useRef(false);
    const frameCountRef = useRef(0);

    // Reset when opened, apply prefill if provided
    useEffect(() => {
        if (isOpen) {
            setStep('setup');
            setGestureName(String(prefillName || ''));
            setSelectedAction(String(prefillAction || 'switch_tab'));
            setCountdown(COUNTDOWN_SECONDS);
            setRecordedFrames(0);
            setVerifyResult(null);
            recordingRef.current = false;
            frameCountRef.current = 0;
        }
    }, [isOpen, prefillName, prefillAction]);

    // Countdown timer
    useEffect(() => {
        if (step !== 'countdown') return;
        if (countdown <= 0) {
            setStep('recording');
            recordingRef.current = true;
            frameCountRef.current = 0;
            return;
        }
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [step, countdown]);

    // Recording: capture frames using getLandmarks callback
    useEffect(() => {
        if (step !== 'recording' || !recordingRef.current) return;

        const interval = setInterval(() => {
            const landmarks = getLandmarks?.();
            if (landmarks && classifier) {
                classifier.addSample(gestureName, landmarks);
                frameCountRef.current += 1;
                setRecordedFrames(frameCountRef.current);

                if (frameCountRef.current >= RECORDING_FRAMES) {
                    recordingRef.current = false;
                    setStep('verify');
                }
            }
        }, 40); // ~25 fps capture rate

        return () => clearInterval(interval);
    }, [step, classifier, gestureName, getLandmarks]);

    // Verification: live classification feedback
    useEffect(() => {
        if (step !== 'verify') return;

        const interval = setInterval(() => {
            const landmarks = getLandmarks?.();
            if (landmarks && classifier) {
                const result = classifier.classify(landmarks);
                setVerifyResult(result);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [step, classifier, getLandmarks]);

    const handleStartRecording = () => {
        if (!gestureName.trim()) return;
        setCountdown(COUNTDOWN_SECONDS);
        setStep('countdown');
    };

    const handleComplete = () => {
        onTrain(gestureName, selectedAction);
        onClose();
    };

    const progressPercent = (recordedFrames / RECORDING_FRAMES) * 100;
    const circumference = 2 * Math.PI * 45;
    const strokeOffset = circumference - (progressPercent / 100) * circumference;

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                {/* Step 1: Setup */}
                {step === 'setup' && (
                    <>
                        <h3>✨ Train Gesture</h3>
                        <p>
                            Name your gesture and choose an action. Then hold your hand pose in front of the camera for recording.
                        </p>
                        <div className="form-group">
                            <label>Gesture Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Peace Sign, Thumbs Up, Fist..."
                                value={gestureName}
                                onChange={e => setGestureName(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label>Action to Trigger</label>
                            <select value={selectedAction} onChange={e => setSelectedAction(e.target.value)}>
                                {AVAILABLE_ACTIONS.map(a => (
                                    <option key={a.id} value={a.id}>{a.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleStartRecording}
                                disabled={!gestureName.trim()}
                            >
                                Start Recording →
                            </button>
                        </div>
                    </>
                )}

                {/* Step 2: Countdown */}
                {step === 'countdown' && (
                    <>
                        <h3>Get Ready!</h3>
                        <p>Hold the "<strong>{gestureName}</strong>" pose with your hand in front of the camera.</p>
                        <div className="recording-progress">
                            <div className="recording-ring">
                                <div className="recording-count" style={{ fontSize: '48px', color: 'var(--warning)' }}>
                                    {countdown}
                                </div>
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Recording starts in {countdown}...</p>
                        </div>
                    </>
                )}

                {/* Step 3: Recording */}
                {step === 'recording' && (
                    <>
                        <h3>🔴 Recording...</h3>
                        <p>Hold steady! Capturing gesture data for "<strong>{gestureName}</strong>".</p>
                        <div className="recording-progress">
                            <div className="recording-ring">
                                <svg viewBox="0 0 100 100">
                                    <circle className="bg-circle" cx="50" cy="50" r="45" />
                                    <circle
                                        className="progress-circle"
                                        cx="50" cy="50" r="45"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeOffset}
                                    />
                                </svg>
                                <div className="recording-count">{recordedFrames}</div>
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                {recordedFrames} / {RECORDING_FRAMES} frames captured
                            </p>
                        </div>
                    </>
                )}

                {/* Step 4: Verification */}
                {step === 'verify' && (
                    <>
                        <h3>✅ Verify Your Gesture</h3>
                        <p>Perform the "<strong>{gestureName}</strong>" gesture again. The confidence meter should react.</p>

                        <div style={{ padding: '16px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Detected:</span>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: verifyResult?.gesture === gestureName ? 'var(--success)' : 'var(--text-muted)' }}>
                                    {verifyResult?.gesture || 'None'}
                                </span>
                            </div>
                            <div className="confidence-meter">
                                <div
                                    className="confidence-fill"
                                    style={{
                                        width: `${(verifyResult?.confidence || 0) * 100}%`,
                                        background: verifyResult?.gesture === gestureName
                                            ? 'linear-gradient(90deg, var(--accent-primary), var(--success))'
                                            : 'var(--text-muted)',
                                    }}
                                />
                            </div>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>
                                Confidence: {((verifyResult?.confidence || 0) * 100).toFixed(0)}%
                            </p>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => {
                                // Re-record
                                classifier.removeGesture(gestureName);
                                setRecordedFrames(0);
                                frameCountRef.current = 0;
                                setStep('setup');
                            }}>
                                ↩ Re-record
                            </button>
                            <button className="btn btn-primary" onClick={handleComplete}>
                                Save Gesture ✓
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
