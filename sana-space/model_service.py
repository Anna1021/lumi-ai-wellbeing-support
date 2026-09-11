import logging
import threading
import time

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from config import (
    MAX_INPUT_TOKENS,
    MAX_NEW_TOKENS,
    MODEL_ID,
    REPETITION_PENALTY,
    TEMPERATURE,
    TOP_P,
)

LOGGER = logging.getLogger("sana-ai")
_model = None
_tokenizer = None
_model_lock = threading.Lock()
MODEL_LOAD_COUNT = 0


def get_model():
    global _model, _tokenizer, MODEL_LOAD_COUNT
    if _model is not None and _tokenizer is not None:
        LOGGER.info("[SANA][MODEL] cache hit load_count=%s", MODEL_LOAD_COUNT)
        return _model, _tokenizer

    with _model_lock:
        if _model is not None and _tokenizer is not None:
            LOGGER.info("[SANA][MODEL] cache hit after lock load_count=%s", MODEL_LOAD_COUNT)
            return _model, _tokenizer

        started = time.monotonic()
        LOGGER.info("[SANA][MODEL] Loading tokenizer model_id=%s", MODEL_ID)
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        LOGGER.info("[SANA][MODEL] Tokenizer loaded")
        LOGGER.info("[SANA][MODEL] Loading model")
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            dtype=torch.bfloat16,
            low_cpu_mem_usage=True,
        )
        model.eval()
        model.to("cuda")
        _tokenizer = tokenizer
        _model = model
        MODEL_LOAD_COUNT += 1
        LOGGER.info(
            "[SANA][MODEL] Model loaded seconds=%.2f device=%s dtype=%s load_count=%s object_id=%s",
            time.monotonic() - started,
            getattr(model, "device", "cuda"),
            getattr(model, "dtype", "unknown"),
            MODEL_LOAD_COUNT,
            id(model),
        )
        return _model, _tokenizer


def generate(messages: list[dict[str, str]]) -> str:
    model, tokenizer = get_model()
    bounded_messages = list(messages)
    LOGGER.info("[SANA][CHAT] Building prompt history_messages=%s", max(0, len(bounded_messages) - 2))
    encoded = _tokenize(tokenizer, bounded_messages)
    while encoded["input_ids"].shape[-1] > MAX_INPUT_TOKENS and len(bounded_messages) > 2:
        bounded_messages.pop(1)
        encoded = _tokenize(tokenizer, bounded_messages)
    if encoded["input_ids"].shape[-1] > MAX_INPUT_TOKENS:
        latest = bounded_messages[-1]["content"]
        bounded_messages[-1]["content"] = latest[-4000:]
        encoded = _tokenize(tokenizer, bounded_messages)
    model_inputs = {key: value.to(model.device) for key, value in encoded.items()}
    input_length = model_inputs["input_ids"].shape[-1]
    LOGGER.info("[SANA][GPU] Input token count=%s", input_length)

    started = time.monotonic()
    with torch.inference_mode():
        LOGGER.info("[SANA][GPU] Calling model.generate")
        output = model.generate(
            **model_inputs,
            max_new_tokens=MAX_NEW_TOKENS,
            do_sample=True,
            temperature=TEMPERATURE,
            top_p=TOP_P,
            repetition_penalty=REPETITION_PENALTY,
            pad_token_id=tokenizer.eos_token_id,
        )
    new_tokens = output[0, input_length:]
    reply = tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
    LOGGER.info(
        "[SANA][GPU] Generation complete new_tokens=%s", new_tokens.shape[-1]
    )
    LOGGER.info("[SANA][PERF] generation_seconds=%.2f", time.monotonic() - started)
    return reply


def model_status() -> dict[str, object]:
    return {
        "model_id": MODEL_ID,
        "tokenizer_loaded": _tokenizer is not None,
        "model_loaded": _model is not None,
        "model_load_count": MODEL_LOAD_COUNT,
        "device": str(getattr(_model, "device", "not_loaded")),
        "dtype": str(getattr(_model, "dtype", "not_loaded")),
    }


def _tokenize(tokenizer, messages):
    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    return tokenizer(
        prompt,
        return_tensors="pt",
        add_special_tokens=False,
    )
