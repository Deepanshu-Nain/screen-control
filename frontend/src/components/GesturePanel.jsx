// GesturePanel — Sidebar with trained gestures, suggested gestures, custom actions, and controls.

import { AVAILABLE_ACTIONS, SUGGESTED_GESTURES } from '../config/gestures.jsx';

export default function GesturePanel({
    classifier,
    gestureMapping,
    customActions,
    onOpenWizard,
    onTrainSuggested,
    onDeleteGesture,
    onOpenCustomCreator,
    onDeleteCustomAction,
    activeGesture,
    confidenceScore,
}) {
    const gestureNames = classifier ? classifier.getGestureNames() : [];

    // Figure out which suggested gestures are NOT yet trained
    const trainedActions = new Set(Object.values(gestureMapping));
    const untrained = SUGGESTED_GESTURES.filter(s => !trainedActions.has(s.actionId));

    return (
        <div className="sidebar">
            {/* Untrained Suggested Gestures */}
            {untrained.length > 0 && (
                <div className="sidebar-section">
                    <h2>⚠️ Needs Training</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '10px' }}>
                        Train your own hand pose for each action:
                    </p>
                    <div className="gesture-list">
                        {untrained.map(s => {
                            const action = AVAILABLE_ACTIONS.find(a => a.id === s.actionId);
                            return (
                                <div key={s.actionId} className="gesture-card" style={{ cursor: 'pointer' }}
                                    onClick={() => onTrainSuggested(s.suggestedGestureName, s.actionId)}>
                                    <div className="gesture-icon" style={{
                                        background: 'rgba(245, 158, 11, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {(() => {
                                            const Icon = action?.icon || '❓';
                                            return typeof Icon === 'function' ? <Icon /> : Icon;
                                        })()}
                                    </div>
                                    <div className="gesture-info">
                                        <div className="name">{action?.label || s.actionId}</div>
                                        <div className="action" style={{ color: 'var(--warning)' }}>Click to train →</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Trained Gestures */}
            <div className="sidebar-section">
                <h2>🎯 Trained Gestures</h2>
                {gestureNames.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        No gestures trained yet. Click an action above or use <strong>"Train Custom Gesture"</strong> below.
                    </p>
                ) : (
                    <div className="gesture-list">
                        {gestureNames.map(name => {
                            const sampleCount = classifier.getSampleCount(name);
                            const isActive = activeGesture === name;
                            const actionId = gestureMapping[name];
                            const actionLabel = AVAILABLE_ACTIONS.find(a => a.id === actionId)?.label || actionId || 'Unmapped';

                            return (
                                <div key={name} className={`gesture-card ${isActive ? 'active-gesture' : ''}`}>
                                    <div className="gesture-icon" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {isActive ? '✅' : '✋'}
                                    </div>
                                    <div className="gesture-info">
                                        <div className="name">{name}</div>
                                        <div className="action">→ {actionLabel}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            {sampleCount} samples
                                        </div>
                                    </div>
                                    {isActive && confidenceScore > 0 && (
                                        <div className="gesture-confidence">
                                            {(confidenceScore * 100).toFixed(0)}%
                                        </div>
                                    )}
                                    <button
                                        className="px-2 py-1 ml-1 rounded-md border border-red-500/25 bg-red-500/10 text-red-400 text-[11px] cursor-pointer hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] transition-all duration-300"
                                        onClick={() => onDeleteGesture(name)}
                                        title="Delete gesture"
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Custom AI Actions */}
            {customActions && customActions.length > 0 && (
                <div className="sidebar-section">
                    <h2>🧠 Custom Actions</h2>
                    <div className="gesture-list">
                        {customActions.map(ca => {
                            const isMapped = trainedActions.has(ca.id);
                            // Look up the full action object to get the Smart Icon
                            const actionObj = AVAILABLE_ACTIONS.find(a => a.id === ca.id);

                            return (
                                <div key={ca.id} className="gesture-card">
                                    <div className="gesture-icon" style={{
                                        background: 'rgba(139, 92, 246, 0.15)',
                                        color: 'var(--accent-secondary)',
                                        fontSize: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {(() => {
                                            const Icon = actionObj?.icon || '🧠';
                                            return typeof Icon === 'function' ? <Icon /> : Icon;
                                        })()}
                                    </div>
                                    <div className="gesture-info">
                                        <div className="name">{ca.prompt}</div>
                                        <div className="action" style={{ color: isMapped ? 'var(--success)' : 'var(--text-muted)' }}>
                                            {isMapped ? 'Gesture trained ✓' : 'Needs gesture'}
                                        </div>
                                    </div>
                                    {!isMapped && (
                                        <button
                                            className="px-2 py-1 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-semibold cursor-pointer hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:-translate-y-0.5 transition-all duration-300"
                                            onClick={() => onTrainSuggested(ca.prompt, ca.id)}
                                        >
                                            Train
                                        </button>
                                    )}
                                    <button
                                        className="px-2 py-1 ml-1 rounded-md border border-red-500/25 bg-red-500/10 text-red-400 text-[11px] cursor-pointer hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] transition-all duration-300"
                                        onClick={() => onDeleteCustomAction(ca.id)}
                                        title="Delete custom action"
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="sidebar-section">
                <h2>⚡ Create</h2>
                <button className="w-full p-[3px] relative cursor-pointer" onClick={onOpenWizard}>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg" />
                    <div className="w-full px-4 py-2.5 bg-slate-950 rounded-[6px] relative group transition duration-200 text-white text-sm font-semibold text-center hover:bg-transparent">
                        ✨ Train Custom Gesture
                    </div>
                </button>
                <button
                    className="w-full mt-2 px-4 py-2.5 rounded-lg relative bg-slate-700 text-white text-sm font-semibold cursor-pointer hover:shadow-2xl hover:shadow-white/[0.1] transition duration-200 border border-slate-600"
                    onClick={onOpenCustomCreator}
                >
                    <div className="absolute inset-x-0 h-px w-1/2 mx-auto -top-px shadow-2xl bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
                    <span className="relative z-20">🧠 Create AI Action</span>
                </button>
            </div>

            {/* Stats */}
            <div className="sidebar-section">
                <h2>📊 Stats</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <StatCard label="Gestures" value={gestureNames.length} />
                    <StatCard label="Samples" value={classifier ? classifier.getTotalSamples() : 0} />
                    <StatCard label="Custom" value={customActions?.length || 0} />
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div style={{
            padding: '10px 6px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)',
            textAlign: 'center',
        }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-primary)' }}>{value}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
        </div>
    );
}
