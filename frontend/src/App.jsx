// App.jsx — Main application shell (Phase 3)
// Orchestrates: CameraView, GesturePanel, TrainingWizard, CustomActionCreator, WebSocket, Toast
// Phase 3: Added Mouse Control Mode — toggle between gesture recognition and full mouse control.

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import CameraView from './components/CameraView';
import { BackgroundRippleEffect } from './components/BackgroundRippleEffect';
import GesturePanel from './components/GesturePanel';
import AppSidebar from './components/AppSidebar';
import TrainingWizard from './components/TrainingWizard';
import CustomActionCreator from './components/CustomActionCreator';
import { ToastContainer, useToast } from './components/Toast';
import { useWebSocket } from './hooks/useWebSocket';
import { GestureClassifier } from './engine/GestureClassifier';
import { MouseController } from './engine/MouseController';
import { getGestureMapping, setGestureMapping, mapGestureToAction, mergeCustomActions } from './config/gestures.jsx';
import './index.css';

const CONFIDENCE_THRESHOLD = 0.6;
const DEBOUNCE_MS = 150;    // gesture must persist for 150ms before triggering
const COOLDOWN_MS = 600;    // 600ms cooldown between triggers
const API_BASE = 'http://127.0.0.1:8765';

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [appMode, setAppMode] = useState('gesture'); // 'gesture' | 'mouse'
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardPrefill, setWizardPrefill] = useState({ name: '', action: '' });
  const [customCreatorOpen, setCustomCreatorOpen] = useState(false);
  const [customActions, setCustomActions] = useState([]);
  const [activeGesture, setActiveGesture] = useState(null);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [gestureState, setGestureState] = useState('idle');
  const [gestureMapping, setMapping] = useState(getGestureMapping);
  const [mouseInfo, setMouseInfo] = useState({ clicking: null }); // for UI feedback
  const [, setRefreshKey] = useState(0);

  const classifierRef = useRef(null);
  const cameraRef = useRef(null);
  const mouseControllerRef = useRef(null);
  const gestureStartTimeRef = useRef(0);
  const lastGestureRef = useRef(null);
  const cooldownRef = useRef(false);

  const { isConnected, sendCommand, sendMouseData } = useWebSocket();
  const { toasts, addToast } = useToast();

  // Initialize classifier (once)
  const classifier = useMemo(() => {
    if (!classifierRef.current) {
      classifierRef.current = new GestureClassifier();
    }
    return classifierRef.current;
  }, []);

  // Initialize mouse controller (once)
  const mouseController = useMemo(() => {
    if (!mouseControllerRef.current) {
      mouseControllerRef.current = new MouseController();
    }
    return mouseControllerRef.current;
  }, []);

  // Fetch screen dimensions from backend for mouse mode
  useEffect(() => {
    async function fetchScreenInfo() {
      try {
        const res = await fetch(`${API_BASE}/api/screen-info`);
        const data = await res.json();
        if (data.width && data.height) {
          mouseController.setScreenSize(data.width, data.height);
          console.log(`[Mouse] Screen: ${data.width}x${data.height}`);
        }
      } catch {
        // Backend not up yet, will use defaults (1920x1080)
      }
    }
    fetchScreenInfo();
  }, [mouseController]);

  // Fetch custom actions from backend on mount
  const fetchCustomActions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/custom-actions`);
      const data = await res.json();
      if (data.actions) {
        setCustomActions(data.actions);
        mergeCustomActions(data.actions);
      }
    } catch {
      // Backend may not be running yet
    }
  }, []);

  useEffect(() => {
    fetchCustomActions();
  }, [fetchCustomActions]);

  // Reset mouse controller when mode changes
  useEffect(() => {
    if (appMode === 'gesture') {
      mouseController.reset();
      setMouseInfo({ clicking: null });
    } else {
      // Clear gesture state when switching to mouse
      setActiveGesture(null);
      setConfidenceScore(0);
      setGestureState('idle');
    }
  }, [appMode, mouseController]);

  // Callback to get current landmarks from CameraView
  const getLandmarks = useCallback(() => {
    return cameraRef.current?.getCurrentLandmarks() || null;
  }, []);

  // Handle landmarks — routes to gesture or mouse mode
  const handleLandmarks = useCallback((landmarks) => {
    // === MOUSE MODE ===
    if (appMode === 'mouse') {
      if (!landmarks) {
        setMouseInfo({ clicking: null });
        return;
      }
      const commands = mouseController.update(landmarks);
      for (const cmd of commands) {
        sendMouseData(cmd.type, cmd.x, cmd.y);
        if (cmd.type === 'left_click') {
          setMouseInfo({ clicking: 'left' });
          setTimeout(() => setMouseInfo({ clicking: null }), 200);
        } else if (cmd.type === 'right_click') {
          setMouseInfo({ clicking: 'right' });
          setTimeout(() => setMouseInfo({ clicking: null }), 200);
        } else if (cmd.type === 'double_click') {
          setMouseInfo({ clicking: 'double' });
          setTimeout(() => setMouseInfo({ clicking: null }), 300);
        }
      }
      return;
    }

    // === GESTURE MODE (existing logic) ===
    if (!landmarks || wizardOpen) {
      setActiveGesture(null);
      setConfidenceScore(0);
      setGestureState(wizardOpen ? 'recording' : 'idle');
      gestureStartTimeRef.current = 0;
      lastGestureRef.current = null;
      return;
    }

    const result = classifier.classify(landmarks);
    const now = Date.now();

    if (result && result.confidence >= CONFIDENCE_THRESHOLD) {
      setActiveGesture(result.gesture);
      setConfidenceScore(result.confidence);
      setGestureState('detected');

      if (lastGestureRef.current !== result.gesture) {
        lastGestureRef.current = result.gesture;
        gestureStartTimeRef.current = now;
      }

      const heldMs = now - gestureStartTimeRef.current;
      if (heldMs >= DEBOUNCE_MS && !cooldownRef.current) {
        const actionCommand = mapGestureToAction(result.gesture);
        if (actionCommand) {
          const sent = sendCommand(actionCommand, result.confidence);
          if (sent) {
            addToast(`Triggered: ${result.gesture} → ${actionCommand}`, 'success');
          } else {
            addToast(`Backend offline — ${actionCommand} not sent`, 'error');
          }
          cooldownRef.current = true;
          gestureStartTimeRef.current = 0;
          lastGestureRef.current = null;
          setTimeout(() => {
            cooldownRef.current = false;
          }, COOLDOWN_MS);
        }
      }
    } else {
      setActiveGesture(null);
      setConfidenceScore(0);
      setGestureState('idle');
      gestureStartTimeRef.current = 0;
      lastGestureRef.current = null;
    }
  }, [appMode, mouseController, classifier, wizardOpen, sendCommand, sendMouseData, addToast]);

  // Handle training completion
  const handleTrain = useCallback((gestureName, actionId) => {
    const newMapping = { ...gestureMapping, [gestureName]: actionId };
    setMapping(newMapping);
    setGestureMapping(newMapping);
    addToast(`Gesture "${gestureName}" trained → ${actionId}`, 'success');
    setRefreshKey(k => k + 1);
  }, [gestureMapping, addToast]);

  // Handle gesture deletion
  const handleDeleteGesture = useCallback((gestureName) => {
    classifier.removeGesture(gestureName);
    const newMapping = { ...gestureMapping };
    delete newMapping[gestureName];
    setMapping(newMapping);
    setGestureMapping(newMapping);
    addToast(`Gesture "${gestureName}" deleted`, 'info');
    setRefreshKey(k => k + 1);
  }, [classifier, gestureMapping, addToast]);

  // Open wizard with pre-fill
  const openWizardPrefilled = useCallback((name, actionId) => {
    setWizardPrefill({ name, action: actionId });
    setWizardOpen(true);
  }, []);

  // Open wizard blank
  const openWizardBlank = useCallback(() => {
    setWizardPrefill({ name: '', action: '' });
    setWizardOpen(true);
  }, []);

  // Handle custom action created by LLM
  const handleCustomActionCreated = useCallback((action) => {
    addToast(`Custom action created: "${action.prompt}"`, 'success');
    fetchCustomActions();
  }, [addToast, fetchCustomActions]);

  // Delete custom action
  const handleDeleteCustomAction = useCallback(async (actionId) => {
    try {
      await fetch(`${API_BASE}/api/delete-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: actionId }),
      });
      const newMapping = { ...gestureMapping };
      for (const [gesture, action] of Object.entries(newMapping)) {
        if (action === actionId) {
          classifier.removeGesture(gesture);
          delete newMapping[gesture];
        }
      }
      setMapping(newMapping);
      setGestureMapping(newMapping);
      addToast('Custom action deleted', 'info');
      fetchCustomActions();
      setRefreshKey(k => k + 1);
    } catch {
      addToast('Failed to delete custom action', 'error');
    }
  }, [gestureMapping, classifier, addToast, fetchCustomActions]);

  // Toggle mode
  const toggleMode = useCallback(() => {
    setAppMode(prev => prev === 'gesture' ? 'mouse' : 'gesture');
  }, []);

  return (
    <>
      {/* Aceternity Ripple Background — sits OUTSIDE the grid to not consume a grid cell */}
      <BackgroundRippleEffect rows={12} cols={32} cellSize={48} />

      <div className="app-shell">
        {/* Header */}
        <header className="header">
          <div className="header-brand">
            <div className="logo">🤚</div>
            <h1>Gesture Control</h1>
          </div>
          <div className="header-status">
            {/* Mode Toggle */}
            <div className="mode-toggle" onClick={toggleMode}>
              <span className={`mode-label ${appMode === 'gesture' ? 'active-mode' : ''}`}>🎯 Gestures</span>
              <div className={`mode-switch ${appMode === 'mouse' ? 'mouse-active' : ''}`}>
                <div className="mode-switch-thumb" />
              </div>
              <span className={`mode-label ${appMode === 'mouse' ? 'active-mode' : ''}`}>🖱️ Mouse</span>
            </div>

            <div className="control-toggle" onClick={() => setIsActive(!isActive)}>
              <div>
                <div className="label">{isActive ? 'Active' : 'Inactive'}</div>
              </div>
              <button className={`toggle-switch ${isActive ? 'active' : ''}`} />
            </div>
          </div>
        </header>

        {/* Camera Viewport — only visible when active */}
        {isActive && (
          <CameraView
            ref={cameraRef}
            isActive={isActive}
            onLandmarks={handleLandmarks}
            gestureLabel={appMode === 'mouse' ? (mouseInfo.clicking ? `${mouseInfo.clicking} click!` : '🖱️ Mouse Mode') : activeGesture}
            gestureState={appMode === 'mouse' ? (mouseInfo.clicking ? 'detected' : 'mouse') : gestureState}
            appMode={appMode}
          />
        )}

        {/* Aceternity Collapsible Sidebar — always visible */}
        <AppSidebar
          appMode={appMode}
          classifier={classifier}
          gestureMapping={gestureMapping}
          customActions={customActions}
          onOpenWizard={openWizardBlank}
          onTrainSuggested={openWizardPrefilled}
          onDeleteGesture={handleDeleteGesture}
          onOpenCustomCreator={() => setCustomCreatorOpen(true)}
          onDeleteCustomAction={handleDeleteCustomAction}
          activeGesture={activeGesture}
          confidenceScore={confidenceScore}
          mouseInfo={mouseInfo}
        />

        {/* Training Wizard Modal */}
        <TrainingWizard
          isOpen={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onTrain={handleTrain}
          classifier={classifier}
          getLandmarks={getLandmarks}
          prefillName={wizardPrefill.name}
          prefillAction={wizardPrefill.action}
        />

        {/* Custom Action Creator Modal */}
        <CustomActionCreator
          isOpen={customCreatorOpen}
          onClose={() => setCustomCreatorOpen(false)}
          onActionCreated={handleCustomActionCreated}
        />

        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} />
      </div>
    </>
  );
}
