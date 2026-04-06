from io import BytesIO
from typing import Any

import numpy as np
from PIL import Image, UnidentifiedImageError
from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, decode_predictions, preprocess_input

FRESHNESS_FRESH = "Fresh"
FRESHNESS_QUESTIONABLE = "Questionable"
FRESHNESS_SPOILED = "Spoiled"

_model: Any | None = None


def _get_model() -> Any:
    global _model
    if _model is None:
        _model = MobileNetV2(weights="imagenet")
    return _model


def _score_from_predictions(predictions: list[tuple[str, str, float]]) -> tuple[str, float]:
    spoilage_keywords = {
        "stinkhorn",
        "mushroom",
        "agaric",
        "earthstar",
        "hen-of-the-woods",
        "bolete",
        "garbage",
        "trash",
        "ashcan",
        "bin",
        "dumpster",
        "garbage_truck",
        "plastic_bag",
    }
    fresh_keywords = {
        "apple",
        "banana",
        "orange",
        "strawberry",
        "broccoli",
        "cucumber",
        "zucchini",
        "carrot",
        "cauliflower",
        "bell_pepper",
        "lemon",
        "lime",
        "pineapple",
        "pomegranate",
        "granny_smith",
        "artichoke",
        "corn",
    }

    for _, label, confidence in predictions:
        if any(keyword in label for keyword in spoilage_keywords):
            return FRESHNESS_SPOILED, float(confidence)

    for _, label, confidence in predictions:
        if any(keyword in label for keyword in fresh_keywords):
            return FRESHNESS_FRESH, float(confidence)

    top_confidence = float(predictions[0][2]) if predictions else 0.0
    if top_confidence < 0.25:
        return FRESHNESS_SPOILED, top_confidence
    return FRESHNESS_QUESTIONABLE, top_confidence


def _heuristic_quality(image: Image.Image) -> tuple[str, float]:
    array = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    gray = np.dot(array[..., :3], np.array([0.299, 0.587, 0.114], dtype=np.float32))

    brightness = float(gray.mean())
    contrast = float(gray.std())
    grad_x = np.diff(gray, axis=1)
    grad_y = np.diff(gray, axis=0)
    sharpness = float(np.var(grad_x) + np.var(grad_y))

    hsv = np.asarray(image.convert("HSV"), dtype=np.float32)
    saturation = float((hsv[..., 1] / 255.0).mean())

    spoiled_score = 0.0
    if brightness < 0.2:
        spoiled_score += 0.4
    if contrast < 0.12:
        spoiled_score += 0.2
    if sharpness < 0.02:
        spoiled_score += 0.25
    if saturation < 0.18:
        spoiled_score += 0.2

    spoiled_score = max(0.0, min(1.0, spoiled_score))
    if spoiled_score >= 0.55:
        return FRESHNESS_SPOILED, round(spoiled_score, 4)
    if spoiled_score <= 0.25 and brightness > 0.32 and saturation > 0.24:
        return FRESHNESS_FRESH, round(max(0.55, 1.0 - spoiled_score), 4)
    return FRESHNESS_QUESTIONABLE, round(max(0.35, spoiled_score), 4)


def analyze_food_freshness(image_bytes: bytes) -> dict[str, str | float]:
    try:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except UnidentifiedImageError as exc:
        raise ValueError("Uploaded file is not a valid image") from exc

    heuristic_label, heuristic_confidence = _heuristic_quality(image)

    image = image.resize((224, 224))
    image_array = np.array(image, dtype=np.float32)
    image_array = np.expand_dims(image_array, axis=0)
    image_array = preprocess_input(image_array)

    try:
        model = _get_model()
        raw_predictions = model.predict(image_array, verbose=0)
        decoded_predictions = decode_predictions(raw_predictions, top=5)[0]

        model_label, model_confidence = _score_from_predictions(decoded_predictions)
        top_label = decoded_predictions[0][1] if decoded_predictions else "unknown"

        if model_label == FRESHNESS_SPOILED and model_confidence >= 0.3:
            label, confidence = model_label, model_confidence
        elif heuristic_label == FRESHNESS_SPOILED and heuristic_confidence >= 0.55:
            label, confidence = heuristic_label, heuristic_confidence
        elif model_label == FRESHNESS_FRESH and model_confidence >= 0.45:
            label, confidence = model_label, model_confidence
        else:
            label = heuristic_label if heuristic_confidence >= model_confidence else model_label
            confidence = max(model_confidence, heuristic_confidence)
    except Exception:
        label, confidence = heuristic_label, heuristic_confidence
        top_label = "heuristic_only"

    return {
        "freshness": label,
        "confidence": round(confidence, 4),
        "topPrediction": top_label,
    }


def should_mark_verified(freshness: str, confidence: float) -> bool:
    return freshness == FRESHNESS_FRESH and confidence >= 0.55