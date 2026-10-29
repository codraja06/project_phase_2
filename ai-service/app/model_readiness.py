"""Report actual trained-class coverage. Does not download or rename model predictions."""
import json
from app.detector import detector_instance

REQUIRED = {"pothole": "POTHOLE_MODEL_PATH", "road_damage": "ROAD_DAMAGE_MODEL_PATH",
            "garbage": "GARBAGE_MODEL_PATH", "garbage_overflow": "GARBAGE_MODEL_PATH",
            "dead_animal": "OTHER_CIVIC_MODEL_PATH", "broken_tree": "OTHER_CIVIC_MODEL_PATH",
            "broken_streetlight": "STREETLIGHT_MODEL_PATH", "water_leakage": "WATER_LEAKAGE_MODEL_PATH",
            "drainage_problem": "WATER_LEAKAGE_MODEL_PATH"}


def coverage(models):
    ready = [model for model in models if model.get("state") == "ready"]
    return [{"category": category,
             "available": any(category in model.get("categories", []) for model in ready),
             "models": [model["id"] for model in ready if category in model.get("categories", [])],
             "configurationKey": key} for category, key in REQUIRED.items()]


if __name__ == "__main__":
    rows = coverage(detector_instance.describe_models())
    print(json.dumps({"loadedModels": len(detector_instance.models), "coverage": rows,
                      "allRequiredClassesAvailable": all(row["available"] for row in rows),
                      "accuracyValidated": False}, indent=2))
    raise SystemExit(0 if all(row["available"] for row in rows) else 2)
