import base64
import json
import os
from io import BytesIO
from typing import Any

import numpy as np
from PIL import Image, UnidentifiedImageError
import requests
from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, decode_predictions, preprocess_input

FRESHNESS_FRESH = "Fresh"
FRESHNESS_QUESTIONABLE = "Questionable"
FRESHNESS_SPOILED = "Spoiled"

_model: Any | None = None

GEMINI_API_KEY_ENV = "GEMINI_API_KEY"
GEMINI_MODEL_ENV = "GEMINI_MODEL"
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"

SPOILAGE_KEYWORDS = {
    "stinkhorn",
    "garbage",
    "trash",
    "ashcan",
    "bin",
    "dumpster",
    "garbage-truck",
    "plastic-bag",
    "carton",
}

FOOD_KEYWORDS = {
    "apple",
    "banana",
    "orange",
    "strawberry",
    "broccoli",
    "cucumber",
    "zucchini",
    "carrot",
    "cauliflower",
    "bell-pepper",
    "lemon",
    "lime",
    "pineapple",
    "pomegranate",
    "granny-smith",
    "artichoke",
    "corn",
    "cabbage",
    "potato",
    "eggplant",
    "pizza",
    "hotdog",
    "cheeseburger",
    "plate",
}

NON_FOOD_KEYWORDS = {
    "ashcan",
    "garbage-truck",
    "plastic-bag",
    "litter",
    "oscilloscope",
    "television",
    "monitor",
    "screen",
    "laptop",
    "notebook",
    "keyboard",
    "cellular-telephone",
    "remote-control",
    "vacuum",
    "carton",
    "packet",
    "envelope",
}

FUNGUS_HINT_KEYWORDS = {
    "mushroom",
    "agaric",
    "earthstar",
    "hen-of-the-woods",
    "bolete",
    "stinkhorn",
}


def _get_model() -> Any:
    global _model
    if _model is None:
        _model = MobileNetV2(weights="imagenet")
    return _model


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def _normalize_label(label: str) -> str:
    return label.strip().lower().replace("_", "-")


def _keyword_confidence(predictions: list[tuple[str, str, float]], keywords: set[str]) -> float:
    best = 0.0
    for _, label, confidence in predictions:
        normalized = _normalize_label(label)
        if any(keyword in normalized for keyword in keywords):
            best = max(best, float(confidence))
    return best


def _extract_json_object(raw_text: str) -> dict[str, Any] | None:
    text = raw_text.strip()
    if not text:
        return None

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace == -1 or last_brace == -1 or last_brace <= first_brace:
        return None

    snippet = text[first_brace : last_brace + 1]
    try:
        parsed = json.loads(snippet)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        return None
    return None


def _normalize_quality_label(label: str | None) -> str | None:
    if not label:
        return None
    normalized = label.strip().lower()
    if normalized in {"fresh", "good", "good quality", "safe", "edible"}:
        return FRESHNESS_FRESH
    if normalized in {"spoiled", "rotten", "bad", "bad quality", "garbage", "unsafe", "non-food", "non food"}:
        return FRESHNESS_SPOILED
    if normalized in {"questionable", "uncertain"}:
        return FRESHNESS_QUESTIONABLE
    if normalized in {"not applicable", "not-applicable", "n/a", "na", "non applicable"}:
        return FRESHNESS_SPOILED
    return None


def _is_gemini_enabled() -> bool:
    return bool(os.getenv(GEMINI_API_KEY_ENV, "").strip())


def _detect_image_mime_type(image_bytes: bytes) -> str:
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if image_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if image_bytes.startswith(b"GIF87a") or image_bytes.startswith(b"GIF89a"):
        return "image/gif"
    if image_bytes.startswith(b"RIFF") and b"WEBP" in image_bytes[:16]:
        return "image/webp"
    return "image/jpeg"


