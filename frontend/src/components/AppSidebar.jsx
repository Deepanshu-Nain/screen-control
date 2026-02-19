/**
 * AppSidebar — Aceternity-style collapsible sidebar.
 * Collapses to icon-only (60px) and expands on hover (280px).
 * Shows: Trained gestures, Suggestions to train, Custom actions.
 */
import { useState, createContext, useContext } from 'react';
import { FiActivity, FiMousePointer, FiPlus, FiTrash2, FiZap, FiCrosshair, FiTarget, FiLayers, FiCheck, FiChevronRight } from 'react-icons/fi';
import { AVAILABLE_ACTIONS, SUGGESTED_GESTURES, BUILTIN_ACTIONS } from '../config/gestures.jsx';

const SidebarContext = createContext({ open: false });

export default function AppSidebar({
    appMode,
    classifier,
    gestureMapping = {},
    customActions = [],
    onOpenWizard,
    onTrainSuggested,
    onDeleteGesture,
    onOpenCustomCreator,
    onDeleteCustomAction,
    activeGesture,
    confidenceScore = 0,
    mouseInfo = {},
}) {
    const [open, setOpen] = useState(false);

    const trainedGestures = classifier?.getGestureNames?.() || [];
    const suggestionsAvailable = SUGGESTED_GESTURES.filter(
        (g) => !trainedGestures.includes(g.name)
    );

    // Helper to get action label from action id
    const getActionLabel = (actionId) => {
        const action = AVAILABLE_ACTIONS.find(a => a.id === actionId);
        return action ? action.label || action.name : actionId;
    };

    const getActionIcon = (actionId) => {
        const action = [...BUILTIN_ACTIONS, ...AVAILABLE_ACTIONS].find(a => a.id === actionId);
        return action?.icon || '⚡';
    };

    return (
        <SidebarContext.Provider value={{ open }}>
            <aside
                className={`ace-sidebar ${open ? 'ace-sidebar-open' : ''}`}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
            >
                <div className="ace-sidebar-inner">
                    {/* Logo / brand */}
                    <div className="ace-sidebar-brand">
                        <div className="ace-sidebar-logo">✋</div>
                        {open && <span className="ace-sidebar-title">Gesture Control</span>}
                    </div>

                    {/* Navigation links */}
                    <nav className="ace-sidebar-nav">
                        {appMode === 'gesture' ? (
                            <>
                                {/* Live Detection Stats */}
                                <SidebarSection icon={<FiActivity />} label="Live Detection">
                                    {open && (
                                        <div className="ace-sidebar-stats">
                                            <div className="ace-stat-card">
                                                <span className="ace-stat-value">{activeGesture || '—'}</span>
                                                <span className="ace-stat-label">Active Gesture</span>
                                            </div>
                                            <div className="ace-stat-card">
                                                <span className="ace-stat-value">{Math.round(confidenceScore * 100)}%</span>
                                                <span className="ace-stat-label">Confidence</span>
                                            </div>
                                        </div>
                                    )}
                                </SidebarSection>

                                {/* ── Trained Gestures ── */}
                                <SidebarSection icon={<FiLayers />} label={`Trained (${trainedGestures.length})`}>
                                    {open && (
                                        <div className="ace-sidebar-list">
                                            {trainedGestures.length === 0 ? (
                                                <div className="ace-empty-state">
                                                    <span className="ace-empty-icon">🎯</span>
                                                    <p className="ace-empty-text">No gestures trained yet</p>
                                                    <p className="ace-empty-hint">Train your first gesture to get started</p>
                                                </div>
                                            ) : (
                                                trainedGestures.map((name) => {
                                                    const mapping = gestureMapping[name];
                                                    const isActive = activeGesture === name;
                                                    return (
                                                        <div
                                                            key={name}
                                                            className={`ace-trained-item ${isActive ? 'ace-trained-active' : ''}`}
                                                        >
                                                            <div className="ace-trained-indicator">
                                                                <span className={`ace-trained-dot ${isActive ? 'ace-dot-active' : ''}`} />
                                                            </div>
                                                            <div className="ace-trained-info">
                                                                <span className="ace-trained-name">{name}</span>
                                                                <span className="ace-trained-action">
                                                                    {mapping ? (
                                                                        <>
                                                                            <FiChevronRight size={10} style={{ opacity: 0.5 }} />
                                                                            <span>{getActionIcon(mapping)} {getActionLabel(mapping)}</span>
                                                                        </>
                                                                    ) : (
                                                                        <span className="ace-unbound-tag">Unbound</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <button
                                                                className="ace-delete-btn"
                                                                onClick={() => onDeleteGesture(name)}
                                                                title="Delete gesture"
                                                            >
                                                                <FiTrash2 size={13} />
                                                            </button>
                                                        </div>
                                                    );
                                                })
                                            )}
                                            <button className="ace-train-btn" onClick={onOpenWizard}>
                                                <FiPlus size={14} /> Train New Gesture
                                            </button>
                                        </div>
                                    )}
                                </SidebarSection>

                                {/* ── Suggestions ── */}
                                {suggestionsAvailable.length > 0 && (
                                    <SidebarSection icon={<FiZap />} label={`Suggestions (${suggestionsAvailable.length})`}>
                                        {open && (
                                            <div className="ace-sidebar-list">
                                                <p className="ace-section-hint">Train these gestures to unlock more controls</p>
                                                {suggestionsAvailable.slice(0, 5).map((g) => (
                                                    <button
                                                        key={g.name}
                                                        className="ace-suggestion-item"
                                                        onClick={() => onTrainSuggested(g)}
                                                    >
                                                        <div className="ace-suggestion-left">
                                                            <span className="ace-suggestion-emoji">{g.emoji}</span>
                                                            <div className="ace-suggestion-text">
                                                                <span className="ace-suggestion-name">{g.name}</span>
                                                                <span className="ace-suggestion-desc">{g.description}</span>
                                                            </div>
                                                        </div>
                                                        <span className="ace-suggestion-add">
                                                            <FiPlus size={12} />
                                                        </span>
                                                    </button>
                                                ))}
                                                {suggestionsAvailable.length > 5 && (
                                                    <p className="ace-more-hint">+{suggestionsAvailable.length - 5} more available</p>
                                                )}
                                            </div>
                                        )}
                                    </SidebarSection>
                                )}

                                {/* ── Custom Actions ── */}
                                <SidebarSection icon={<FiTarget />} label={`Custom (${customActions.length})`}>
                                    {open && (
                                        <div className="ace-sidebar-list">
                                            {customActions.length === 0 ? (
                                                <div className="ace-empty-state">
                                                    <span className="ace-empty-icon">🧠</span>
                                                    <p className="ace-empty-text">No custom actions</p>
                                                    <p className="ace-empty-hint">Create AI-powered actions with natural language</p>
                                                </div>
                                            ) : (
                                                customActions.map((a) => (
                                                    <div key={a.id} className="ace-custom-item">
                                                        <div className="ace-custom-icon-wrap">
                                                            <span className="ace-custom-icon">
                                                                {a.prompt?.toLowerCase().includes('youtube') ? '📺' :
                                                                 a.prompt?.toLowerCase().includes('calculator') ? '🧮' :
                                                                 a.prompt?.toLowerCase().includes('discord') ? '💬' :
                                                                 a.prompt?.toLowerCase().includes('spotify') ? '🎵' :
                                                                 a.prompt?.toLowerCase().includes('chrome') ? '🌐' :
                                                                 a.prompt?.toLowerCase().includes('whatsapp') ? '💚' : '🧠'}
                                                            </span>
                                                        </div>
                                                        <div className="ace-custom-info">
                                                            <span className="ace-custom-name">{a.name || a.prompt}</span>
                                                            <span className="ace-custom-prompt">
                                                                {a.description || a.prompt}
                                                            </span>
                                                        </div>
                                                        <button
                                                            className="ace-delete-btn"
                                                            onClick={() => onDeleteCustomAction(a.id)}
                                                            title="Delete action"
                                                        >
                                                            <FiTrash2 size={13} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                            <button className="ace-custom-btn" onClick={onOpenCustomCreator}>
                                                <FiPlus size={14} /> Create Action
                                            </button>
                                        </div>
                                    )}
                                </SidebarSection>
                            </>
                        ) : (
                            /* Mouse mode content */
                            <>
                                <SidebarSection icon={<FiMousePointer />} label="Mouse Control">
                                    {open && (
                                        <div className="ace-sidebar-list">
                                            <div className="ace-mouse-instr">
                                                <span className="ace-instr-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>☝️</span>
                                                <div>
                                                    <div className="ace-instr-title">Move Cursor</div>
                                                    <div className="ace-instr-desc">Point with index finger</div>
                                                </div>
                                            </div>
                                            <div className="ace-mouse-instr">
                                                <span className="ace-instr-icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>🤏</span>
                                                <div>
                                                    <div className="ace-instr-title">Left Click</div>
                                                    <div className="ace-instr-desc">Pinch thumb + index</div>
                                                </div>
                                            </div>
                                            <div className="ace-mouse-instr">
                                                <span className="ace-instr-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>🤏</span>
                                                <div>
                                                    <div className="ace-instr-title">Right Click</div>
                                                    <div className="ace-instr-desc">Pinch thumb + middle</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </SidebarSection>

                                <SidebarSection icon={<FiCrosshair />} label="Status">
                                    {open && (
                                        <div className="ace-sidebar-stats">
                                            <div className={`ace-status-indicator ${mouseInfo.clicking === 'left' ? 'ace-click-active' : ''}`}>
                                                <span>Left</span>
                                                <span>{mouseInfo.clicking === 'left' ? '🟢' : '⚪'}</span>
                                            </div>
                                            <div className={`ace-status-indicator ${mouseInfo.clicking === 'right' ? 'ace-click-active' : ''}`}>
                                                <span>Right</span>
                                                <span>{mouseInfo.clicking === 'right' ? '🔴' : '⚪'}</span>
                                            </div>
                                            <div className={`ace-status-indicator ${mouseInfo.clicking === 'double' ? 'ace-click-active' : ''}`}>
                                                <span>Double</span>
                                                <span>{mouseInfo.clicking === 'double' ? '🟡' : '⚪'}</span>
                                            </div>
                                        </div>
                                    )}
                                </SidebarSection>
                            </>
                        )}
                    </nav>
                </div>
            </aside>
        </SidebarContext.Provider>
    );
}

/** A collapsible section with an icon always visible + content when open */
function SidebarSection({ icon, label, children }) {
    const { open } = useContext(SidebarContext);
    return (
        <div className="ace-sidebar-section">
            <div className="ace-sidebar-section-header">
                <span className="ace-sidebar-section-icon">{icon}</span>
                {open && <span className="ace-sidebar-section-label">{label}</span>}
            </div>
            {children}
        </div>
    );
}
