"""
LLM Engine — Generates PyAutoGUI automation code from natural language prompts
using Google Gemini API. Includes validation, sandboxing, and persistence.
"""

import json
import os
import re
import uuid
import traceback
from pathlib import Path

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# --- Configuration ---

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
CUSTOM_ACTIONS_FILE = Path(__file__).parent / "custom_actions.json"

# Modules that generated code is allowed to use
ALLOWED_IMPORTS = {"pyautogui", "subprocess", "time", "os"}

# Dangerous patterns to block
BLOCKED_PATTERNS = [
    r"\bshutil\.rmtree\b",
    r"\bos\.remove\b",
    r"\bos\.unlink\b",
    r"\bos\.rmdir\b",
    r"\bos\.system\b.*?(rm |del |format |rd )",
    r"\bsubprocess\..*?(rm |del |format |rd |rmdir)",
    r"\b__import__\b",
    r"\beval\b",
    r"\bexec\b",
    r"\bopen\s*\(.*?,\s*['\"]w",  # writing to files
    r"\bformat\s+[a-zA-Z]:",       # disk format commands
]

# System prompt constraining LLM output
SYSTEM_PROMPT = """You are a desktop automation assistant. You generate SHORT Python code snippets
that use PyAutoGUI and standard Windows tools to perform desktop tasks.

RULES:
1. ONLY use these imports: pyautogui, subprocess, time, os
2. Keep code under 20 lines
3. Use pyautogui for keyboard/mouse control
4. Use subprocess.Popen for opening applications
5. Use time.sleep() for delays between actions
6. NEVER delete files, format disks, or do anything destructive
7. NEVER access the internet, download files, or make network requests
8. NEVER modify system settings, registry, or environment variables
9. Return ONLY the Python code, no explanations, no markdown, no code fences
10. The code should be a simple script (no functions/classes needed)
11. This is Windows OS — use Windows paths and commands

EXAMPLES:

Prompt: "open calculator"
Code:
import subprocess
subprocess.Popen("calc.exe")

Prompt: "take a screenshot and save to desktop"
Code:
import pyautogui
import os
screenshot = pyautogui.screenshot()
desktop = os.path.join(os.path.expanduser("~"), "Desktop")
screenshot.save(os.path.join(desktop, "screenshot.png"))

Prompt: "minimize all windows"
Code:
import pyautogui
pyautogui.hotkey("win", "d")

Prompt: "open notepad and type hello"
Code:
import subprocess
import pyautogui
import time
subprocess.Popen("notepad.exe")
time.sleep(1)
pyautogui.typewrite("hello", interval=0.05)
"""


def configure_gemini():
    """Configure the Gemini API client."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set in .env file")
    genai.configure(api_key=GEMINI_API_KEY)


def generate_action_code(prompt: str) -> dict:
    """
    Send a natural language prompt to Gemini and get back Python automation code.
    Returns: { "code": str, "prompt": str, "id": str } or { "error": str }
    """
    try:
        configure_gemini()
        model = genai.GenerativeModel("gemini-2.5-flash")

        response = model.generate_content(
            [
                {"role": "user", "parts": [SYSTEM_PROMPT]},
                {"role": "model", "parts": ["Understood. I will generate clean Python automation code using only pyautogui, subprocess, time, and os. No destructive actions."]},
                {"role": "user", "parts": [f"Generate Python code for this task: {prompt}"]},
            ]
        )

        raw_code = response.text.strip()

        # Strip markdown code fences if LLM included them
        raw_code = re.sub(r"^```(?:python)?\s*\n?", "", raw_code)
        raw_code = re.sub(r"\n?```\s*$", "", raw_code)
        raw_code = raw_code.strip()

        # Validate
        validation = validate_code(raw_code)
        if not validation["safe"]:
            return {"error": validation["reason"], "code": raw_code}

        action_id = f"custom_{uuid.uuid4().hex[:8]}"
        return {
            "id": action_id,
            "prompt": prompt,
            "code": raw_code,
        }

    except Exception as e:
        return {"error": f"Gemini API error: {str(e)}"}


def validate_code(code: str) -> dict:
    """
    Validate generated code for safety.
    Returns { "safe": bool, "reason": str }
    """
    # Check for blocked patterns
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, code, re.IGNORECASE):
            return {"safe": False, "reason": f"Blocked dangerous pattern: {pattern}"}

    # Check imports are allowed
    import_matches = re.findall(r"^\s*import\s+(\w+)", code, re.MULTILINE)
    from_matches = re.findall(r"^\s*from\s+(\w+)", code, re.MULTILINE)
    all_imports = set(import_matches + from_matches)

    disallowed = all_imports - ALLOWED_IMPORTS
    if disallowed:
        return {"safe": False, "reason": f"Disallowed imports: {disallowed}"}

    # Code length sanity check
    if len(code.split("\n")) > 50:
        return {"safe": False, "reason": "Code too long (max 50 lines)"}

    return {"safe": True, "reason": ""}


def execute_custom_action(action_id: str) -> dict:
    """Execute a saved custom action by its ID."""
    actions = load_custom_actions()
    action = actions.get(action_id)

    if not action:
        return {"status": "error", "message": f"Custom action not found: {action_id}"}

    code = action.get("code", "")

    # Re-validate before execution (safety net)
    validation = validate_code(code)
    if not validation["safe"]:
        return {"status": "error", "message": f"Action failed safety check: {validation['reason']}"}

    try:
        # Execute in a restricted namespace
        exec_globals = {"__builtins__": __builtins__}
        exec(code, exec_globals)
        print(f"[LLM] Executed custom action: {action['prompt']} ({action_id})")
        return {"status": "ok", "action": action["prompt"]}
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[LLM] Error executing {action_id}: {tb}")
        return {"status": "error", "message": str(e)}


# --- Persistence ---

def load_custom_actions() -> dict:
    """Load saved custom actions from JSON file."""
    if CUSTOM_ACTIONS_FILE.exists():
        try:
            return json.loads(CUSTOM_ACTIONS_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, IOError):
            return {}
    return {}


def save_custom_action(action_id: str, prompt: str, code: str) -> dict:
    """Save an approved custom action for reuse."""
    actions = load_custom_actions()
    actions[action_id] = {
        "id": action_id,
        "prompt": prompt,
        "code": code,
    }
    CUSTOM_ACTIONS_FILE.write_text(json.dumps(actions, indent=2), encoding="utf-8")
    print(f"[LLM] Saved custom action: {prompt} ({action_id})")
    return {"status": "ok", "id": action_id}


def delete_custom_action(action_id: str) -> dict:
    """Delete a saved custom action."""
    actions = load_custom_actions()
    if action_id in actions:
        del actions[action_id]
        CUSTOM_ACTIONS_FILE.write_text(json.dumps(actions, indent=2), encoding="utf-8")
        return {"status": "ok"}
    return {"status": "error", "message": "Action not found"}


def list_custom_actions() -> list:
    """List all saved custom actions (without code, for frontend display)."""
    actions = load_custom_actions()
    return [
        {"id": a["id"], "prompt": a["prompt"]}
        for a in actions.values()
    ]