def _analyze_with_gemini(image_bytes: bytes) -> dict[str, str | float] | None:
    api_key = os.getenv(GEMINI_API_KEY_ENV, "").strip()
    if not api_key:
        return None

    model = os.getenv(GEMINI_MODEL_ENV, DEFAULT_GEMINI_MODEL).strip() or DEFAULT_GEMINI_MODEL
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    encoded_image = base64.b64encode(image_bytes).decode("ascii")
    mime_type = _detect_image_mime_type(image_bytes)

    instruction = (
        "You are a food donation quality checker. "
        "If food has visible mold/fungus spots, black rot, white fuzzy growth, liquid decay, or heavy spoilage, return Spoiled. "
        "Return Spoiled for garbage/trash or non-food objects too. "
        "Otherwise return Fresh. Use Questionable only when the image is too unclear to judge. "
        "Respond with JSON only: {\"freshness\":\"Fresh|Questionable|Spoiled\",\"confidence\":0.0}"
    )
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": instruction},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": encoded_image,
                        }
                    },
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 256,
            "responseMimeType": "application/json",
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }

    try:
        response = requests.post(endpoint, params={"key": api_key}, json=payload, timeout=12)
        response.raise_for_status()
        data = response.json()
    except Exception:
        return None

    candidates = data.get("candidates") if isinstance(data, dict) else None
    if not isinstance(candidates, list) or not candidates:
        return None

    content = candidates[0].get("content", {})
    parts = content.get("parts", []) if isinstance(content, dict) else []
    text_part = ""
    for part in parts:
        if isinstance(part, dict) and isinstance(part.get("text"), str):
            text_part = part["text"]
            break

    if not text_part:
        return None

    parsed = _extract_json_object(text_part)
    if not parsed:
        return None

    label = _normalize_quality_label(str(parsed.get("freshness", "")))
    if not label:
        reason = str(parsed.get("reason", "")).strip().lower()
        if any(token in reason for token in {"non-food", "not food", "not a photograph of food", "diagram", "garbage", "trash", "rotten", "mold"}):
            label = FRESHNESS_SPOILED
        elif any(token in reason for token in {"unclear", "blurry", "cannot determine", "not sure"}):
            label = FRESHNESS_QUESTIONABLE
    if not label:
        raw_lower = text_part.lower()
        if any(token in raw_lower for token in {"spoiled", "rotten", "bad quality", "garbage", "trash", "non-food", "not applicable"}):
            label = FRESHNESS_SPOILED
        elif "questionable" in raw_lower or "uncertain" in raw_lower:
            label = FRESHNESS_QUESTIONABLE
        elif "fresh" in raw_lower or "good quality" in raw_lower:
            label = FRESHNESS_FRESH

    if not label:
        return None

    confidence_raw = parsed.get("confidence")
    try:
        confidence = float(confidence_raw)
    except Exception:
        confidence = 0.7 if label == FRESHNESS_FRESH else 0.75

    if not np.isfinite(confidence) or confidence <= 0:
        confidence = 0.78 if label == FRESHNESS_FRESH else (0.82 if label == FRESHNESS_SPOILED else 0.62)

    return {
        "freshness": label,
        "confidence": round(_clamp(confidence), 4),
        "topPrediction": f"gemini:{model}",
    }


def _prediction_signals(predictions: list[tuple[str, str, float]]) -> dict[str, float]:
    top_confidence = float(predictions[0][2]) if predictions else 0.0
    freshness_score = _keyword_confidence(predictions, FOOD_KEYWORDS)
    spoilage_score = _keyword_confidence(predictions, SPOILAGE_KEYWORDS)
    non_food_score = _keyword_confidence(predictions, NON_FOOD_KEYWORDS)
    fungus_hint_score = _keyword_confidence(predictions, FUNGUS_HINT_KEYWORDS)

    if top_confidence < 0.2:
        spoilage_score = max(spoilage_score, 0.3)

    return {
        "freshness": _clamp(freshness_score),
        "spoilage": _clamp(max(spoilage_score, non_food_score * 1.05)),
        "food_context": _clamp(max(freshness_score, top_confidence * (0.7 - min(non_food_score, 0.4)))),
        "non_food": _clamp(non_food_score),
        "fungus_hint": _clamp(fungus_hint_score),
    }


