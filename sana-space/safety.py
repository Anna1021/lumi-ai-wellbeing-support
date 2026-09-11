import re
from dataclasses import dataclass


@dataclass(frozen=True)
class SafetyResult:
    level: str
    reason: str | None = None


IMMINENT_PATTERNS = [
    r"\b(?:i(?:'m| am)? going to|i will|i plan to|about to)\s+(?:kill myself|end my life|die|overdose)\b",
    r"\b(?:kill myself|end my life|take my own life)\s+(?:tonight|today|now|soon)\b",
    r"\b(?:cannot|can't|don'?t think i can)\s+(?:stay|keep myself) safe\b",
    r"\b(?:i have|i've got)\s+(?:the )?(?:pills|weapon|means)\b.*\b(?:suicide|kill myself|end my life)\b",
    r"\b(?:overdosed|taken an overdose)\b",
]

CONCERN_PATTERNS = [
    r"\b(?:want to die|wish i were dead|suicidal|suicide|self[- ]?harm|hurt myself)\b",
    r"\b(?:life is not worth living|better off dead|no reason to live)\b",
]

NON_CURRENT_MARKERS = re.compile(
    r"\b(?:used to|years? ago|in the past|historically|research|essay|assignment|someone else|my friend|a character)\b",
    re.IGNORECASE,
)


def assess_safety(message: str) -> SafetyResult:
    text = " ".join(message.lower().split())
    if any(re.search(pattern, text) for pattern in IMMINENT_PATTERNS):
        return SafetyResult("imminent", "explicit immediate self-harm intent")
    if any(re.search(pattern, text) for pattern in CONCERN_PATTERNS):
        if NON_CURRENT_MARKERS.search(text):
            return SafetyResult("normal", "non-current or third-person context")
        return SafetyResult("concern", "possible current self-harm risk")
    return SafetyResult("normal")


def crisis_response(level: str) -> str:
    if level == "imminent":
        return (
            "I’m really concerned that you may be in immediate danger. Please contact emergency services now, "
            "or go to a trusted person nearby and tell them you need help staying safe. Open SANA’s emergency "
            "resources below for verified options in your area—please don’t stay alone with this right now."
        )
    return (
        "Thank you for telling me. Your safety matters more than continuing an ordinary chat right now. "
        "Could you reach out to someone you trust or a qualified support service, and use SANA’s emergency "
        "resources below? If you might act soon or cannot stay safe, contact emergency services immediately."
    )
