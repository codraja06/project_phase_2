import os
import io
import json
import math
from threading import Lock
import cv2
import numpy as np
from PIL import Image, ImageOps
from typing import List, Dict, Any
from app.config import settings

# Base directory for ai-service (contains models/, app/, etc.)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Classes that represent normal, non-hazard street conditions to filter out
NON_HAZARD_CLASSES = {
    "healthy_trash_can",
    "trash_can_closed",
    "trash_can_open",
    "empty_bin",
    "full_bin",
}

# Mapping raw model classes to standardized application categories
CLASS_MAPPING = {
    "pothole": "pothole",
    "road_damage": "road_damage",
    "crack": "road_damage",
    "trash_over_flow": "garbage_overflow",
    "overflowing_bin": "garbage_overflow",
    "garbage_overflow": "garbage_overflow",
    "broken_trash_can": "garbage",
    "garbage": "garbage",
    "dead_animal": "dead_animal",
    "broken_tree": "broken_tree",
    "broken_streetlight": "broken_streetlight",
    "drainage": "drainage_problem",
    "drainage_problem": "drainage_problem",
    "water_leakage": "water_leakage",
}


def calculate_iou(box1: Dict[str, float], box2: Dict[str, float]) -> float:
    """Calculates Intersection over Union (IoU) between two bounding boxes."""
    x_left = max(box1["x1"], box2["x1"])
    y_top = max(box1["y1"], box2["y1"])
    x_right = min(box1["x2"], box2["x2"])
    y_bottom = min(box1["y2"], box2["y2"])

    if x_right <= x_left or y_bottom <= y_top:
        return 0.0

    intersection_area = (x_right - x_left) * (y_bottom - y_top)
    box1_area = (box1["x2"] - box1["x1"]) * (box1["y2"] - box1["y1"])
    box2_area = (box2["x2"] - box2["x1"]) * (box2["y2"] - box2["y1"])
    union_area = box1_area + box2_area - intersection_area

    return intersection_area / union_area if union_area > 0 else 0.0


def apply_nms(detections: List[Dict[str, Any]], iou_threshold: float = 0.45) -> List[Dict[str, Any]]:
    """Suppresses duplicate and overlapping bounding boxes across models."""
    if not detections:
        return []

    # Sort detections by confidence descending
    sorted_detections = sorted(detections, key=lambda d: d.get("confidence", 0), reverse=True)
    kept_detections: List[Dict[str, Any]] = []

    for det in sorted_detections:
        should_keep = True
        for kept in kept_detections:
            iou = calculate_iou(det["bbox"], kept["bbox"])
            if kept["category"] == det["category"] and iou > iou_threshold:
                should_keep = False
                break
        if should_keep:
            kept_detections.append(det)

    return kept_detections


