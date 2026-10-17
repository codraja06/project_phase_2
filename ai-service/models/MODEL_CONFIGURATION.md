# Independent civic model registry

`registry.json` declares one independently configured model per entry. Paths are relative
to `ai-service`, or absolute. `MODEL_REGISTRY_PATH` can select another JSON registry.
Each entry has a stable `id`, `path`, `pathEnv`, supported `categories`, optional
`confidence`, optional `enabled`, and optional `classMap` for explicitly documented labels.
The detector verifies actual model class names before routing a selected category.

| Model identifier | Path environment variable | Local weights and observed labels |
| --- | --- | --- |
| pothole | POTHOLE_MODEL_PATH | Existing `pothole_roaddamage/best.pt`: pothole |
| road_damage | ROAD_DAMAGE_MODEL_PATH | Existing `pothole_roaddamage/best_road.pt`: **Pothole only** |
| garbage_overflow | GARBAGE_MODEL_PATH | Existing garbage model: broken/healthy/open/closed trash can, trash overflow; normal bin labels are excluded |
| dead_animal_broken_tree | OTHER_CIVIC_MODEL_PATH | Existing model: bin conditions, overflowing bin, dead animal, broken tree |
| streetlight | STREETLIGHT_MODEL_PATH | No compatible trained weights supplied in this checkout |
| water_leakage | WATER_LEAKAGE_MODEL_PATH | No compatible trained weights supplied in this checkout |

The filename `best_road.pt` does **not** establish a road-damage capability: its actual
class names were inspected and contain only pothole. Automatic mode preserves its pothole
inference. A selected `road_damage` request returns an explicit unavailable-model response
until compatible weights with road-damage classes are configured. No labels are inferred
from filenames or numeric class IDs.

For every `*_MODEL_PATH` variable, the matching `*_MODEL_ENABLED=false` disables it and
`*_MODEL_CONFIDENCE` sets its confidence threshold (0–1). For example:

```dotenv
STREETLIGHT_MODEL_PATH=models/streetlight/best.pt
STREETLIGHT_MODEL_ENABLED=true
STREETLIGHT_MODEL_CONFIDENCE=0.50
```

An explicitly empty path disables that model. Models without configured files are
unavailable, while other models continue to work. Keep binary weights outside Git.
Restart the service after changing model configuration. `/health` lists actual loaded
models, normalized classes, missing/disabled/error states and unsupported configured classes.

`POST /predict` accepts multipart `image` and optional `category=auto`. Automatic mode
runs loaded models; a selected category runs only models whose actual labels support it.
The response retains actual `category`, pixel-space `bbox`, confidence, and `model` per
detection, plus `modelsUsed` and `warnings`. Unknown category is 400, unavailable/all-failed
models are 503, and partial inference failure is reported in warnings. Different categories
are not suppressed as duplicates merely because their boxes overlap.

## Training and enabling additional models

Use the existing procedures and scripts in `../training/README.md` from this folder
(the project path is `ai-service/training/README.md`). For each added detector:

1. Obtain a real, licensed dataset with labels for the intended defect. Record provenance,
   label definitions and dataset version. A model detecting ordinary streetlights cannot
   establish that a lamp is broken or non-functional from a daytime photo.
2. Split into training, validation and held-out test sets without near-duplicate scene leakage.
   Export a YOLO-compatible dataset YAML with meaningful class names.
3. Train using the existing Ultralytics tooling, retaining hyperparameters and split details.
   Evaluate held-out per-class precision/recall, mAP, misses and false positives. Include
   negative scenes and representative lighting, viewpoints and local conditions.
4. Save the reviewed weights in its own model directory, set its path/threshold, and verify
   `/health` lists the intended normalized classes. Add a `classMap` only for documented
   aliases; never relabel an unrelated or numerical class to pretend compatibility.
5. Test real images through `/predict` and `/api/ai/detect`, and visually check resized boxes.
   Record evaluation results before describing a detector as validated.

Streetlight and water-leakage training was not performed in this change: compatible datasets
and trained weights were not available. The existing YOLO models were exercised locally;
these smoke checks establish integration, not detection or severity accuracy.

## Version and image safety metadata

Every loaded weight file receives a SHA-256 content-version identifier once at startup
(or an explicit configured registry version). Health metadata and actual detections carry
that version; complaint bounding boxes preserve it. Uploads accept JPEG/PNG/WebP, at most
10 MB and 24 megapixels. `/image-signature` runs independently of detector readiness and
returns a conservative dHash64/RGB48 visual comparison signal. It does not classify an
issue, infer severity, or confirm the same physical incident. No accuracy claim follows
from model loading or smoke tests. Held-out local evaluation is still required.
