from typing import Iterable

TRUSTED_ACTIONS = {
    "breathing": {"label": "Breathing Exercise", "route": "get-support.html#breathing"},
    "grounding": {"label": "Try Grounding", "route": "get-support.html#grounding"},
    "journal": {"label": "Open Journal", "route": "get-support.html#journal"},
    "human_support": {"label": "Human Support", "route": "get-support.html#human-support"},
    "emergency": {"label": "Emergency Resources", "route": "emergency.html"},
}


def suggest_actions(message: str, safety_level: str) -> list[dict[str, str]]:
    if safety_level in {"concern", "imminent"}:
        return [TRUSTED_ACTIONS["emergency"], TRUSTED_ACTIONS["human_support"]]

    text = message.lower()
    action_ids: list[str] = []
    if any(word in text for word in ("panic", "overwhelmed", "heart racing", "calm down", "anxious")):
        action_ids.append("grounding")
    if any(word in text for word in ("breathe", "breathing", "tense", "stress")):
        action_ids.append("breathing")
    if any(word in text for word in ("journal", "write", "thoughts", "reflect")):
        action_ids.append("journal")
    if any(word in text for word in ("lonely", "alone", "talk to someone", "human")):
        action_ids.append("human_support")
    return [TRUSTED_ACTIONS[action_id] for action_id in _unique(action_ids)][:2]


def _unique(values: Iterable[str]) -> list[str]:
    return list(dict.fromkeys(values))