class CivicIssueDetector:
    def __init__(self, registry_path=None, model_factory=None):
        self.models, self.registry, self.model_status = {}, {}, {}
        self._inference_lock = Lock()
        path = self._resolve_path(registry_path or settings.MODEL_REGISTRY_PATH)
        try:
            with open(path, encoding="utf-8") as source:
                entries = json.load(source)
            for entry in entries:
                name = entry["id"]
                if name in self.registry:
                    raise ValueError("Duplicate model identifier")
                self.registry[name] = entry
        except (OSError, ValueError, KeyError, TypeError) as error:
            raise RuntimeError(f"Invalid model registry: {error}") from error
        self._load_models(model_factory)

    def _resolve_path(self, relative_path):
        if os.path.isabs(relative_path):
            return relative_path
        for candidate in (os.path.join(BASE_DIR, relative_path), os.path.abspath(relative_path)):
            if os.path.exists(candidate):
                return os.path.abspath(candidate)
        return os.path.abspath(os.path.join(BASE_DIR, relative_path))

    def _load_models(self, model_factory=None):
        if model_factory is None:
            try:
                from ultralytics import YOLO
                model_factory = YOLO
            except ImportError:
                for name in self.registry:
                    self.model_status[name] = {"state": "unavailable", "reason": "Ultralytics is not installed."}
                return
        for name, entry in self.registry.items():
            env_name = entry.get("pathEnv", "")
            configured_path = os.getenv(env_name, entry.get("path", ""))
            enabled = entry.get("enabled", True) and os.getenv(env_name.replace("_PATH", "_ENABLED"), "true").lower() not in ("false", "0", "no")
            state = {"state": "unavailable", "reason": "Trained weights are not configured.", "categories": entry["categories"]}
            self.model_status[name] = state
            if not enabled or not configured_path:
                state.update(state="disabled", reason="Model is disabled.")
                continue
            path = self._resolve_path(configured_path)
            if not os.path.isfile(path):
                continue
            try:
                threshold = float(os.getenv(env_name.replace("_PATH", "_CONFIDENCE"), str(max(settings.CONF_THRESHOLD, entry.get("confidence", .25)))))
                if not 0 <= threshold <= 1:
                    raise ValueError("Confidence must be between zero and one")
                entry["threshold"] = threshold
                model = model_factory(path)
                labels = model.names.values() if isinstance(model.names, dict) else model.names
                categories = sorted({self._category(str(label), entry) for label in labels} - {None})
                self.models[name] = model
                state.update(state="ready", reason="Weights loaded; accuracy is not validated here.", categories=categories, unsupportedCategories=sorted(set(entry["categories"]) - set(categories)))
            except Exception as error:
                state.update(state="error", reason=f"Model failed to load ({type(error).__name__}).")
        if not self.models and os.path.isfile(self._resolve_path(settings.MODEL_PATH)):
            try:
                self.models["default"] = model_factory(self._resolve_path(settings.MODEL_PATH))
                self.registry["default"] = {"threshold": settings.CONF_THRESHOLD, "categories": list(set(CLASS_MAPPING.values()))}
                labels = self.models["default"].names.values()
                self.model_status["default"] = {"state": "ready", "categories": sorted({self._category(str(label), {}) for label in labels} - {None}), "reason": "Legacy MODEL_PATH loaded."}
            except Exception:
                self.model_status["default"] = {"state": "error", "reason": "Legacy model could not be loaded."}

    @staticmethod
    def _category(raw, entry):
        label = raw.strip().lower().replace(" ", "_")
        if label in NON_HAZARD_CLASSES:
            return None
        return entry.get("classMap", {}).get(label, CLASS_MAPPING.get(label))

    def is_ready(self):
        return bool(self.models)

    def describe_models(self):
        return [{"id": name, **state} for name, state in self.model_status.items()]

    def select_models(self, category="auto"):
        if category == "auto":
            selected = list(self.models)
        else:
            if category not in set(CLASS_MAPPING.values()) | {"drainage"}:
                raise ValueError("Unsupported detection category.")
            category = CLASS_MAPPING.get(category, category)
            selected = [name for name in self.models if category in self.model_status.get(name, {}).get("categories", [])]
        if not selected:
            raise RuntimeError("No compatible trained model is available for this category. Use automatic detection or enter the complaint manually.")
        return selected

    def detect_with_metadata(self, image_bytes, category="auto"):
        if not self.is_ready():
            raise RuntimeError("No AI model weights are configured.")
        selected = self.select_models(category)
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes))).convert("RGB")
        image_np = np.array(image)
        width, height = image.size
        raw_detections, successful, warnings = [], [], []
        with self._inference_lock:
            for name in selected:
                model, entry = self.models[name], self.registry[name]
                try:
                    results = model.predict(source=image_np, conf=entry.get("threshold", settings.CONF_THRESHOLD), verbose=False)
                    if results:
                        for box in results[0].boxes:
                            x1, y1, x2, y2 = map(float, box.xyxy[0].cpu().numpy())
                            confidence = float(box.conf[0].cpu().numpy())
                            index = int(box.cls[0].cpu().numpy())
                            label = model.names.get(index) if isinstance(model.names, dict) else model.names[index]
                            normalized = self._category(str(label), entry)
                            if normalized is None:
                                continue
                            if category != "auto" and normalized != CLASS_MAPPING.get(category, category):
                                continue
                            if not all(math.isfinite(value) for value in (x1,y1,x2,y2,confidence)):
                                continue
                            x1,y1,x2,y2 = max(0,x1),max(0,y1),min(width,x2),min(height,y2)
                            if not 0 <= confidence <= 1 or x2 <= x1 or y2 <= y1 or confidence < entry.get("threshold", settings.CONF_THRESHOLD):
                                continue
                            raw_detections.append({"category": normalized, "confidence": round(confidence, 4),
                                "bbox": dict(zip(("x1","y1","x2","y2"), (round(x1,2),round(y1,2),round(x2,2),round(y2,2)))), "model": name})
                    successful.append(name)
                except Exception:
                    warnings.append(f"Inference failed for model {name}; results may be incomplete.")
        if not successful:
            raise RuntimeError("All selected detection models failed. Please try again or submit manually.")
        return apply_nms(raw_detections), successful, warnings

    def detect(self, image_bytes, category="auto"):
        return self.detect_with_metadata(image_bytes, category)[0]


detector_instance = CivicIssueDetector()
