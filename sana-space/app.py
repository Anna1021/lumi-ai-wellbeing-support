import json
import logging
import os
import platform
from typing import Any

import gradio as gr
import spaces
import torch

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
LOGGER = logging.getLogger("sana-ai")
# The ZeroGPU scheduler URL can contain a short-lived scheduling token. Keep our
# own structured diagnostics, but never emit third-party HTTP request URLs.
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
LOGGER.info("[SANA][BOOT] app.py starting")
LOGGER.info("[SANA][BOOT] python=%s torch=%s cuda_available=%s", platform.python_version(), torch.__version__, torch.cuda.is_available())

from actions import suggest_actions
from config import MAX_HISTORY_MESSAGES, MAX_MESSAGE_CHARS, MODEL_ID
from model_service import generate, get_model, model_status
from safety import assess_safety, crisis_response
from system_prompt import SYSTEM_PROMPT

LOGGER.info("[SANA][BOOT] model_id=%s spaces_version=%s gradio_version=%s", MODEL_ID, getattr(spaces, "__version__", "unknown"), gr.__version__)


def _clean_text(value: Any, limit: int) -> str:
    if not isinstance(value, str):
        return ""
    return " ".join(value.replace("\x00", "").split())[:limit]


def _bounded_history(raw_history: Any) -> list[dict[str, str]]:
    if not isinstance(raw_history, list):
        return []
    cleaned = []
    for item in raw_history[-MAX_HISTORY_MESSAGES:]:
        if not isinstance(item, dict) or item.get("role") not in {"user", "assistant"}:
            continue
        content = _clean_text(item.get("content"), 1200)
        if content:
            cleaned.append({"role": item["role"], "content": content})
    return cleaned


def _build_messages(payload: dict[str, Any], message: str) -> list[dict[str, str]]:
    user = payload.get("user") if isinstance(payload.get("user"), dict) else {}
    context = payload.get("context") if isinstance(payload.get("context"), dict) else {}
    nickname = _clean_text(user.get("nickname"), 40) or "Student"
    recent_mood = _clean_text(context.get("recent_mood"), 60)
    context_lines = [f"User display name: {nickname}."]
    if recent_mood:
        context_lines.append(f"Most recent user-selected mood: {recent_mood}.")
    messages = [{"role": "system", "content": SYSTEM_PROMPT + "\n\nApp context:\n" + "\n".join(context_lines)}]
    messages.extend(_bounded_history(payload.get("history")))
    messages.append({"role": "user", "content": message})
    return messages


@spaces.GPU(duration=12)
def _generate_supportive_reply(messages: list[dict[str, str]]) -> str:
    LOGGER.info("[SANA][GPU] Entering GPU inference function")
    return generate(messages)


@spaces.GPU(duration=30)
def gpu_smoke_test() -> dict[str, object]:
    """Smallest practical GPU/model test: no history, safety, or app context."""
    LOGGER.info("[SANA][GPU] Entering minimal GPU smoke test")
    reply = generate([
        {"role": "system", "content": "Reply with exactly: SANA model is working."},
        {"role": "user", "content": "Reply now."},
    ])
    LOGGER.info("[SANA][GPU] Minimal GPU smoke test completed")
    return {"ok": bool(reply), "reply": reply, **model_status()}


def echo(message: str) -> str:
    safe_message = _clean_text(message, 120)
    LOGGER.info("[SANA][ECHO] callback reached chars=%s", len(safe_message))
    return f"echo: {safe_message}" if safe_message else "echo:"


def health() -> dict[str, object]:
    LOGGER.info("[SANA][HEALTH] health endpoint requested")
    return {
        "app_running": True,
        "python": platform.python_version(),
        "torch": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        **model_status(),
    }


