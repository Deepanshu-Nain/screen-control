"""
Gesture Control Backend — Execution Layer (Phase 3)
FastAPI server with:
- WebSocket for real-time gesture commands
- REST API for LLM-powered custom action creation
- App-specific controls (in-app tab switching vs OS-level app switching)

Usage:
    pip install -r requirements.txt
    python server.py
"""

import asyncio
import json
import platform
import subprocess

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import pyautogui

from llm_engine import (
    generate_action_code,
    save_custom_action,
    delete_custom_action,
    list_custom_actions,
    execute_custom_action,
    load_custom_actions,
)

# --- Configuration ---

pyautogui.PAUSE = 0  # Zero delay — moves use ctypes, clicks need no pause
SYSTEM_OS = platform.system()
print(f"[Server] Running on {SYSTEM_OS}")

# --- App Setup ---

app = FastAPI(title="Gesture Control Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Action Mapping (Phase 2: In-App vs OS-Level) ---

def get_key_map():
    """
    Platform-specific keyboard shortcuts.
    Phase 2: Separates in-app controls from OS-level controls.
    """
    is_mac = SYSTEM_OS == "Darwin"
    mod = "command" if is_mac else "ctrl"

    return {
        # --- In-App Tab Controls ---
        "next_tab": {
            "keys": [mod, "tab"],
            "description": "Next Tab (in-app)",
        },
        "prev_tab": {
            "keys": [mod, "shift", "tab"],
            "description": "Previous Tab (in-app)",
        },
        "close_tab": {
            "keys": [mod, "w"],
            "description": "Close Tab (in-app)",
        },
        "new_tab": {
            "keys": [mod, "t"],
            "description": "New Tab (in-app)",
        },

        # --- OS-Level Controls ---
        "switch_app": {
            "keys": ["alt", "tab"],
            "description": "Switch App (OS-level)",
        },
        "close_window": {
            "keys": ["alt", "F4"],
            "description": "Close Window (OS-level)",
        },

        # --- Browser / App Launchers ---
        "open_browser": {
            "description": "Open Browser",
            "special": "open_browser",
        },

        # --- Media ---
        "volume_up": {
            "keys": ["volumeup"],
            "description": "Volume Up",
        },
        "volume_down": {
            "keys": ["volumedown"],
            "description": "Volume Down",
        },
        "play_pause": {
            "keys": ["playpause"],
            "description": "Play/Pause",
        },

        # --- Clipboard ---
        "copy": {
            "keys": [mod, "c"],
            "description": "Copy",
        },
        "paste": {
            "keys": [mod, "v"],
            "description": "Paste",
        },

        # --- Scrolling ---
        "scroll_up": {
            "description": "Scroll Up",
            "special": "scroll_up",
        },
        "scroll_down": {
            "description": "Scroll Down",
            "special": "scroll_down",
        },
    }


KEY_MAP = get_key_map()


def execute_action(command: str) -> dict:
    """Execute a built-in or custom action."""
    # Check if it's a custom action
    if command.startswith("custom_"):
        return execute_custom_action(command)

    action = KEY_MAP.get(command)
    if not action:
        return {"status": "error", "message": f"Unknown command: {command}"}

    try:
        if "special" in action:
            if action["special"] == "open_browser":
                _open_browser()
            elif action["special"] == "scroll_up":
                pyautogui.scroll(5)
            elif action["special"] == "scroll_down":
                pyautogui.scroll(-5)
        else:
            keys = action["keys"]
            if len(keys) == 1:
                pyautogui.press(keys[0])
            else:
                pyautogui.hotkey(*keys)

        print(f"[Action] Executed: {action['description']} ({command})")
        return {"status": "ok", "action": action["description"]}

    except Exception as e:
        print(f"[Action] Error executing {command}: {e}")
        return {"status": "error", "message": str(e)}


def execute_mouse_action(action: str, x: int, y: int) -> dict:
    """Execute a mouse movement or click. Uses ctypes for ultra-low latency on Windows."""
    try:
        if action == "move":
            # Direct Win32 API call — ~10x faster than pyautogui.moveTo()
            if SYSTEM_OS == "Windows":
                import ctypes
                ctypes.windll.user32.SetCursorPos(x, y)
            else:
                pyautogui.moveTo(x, y, duration=0, _pause=False)
            return {"status": "ok"}
        elif action == "left_click":
            pyautogui.click(x, y, _pause=False)
            print(f"[Mouse] Left click at ({x}, {y})")
            return {"status": "ok", "action": "left_click"}
        elif action == "double_click":
            pyautogui.doubleClick(x, y, _pause=False)
            print(f"[Mouse] Double click at ({x}, {y})")
            return {"status": "ok", "action": "double_click"}
        elif action == "right_click":
            pyautogui.rightClick(x, y, _pause=False)
            print(f"[Mouse] Right click at ({x}, {y})")
            return {"status": "ok", "action": "right_click"}
        else:
            return {"status": "error", "message": f"Unknown mouse action: {action}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def _open_browser():
    """Open the default browser (platform-specific)."""
    if SYSTEM_OS == "Windows":
        subprocess.Popen(["start", "chrome"], shell=True)
    elif SYSTEM_OS == "Darwin":
        subprocess.Popen(["open", "-a", "Safari"])
    else:
        subprocess.Popen(["xdg-open", "http://"])


# --- WebSocket Endpoint ---

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    client = ws.client
    print(f"[WS] Client connected: {client}")

    try:
        while True:
            raw = await ws.receive_text()

            try:
                data = json.loads(raw)

                # --- Mouse control messages (Phase 3) ---
                if data.get("type") == "mouse":
                    action = data.get("action", "")
                    x = int(data.get("x", 0))
                    y = int(data.get("y", 0))
                    # Run in thread pool so ctypes/pyautogui don't block the event loop
                    result = await asyncio.get_event_loop().run_in_executor(
                        None, execute_mouse_action, action, x, y
                    )
                    # Only send response for clicks (skip move ACKs to reduce traffic)
                    if action != "move":
                        await ws.send_json(result)
                    continue

                # --- Gesture command messages ---
                command = data.get("command", "")
                confidence = data.get("confidence", 0)

                print(f"[WS] Received: command={command}, confidence={confidence:.2f}")

                result = await asyncio.get_event_loop().run_in_executor(
                    None, execute_action, command
                )
                await ws.send_json(result)

            except json.JSONDecodeError:
                await ws.send_json({"status": "error", "message": "Invalid JSON"})

    except WebSocketDisconnect:
        print(f"[WS] Client disconnected: {client}")


# --- REST API for Custom Actions (LLM) ---

class CreateActionRequest(BaseModel):
    prompt: str

class ApproveActionRequest(BaseModel):
    id: str
    prompt: str
    code: str

class DeleteActionRequest(BaseModel):
    id: str


@app.post("/api/create-action")
async def create_action(req: CreateActionRequest):
    """Generate automation code from a natural language prompt via Gemini."""
    result = await asyncio.get_event_loop().run_in_executor(
        None, generate_action_code, req.prompt
    )
    return result


@app.post("/api/create-action-auto")
async def create_action_auto(req: CreateActionRequest):
    """
    All-in-one endpoint: generate → validate → save.
    Returns just success/failure — no code shown to user.
    """
    # Step 1: Generate code
    result = await asyncio.get_event_loop().run_in_executor(
        None, generate_action_code, req.prompt
    )

    if "error" in result:
        return {"status": "error", "message": result["error"]}

    # Step 2: Auto-save (validation already passed in generate_action_code)
    save_result = save_custom_action(result["id"], result["prompt"], result["code"])

    if save_result["status"] != "ok":
        return {"status": "error", "message": "Failed to save action"}

    return {
        "status": "ok",
        "id": result["id"],
        "prompt": result["prompt"],
        "message": f"Action '{result['prompt']}' created successfully!",
    }


@app.post("/api/approve-action")
async def approve_action(req: ApproveActionRequest):
    """Save an approved custom action for reuse."""
    result = save_custom_action(req.id, req.prompt, req.code)
    return result


@app.post("/api/delete-action")
async def delete_action_endpoint(req: DeleteActionRequest):
    """Delete a saved custom action."""
    result = delete_custom_action(req.id)
    return result


@app.get("/api/custom-actions")
async def get_custom_actions():
    """List all saved custom actions."""
    actions = list_custom_actions()
    return {"actions": actions}


# --- Screen Info (Phase 3: Mouse Control) ---

@app.get("/api/screen-info")
async def screen_info():
    """Return screen dimensions for cursor mapping."""
    w, h = pyautogui.size()
    return {"width": w, "height": h}


# --- Health Check ---

@app.get("/")
async def health():
    return {
        "status": "running",
        "os": SYSTEM_OS,
        "actions": list(KEY_MAP.keys()),
        "custom_actions": len(list_custom_actions()),
    }


# --- Entry Point ---

if __name__ == "__main__":
    print("[Server] Starting Gesture Control Backend on ws://127.0.0.1:8765")
    print(f"[Server] Built-in commands: {list(KEY_MAP.keys())}")
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8765,
        log_level="info",
    )
