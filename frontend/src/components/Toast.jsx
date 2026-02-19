// Toast notification system
import { useState, useCallback, useRef } from 'react';

let toastId = 0;

export function useToast() {
    const [toasts, setToasts] = useState([]);
    const timersRef = useRef({});

    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type }]);

        timersRef.current[id] = setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
                delete timersRef.current[id];
            }, 300);
        }, duration);

        return id;
    }, []);

    return { toasts, addToast };
}

export function ToastContainer({ toasts }) {
    return (
        <div className="toast-container">
            {toasts.map(t => (
                <div key={t.id} className={`toast ${t.type} ${t.exiting ? 'toast-exit' : ''}`}>
                    <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
                    <span>{t.message}</span>
                </div>
            ))}
        </div>
    );
}
