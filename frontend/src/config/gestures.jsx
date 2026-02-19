// Default actions and gesture mapping config — Phase 2
// Actions are now categorized: In-App, OS-Level, Media, Clipboard, Scroll
// Reverted to Emojis due to build system issues with react-icons.

// Built-in actions grouped by category
export const BUILTIN_ACTIONS = [
    // In-App Tab Controls
    { id: 'next_tab', label: 'Next Tab (Ctrl+Tab)', icon: '➡️', category: 'In-App' },
    { id: 'prev_tab', label: 'Previous Tab (Ctrl+Shift+Tab)', icon: '⬅️', category: 'In-App' },
    { id: 'close_tab', label: 'Close Tab (Ctrl+W)', icon: '✖️', category: 'In-App' },
    { id: 'new_tab', label: 'New Tab (Ctrl+T)', icon: '➕', category: 'In-App' },

    // OS-Level
    { id: 'switch_app', label: 'Switch App (Alt+Tab)', icon: '🔄', category: 'OS' },
    { id: 'close_window', label: 'Close Window (Alt+F4)', icon: '🚪', category: 'OS' },
    { id: 'open_browser', label: 'Open Browser', icon: '🌐', category: 'OS' },

    // Media
    { id: 'volume_up', label: 'Volume Up', icon: '🔊', category: 'Media' },
    { id: 'volume_down', label: 'Volume Down', icon: '🔉', category: 'Media' },
    { id: 'play_pause', label: 'Play / Pause', icon: '⏯️', category: 'Media' },

    // Clipboard
    { id: 'copy', label: 'Copy (Ctrl+C)', icon: '📋', category: 'Clipboard' },
    { id: 'paste', label: 'Paste (Ctrl+V)', icon: '📌', category: 'Clipboard' },

    // Scroll
    { id: 'scroll_up', label: 'Scroll Up', icon: '⬆️', category: 'Scroll' },
    { id: 'scroll_down', label: 'Scroll Down', icon: '⬇️', category: 'Scroll' },
];

// Smart icon inference for custom LLM actions
function getSmartIcon(prompt) {
    const p = prompt.toLowerCase();
    if (p.includes('youtube')) return '📺';
    if (p.includes('discord')) return '💬';
    if (p.includes('instagram')) return '📸';
    if (p.includes('chrome')) return '🌐';
    if (p.includes('spotify')) return '🎵';
    if (p.includes('netflix')) return '🍿';
    if (p.includes('whatsapp')) return '💚';

    return '🧠'; // Default AI icon
}

// For backward compat — flat list that includes custom actions
export let AVAILABLE_ACTIONS = [...BUILTIN_ACTIONS];

// Update available actions with custom ones from backend
export function mergeCustomActions(customActions) {
    AVAILABLE_ACTIONS = [...BUILTIN_ACTIONS];
    for (const ca of customActions) {
        AVAILABLE_ACTIONS.push({
            id: ca.id,
            label: ca.prompt,
            icon: getSmartIcon(ca.prompt),
            category: 'Custom',
        });
    }
}

// Suggested gestures for the "Needs Training" section
export const SUGGESTED_GESTURES = [
    { actionId: 'next_tab', suggestedGestureName: 'Next Tab' },
    { actionId: 'prev_tab', suggestedGestureName: 'Previous Tab' },
    { actionId: 'switch_app', suggestedGestureName: 'Switch App' },
    { actionId: 'scroll_up', suggestedGestureName: 'Scroll Up' },
    { actionId: 'scroll_down', suggestedGestureName: 'Scroll Down' },
];

const MAPPING_KEY = 'gesture_action_mapping';

export function getGestureMapping() {
    try {
        const raw = localStorage.getItem(MAPPING_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* empty */ }
    return {};
}

export function setGestureMapping(mapping) {
    localStorage.setItem(MAPPING_KEY, JSON.stringify(mapping));
}

export function mapGestureToAction(gestureName) {
    const mapping = getGestureMapping();
    return mapping[gestureName] || null;
}
