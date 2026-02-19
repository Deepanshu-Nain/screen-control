// CustomActionCreator — Modal for creating LLM-powered custom actions.
// Simplified UX: user types prompt → AI generates, validates, tests, and saves → shows success/fail.

import { useState } from 'react';

const API_BASE = 'http://127.0.0.1:8765';

export default function CustomActionCreator({ isOpen, onClose, onActionCreated }) {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'error'
    const [message, setMessage] = useState('');

    const handleCreate = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        setStatus(null);
        setMessage('');

        try {
            const res = await fetch(`${API_BASE}/api/create-action-auto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt.trim() }),
            });
            const data = await res.json();

            if (data.status === 'ok') {
                setStatus('success');
                setMessage(`Action "${prompt}" created successfully!`);
                onActionCreated?.({ id: data.id, prompt: data.prompt });
                // Auto-close after brief delay
                setTimeout(() => {
                    handleReset();
                    onClose();
                }, 1500);
            } else {
                setStatus('error');
                setMessage(data.message || data.error || 'Failed to create action.');
            }
        } catch (err) {
            setStatus('error');
            setMessage('Cannot connect to backend. Is the server running?');
        }
        setLoading(false);
    };

    const handleReset = () => {
        setPrompt('');
        setStatus(null);
        setMessage('');
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <h3>🧠 Create Custom Action</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Describe what you want to do in plain English. AI will create the action automatically.
                </p>

                <div className="form-group">
                    <label>What should this action do?</label>
                    <input
                        type="text"
                        placeholder='e.g. "open calculator", "take a screenshot", "minimize all windows"'
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !loading && handleCreate()}
                        autoFocus
                        disabled={loading || status === 'success'}
                    />
                </div>

                <div className="example-prompts">
                    {['Open Calculator', 'Take a Screenshot', 'Minimize All Windows', 'Open Notepad'].map(ex => (
                        <button
                            key={ex}
                            className="example-chip"
                            onClick={() => setPrompt(ex)}
                            disabled={loading || status === 'success'}
                        >
                            {ex}
                        </button>
                    ))}
                </div>

                {/* Status feedback */}
                {loading && (
                    <div className="action-status creating">
                        <span className="spinner" /> Generating and testing action...
                    </div>
                )}
                {status === 'success' && (
                    <div className="action-status success">
                        ✅ {message}
                    </div>
                )}
                {status === 'error' && (
                    <div className="action-status error">
                        ❌ {message}
                    </div>
                )}

                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => { handleReset(); onClose(); }}>
                        Cancel
                    </button>
                    {status !== 'success' && (
                        <button
                            className="btn btn-primary"
                            onClick={handleCreate}
                            disabled={!prompt.trim() || loading}
                        >
                            {loading ? '⏳ Creating...' : '✨ Create Action'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