def _heuristic_signals(image: Image.Image) -> dict[str, float]:
    array = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    gray = np.dot(array[..., :3], np.array([0.299, 0.587, 0.114], dtype=np.float32))

    brightness = float(gray.mean())
    contrast = float(gray.std())
    grad_x = np.diff(gray, axis=1)
    grad_y = np.diff(gray, axis=0)
    sharpness = float(np.var(grad_x) + np.var(grad_y))

    hsv = np.asarray(image.convert("HSV"), dtype=np.float32)
    hue = (hsv[..., 0] / 255.0) * 360.0
    saturation_channel = hsv[..., 1] / 255.0
    value_channel = hsv[..., 2] / 255.0
    saturation = float(saturation_channel.mean())

    # Local contrast helps detect mold-like filaments/webbing on food surfaces.
    neighbor_mean = (
        np.roll(gray, 1, axis=0)
        + np.roll(gray, -1, axis=0)
        + np.roll(gray, 1, axis=1)
        + np.roll(gray, -1, axis=1)
    ) / 4.0
    local_contrast = np.abs(gray - neighbor_mean)

    dark_ratio = float((value_channel < 0.2).mean())
    gray_ratio = float((saturation_channel < 0.12).mean())
    brown_ratio = float(((hue >= 10) & (hue <= 45) & (saturation_channel >= 0.22) & (value_channel <= 0.75)).mean())
    rotten_spot_ratio = float(((saturation_channel < 0.28) & (value_channel < 0.38)).mean())
    whitish_ratio = float(((value_channel >= 0.68) & (saturation_channel <= 0.22)).mean())
    mold_fiber_ratio = float(
        (
            (value_channel >= 0.45)
            & (value_channel <= 0.88)
            & (saturation_channel >= 0.03)
            & (saturation_channel <= 0.32)
            & (local_contrast >= 0.11)
        ).mean()
    )
    green_blue_mold_ratio = float(
        (
            (hue >= 75)
            & (hue <= 170)
            & (saturation_channel >= 0.12)
            & (saturation_channel <= 0.45)
            & (value_channel <= 0.68)
        ).mean()
    )

    mold_risk = _clamp(
        0.28 * mold_fiber_ratio
        + 0.32 * green_blue_mold_ratio
        + 0.08 * whitish_ratio
        + 0.32 * rotten_spot_ratio
    )

    low_contrast_penalty = _clamp((0.18 - contrast) * 4.5)
    low_sharpness_penalty = _clamp((0.022 - sharpness) * 12.0)
    low_saturation_penalty = _clamp((0.22 - saturation) * 3.0)

    spoiled_score = _clamp(
        0.2 * dark_ratio
        + 0.17 * brown_ratio
        + 0.17 * rotten_spot_ratio
        + 0.1 * gray_ratio
        + 0.22 * mold_risk
        + 0.1 * low_contrast_penalty
        + 0.1 * low_sharpness_penalty
        + 0.06 * low_saturation_penalty
    )

    vibrancy_score = _clamp((saturation - 0.16) * 2.4)
    contrast_score = _clamp((contrast - 0.08) * 4.0)
    sharpness_score = _clamp((sharpness - 0.01) * 10.0)
    lighting_score = 1.0 - _clamp(abs(brightness - 0.55) * 2.1)

    fresh_score = _clamp(
        (
            0.32 * (1.0 - dark_ratio)
            + 0.2 * (1.0 - brown_ratio)
            + 0.16 * (1.0 - rotten_spot_ratio)
            + 0.14 * vibrancy_score
            + 0.1 * contrast_score
            + 0.08 * sharpness_score
        ) * (0.75 + 0.25 * lighting_score)
    )

    return {
        "freshness": fresh_score,
        "spoilage": spoiled_score,
        "mold_risk": mold_risk,
    }