def chat(payload_json: str) -> str:
    try:
        payload = json.loads(payload_json)
        if not isinstance(payload, dict):
            raise ValueError("payload must be an object")
        message = _clean_text(payload.get("message"), MAX_MESSAGE_CHARS + 1)
        if not message or len(message) > MAX_MESSAGE_CHARS:
            return json.dumps({"ok": False, "error": "invalid_message"})
    except (json.JSONDecodeError, ValueError):
        LOGGER.warning("[SANA][CHAT] invalid request payload")
        return json.dumps({"ok": False, "error": "invalid_request"})

    try:
        LOGGER.info("[SANA][CHAT] Request received chars=%s history_length=%s", len(message), len(_bounded_history(payload.get("history"))))
        safety = assess_safety(message)
        actions = suggest_actions(message, safety.level)
        if safety.level != "normal":
            LOGGER.warning("[SANA AI] Safety route activated: %s", safety.level)
            return json.dumps({
                "ok": True,
                "reply": crisis_response(safety.level),
                "safety": safety.level,
                "actions": actions,
                "model": None,
            })

        reply = _generate_supportive_reply(_build_messages(payload, message))
        LOGGER.info("[SANA][CHAT] Response decoded and returning response to Gradio")
        return json.dumps({
            "ok": True,
            "reply": reply,
            "safety": "normal",
            "actions": actions,
            "model": MODEL_ID,
        })
    except Exception as error:
        LOGGER.exception("[SANA][ERROR] %s: %s", type(error).__name__, str(error)[:300])
        error_name = "gpu_quota_exceeded" if "ZeroGPU quota exceeded" in str(error) else "temporarily_unavailable"
        return json.dumps({"ok": False, "error": error_name})


def demo_chat(message: str, history: list[dict[str, str]]) -> str:
    """Human-friendly Space demo; the web app continues to use the /chat API."""
    payload = {
        "message": message,
        "history": history or [],
        "user": {"nickname": "Friend"},
        "context": {},
    }
    result = json.loads(chat(json.dumps(payload)))
    if result.get("ok") and result.get("reply"):
        return result["reply"]
    if result.get("error") == "invalid_message":
        return "Please enter a message of up to 2,000 characters."
    if result.get("error") == "gpu_quota_exceeded":
        return "SANA needs a Hugging Face sign-in to request ZeroGPU time. Use the sign-in button above, then send your message again."
    return "SANA could not generate a response. Please try again shortly; the server logs contain the safe diagnostic details."


if os.getenv("SANA_SKIP_MODEL_LOAD") != "1":
    get_model()

with gr.Blocks(title="SANA AI Service") as demo:
    gr.Markdown(
        "# SANA AI\n"
        "A supportive conversation demo for the SANA student wellbeing app. "
        "Share what is on your mind below.\n\n"
        "> SANA is not a therapist or emergency service. If you may be in immediate danger, "
        "contact local emergency services or a trusted person nearby."
    )
    gr.LoginButton("Sign in with Hugging Face for ZeroGPU access")
    gr.ChatInterface(
        fn=demo_chat,
        type="messages",
        chatbot=gr.Chatbot(type="messages", height=480, placeholder="Your conversation will appear here."),
        textbox=gr.Textbox(
            placeholder="Tell SANA how you are feeling...",
            max_lines=5,
            max_length=2000,
        ),
        examples=[
            "I feel overwhelmed by my coursework.",
            "I have an interview tomorrow and I am nervous.",
            "I just want to vent for a moment.",
        ],
        submit_btn="Send",
    )
    gr.Markdown("Privacy note: avoid sharing identifying or highly sensitive personal information in this public demo.")

    with gr.Accordion("Service diagnostics", open=False):
        gr.Markdown("Non-sensitive diagnostics for this Space only. These endpoints never return message content or secrets.")
        with gr.Row():
            echo_input = gr.Textbox(label="Event wiring echo", value="hello")
            echo_output = gr.Textbox(label="Echo result")
        gr.Button("Run echo test").click(echo, echo_input, echo_output, api_name="echo")
        health_output = gr.JSON(label="Health status")
        gr.Button("Check health").click(health, None, health_output, api_name="health")
        smoke_output = gr.JSON(label="Minimal GPU smoke test")
        gr.Button("Run GPU smoke test").click(gpu_smoke_test, None, smoke_output, api_name="gpu_smoke")

    # Stable machine-readable endpoint used by the SANA website.
    request = gr.Textbox(visible=False)
    response = gr.Textbox(visible=False)
    gr.Button("Service endpoint", visible=False).click(chat, request, response, api_name="sana_chat")

demo.queue(default_concurrency_limit=2).launch()
