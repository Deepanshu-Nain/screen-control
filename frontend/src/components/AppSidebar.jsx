/**
 * AppSidebar — Aceternity-style collapsible sidebar.
 * Collapses to icon-only (60px) and expands on hover (280px).
 * Holds gesture panel or mouse control content based on mode.
 */
import { useState, createContext, useContext } from 'react';
import { FiActivity, FiMousePointer, FiPlus, FiTrash2, FiZap, FiCrosshair, FiTarget, FiLayers } from 'react-icons/fi';
import { AVAILABLE_ACTIONS, SUGGESTED_GESTURES } from '../config/gestures.jsx';

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

    const trainedGestures = classifier?.getLabels?.() || [];
    const suggestionsAvailable = SUGGESTED_GESTURES.filter(
        (g) => !trainedGestures.includes(g.name)
    );

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
                                {/* Stats */}
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

                                {/* Trained gestures */}
                                <SidebarSection icon={<FiLayers />} label={`Trained (${trainedGestures.length})`}>
                                    {open && (
                                        <div className="ace-sidebar-list">
                                            {trainedGestures.length === 0 ? (
                                                <p className="ace-sidebar-muted">No gestures trained yet</p>
                                            ) : (
                                                trainedGestures.map((name) => {
                                                    const mapping = gestureMapping[name];
                                                    return (
                                                        <div
                                                            key={name}
                                                            className={`ace-gesture-item ${activeGesture === name ? 'ace-gesture-active' : ''}`}
                                                        >
                                                            <div className="ace-gesture-info">
                                                                <span className="ace-gesture-name">{name}</span>
                                                                <span className="ace-gesture-action">
                                                                    {mapping ? (AVAILABLE_ACTIONS.find(a => a.id === mapping)?.name || mapping) : 'Unbound'}
                                                                </span>
                                                            </div>
                                                            <button
                                                                className="w-7 h-7 flex items-center justify-center rounded-md border-none bg-transparent text-slate-500 cursor-pointer hover:bg-red-500/15 hover:text-red-400 transition duration-300"
                                                                onClick={() => onDeleteGesture(name)}
                                                                title="Delete"
                                                            >
                                                                <FiTrash2 size={14} />
                                                            </button>
                                                        </div>
                                                    );
                                                })
                                            )}
                                            <button className="flex items-center gap-1.5 px-3 py-1.5 mt-1 rounded-md border border-dashed border-indigo-500/30 bg-transparent text-indigo-400 text-xs font-semibold cursor-pointer hover:bg-indigo-500/10 hover:border-indigo-500 hover:-translate-y-0.5 transition-all duration-300" onClick={onOpenWizard}>
                                                <FiPlus size={14} /> Train New
                                            </button>
                                        </div>
                                    )}
                                </SidebarSection>

                                {/* Suggestions */}
                                {suggestionsAvailable.length > 0 && (
                                    <SidebarSection icon={<FiZap />} label="Suggestions">
                                        {open && (
                                            <div className="ace-sidebar-list">
                                                {suggestionsAvailable.slice(0, 4).map((g) => (
                                                    <button
                                                        key={g.name}
                                                        className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md border border-white/10 bg-white/[0.03] text-slate-400 text-xs cursor-pointer hover:bg-indigo-500/10 hover:border-indigo-500/40 hover:text-slate-200 hover:-translate-y-0.5 transition-all duration-300"
                                                        onClick={() => onTrainSuggested(g)}
                                                    >
                                                        <span>{g.emoji} {g.name}</span>
                                                        <FiPlus size={12} />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </SidebarSection>
                                )}

                                {/* Custom actions */}
                                <SidebarSection icon={<FiTarget />} label="Custom Actions">
                                    {open && (
                                        <div className="ace-sidebar-list">
                                            {customActions.length === 0 ? (
                                                <p className="ace-sidebar-muted">No custom actions</p>
                                            ) : (
                                                customActions.map((a, i) => (
                                                    <div key={i} className="ace-gesture-item">
                                                        <div className="ace-gesture-info">
                                                            <span className="ace-gesture-name">{a.name}</span>
                                                            <span className="ace-gesture-action">{a.description}</span>
                                                        </div>
                                                        <button
                                                            className="w-7 h-7 flex items-center justify-center rounded-md border-none bg-transparent text-slate-500 cursor-pointer hover:bg-red-500/15 hover:text-red-400 transition duration-300"
                                                            onClick={() => onDeleteCustomAction(i)}
                                                            title="Delete"
                                                        >
                                                            <FiTrash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                            <button className="flex items-center gap-1.5 px-3 py-1.5 mt-1 rounded-md border border-dashed border-violet-500/30 bg-transparent text-violet-400 text-xs font-semibold cursor-pointer hover:bg-violet-500/10 hover:border-violet-500 hover:-translate-y-0.5 transition-all duration-300" onClick={onOpenCustomCreator}>
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