def _decide_freshness(
    model_signals: dict[str, float],
    heuristic_signals: dict[str, float],
) -> tuple[str, float]:
    model_fresh = model_signals["freshness"]
    model_spoiled = model_signals["spoilage"]
    model_food_context = model_signals["food_context"]
    non_food_score = model_signals.get("non_food", 0.0)
    fungus_hint = model_signals.get("fungus_hint", 0.0)
    heuristic_fresh = heuristic_signals["freshness"]
    heuristic_spoiled = heuristic_signals["spoilage"]
    mold_risk = heuristic_signals.get("mold_risk", 0.0)

    combined_spoiled = _clamp(0.62 * model_spoiled + 0.38 * heuristic_spoiled)
    combined_fresh = _clamp(0.68 * model_fresh + 0.32 * heuristic_fresh)

    if non_food_score >= 0.18 and model_food_context < 0.2:
        return FRESHNESS_SPOILED, round(max(0.62, 0.5 + non_food_score * 0.45), 4)

    if mold_risk >= 0.2:
        combined_spoiled = _clamp(max(combined_spoiled, 0.46 + 0.42 * mold_risk))
    if fungus_hint >= 0.32 and (mold_risk >= 0.12 or heuristic_spoiled >= 0.3):
        combined_spoiled = _clamp(max(combined_spoiled, 0.34 + 0.5 * fungus_hint))

    if model_food_context < 0.16 and combined_spoiled < 0.45 and combined_fresh < 0.55:
        return FRESHNESS_QUESTIONABLE, 0.46

    if model_food_context < 0.24 and combined_spoiled <= 0.35:
        return FRESHNESS_FRESH, 0.58

    spoilage_margin = combined_spoiled - combined_fresh
    freshness_margin = combined_fresh - combined_spoiled

    if mold_risk >= 0.24 and heuristic_spoiled >= 0.28:
        return FRESHNESS_SPOILED, round(max(0.62, combined_spoiled), 4)

    if combined_spoiled >= 0.44 and spoilage_margin >= 0.03:
        return FRESHNESS_SPOILED, round(max(0.5, combined_spoiled), 4)

    if (
        combined_fresh >= 0.59
        and freshness_margin >= 0.05
        and model_food_context >= 0.2
        and heuristic_spoiled <= 0.22
        and mold_risk <= 0.14
    ):
        return FRESHNESS_FRESH, round(max(0.56, combined_fresh), 4)

    if mold_risk >= 0.2:
        uncertain_confidence = _clamp(0.5 + mold_risk * 0.28, 0.5, 0.78)
        return FRESHNESS_QUESTIONABLE, round(uncertain_confidence, 4)

    if combined_spoiled <= 0.39:
        confidence = _clamp(0.56 + (0.39 - combined_spoiled) * 0.6 + max(freshness_margin, 0.0) * 0.2, 0.56, 0.83)
        return FRESHNESS_FRESH, round(confidence, 4)

    if combined_spoiled >= 0.48:
        return FRESHNESS_SPOILED, round(max(0.56, combined_spoiled), 4)

    uncertain_confidence = _clamp(0.42 + abs(freshness_margin - spoilage_margin) * 0.35, 0.42, 0.72)
    return FRESHNESS_QUESTIONABLE, round(uncertain_confidence, 4)


def analyze_food_freshness(image_bytes: bytes) -> dict[str, str | float]:
    try:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except UnidentifiedImageError as exc:
        raise ValueError("Uploaded file is not a valid image") from exc

    if _is_gemini_enabled():
        gemini_result = _analyze_with_gemini(image_bytes)
        if not gemini_result:
            raise RuntimeError("Gemini quality analysis failed")
        return {
            "freshness": str(gemini_result["freshness"]),
            "confidence": round(float(gemini_result["confidence"]), 4),
            "topPrediction": str(gemini_result["topPrediction"]),
        }

    heuristic_signals = _heuristic_signals(image)

    model_image = image.resize((224, 224))
    image_array = np.array(model_image, dtype=np.float32)
    image_array = np.expand_dims(image_array, axis=0)
    image_array = preprocess_input(image_array)

    try:
        model = _get_model()
        raw_predictions = model.predict(image_array, verbose=0)
        decoded_predictions = decode_predictions(raw_predictions, top=5)[0]

        model_signals = _prediction_signals(decoded_predictions)
        label, confidence = _decide_freshness(model_signals, heuristic_signals)
        top_label = decoded_predictions[0][1] if decoded_predictions else "unknown"

    except Exception:
        heuristic_spoiled = heuristic_signals["spoilage"]
        heuristic_fresh = heuristic_signals["freshness"]
        if heuristic_spoiled >= 0.52 and heuristic_spoiled >= heuristic_fresh:
            label, confidence = FRESHNESS_SPOILED, round(heuristic_spoiled, 4)
        elif heuristic_fresh >= 0.62:
            label, confidence = FRESHNESS_FRESH, round(heuristic_fresh, 4)
        else:
            label, confidence = FRESHNESS_QUESTIONABLE, 0.46
        top_label = "heuristic_only"

    return {
        "freshness": label,
        "confidence": round(confidence, 4),
        "topPrediction": top_label,
    }


def should_mark_verified(freshness: str, confidence: float) -> bool:
    return freshness == FRESHNESS_FRESH and confidence >= 0.55