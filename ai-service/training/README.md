# CivicTrack model training and evaluation

Training is an explicit offline task. Application startup never trains a model. Current
weights and their actual supported classes are documented in
[MODEL_CONFIGURATION.md](../models/MODEL_CONFIGURATION.md). Supplied weights have not
been evaluated against a representative held-out local test set; no accuracy figures
are available. Loading a file or detecting a demonstration image is not validation.

## Dataset preparation

Maintain a separate dataset/configuration per detector. Record source/license, collection
region/date, annotation guide, defect definitions, class names, and dataset version.
Use real YOLO detection labels: `class_id center_x center_y width height`, normalized to
0-1. Validate every ID against that dataset YAML; reject out-of-bounds boxes and corrupt
images. Inspect the source annotation format before conversion. Do not assume a download
uses COCO, VOC or YOLO merely because another copy of the dataset uses that format.

Split train/validation/test by scene, incident, capture sequence and location where
possible; remove near-duplicate images across splits. Hold out the test set until model
selection is complete. Keep all three image and label directories. `dataset.yaml` in this
folder is a five-class template, not a description of every supplied weight file.
Replace it with your actual dataset paths/names. No dataset or labeled severity corpus
is supplied by these implementation changes. Never treat a normal streetlight detector
as proof that a lamp is faulty.

## Train explicitly

Activate the existing AI virtual environment and install `requirements.txt`. From this
folder, use the existing script with deployment disabled during experimentation:

```powershell
python train.py --data dataset.yaml --model yolov8n.pt --epochs 100 --batch 16 --no-deploy
```

The numbers above are training settings, not a performance promise. Choose hardware,
image size and batch size appropriate to your dataset. Keep each run's arguments,
random seed, environment/package versions, dataset hash, class definitions, results
and weight checksum together. The script's optional legacy deployment writes
`models/best.pt`; use distinct model paths for the multi-model registry instead.

## Evaluate before enabling a model

Use the same dataset YAML with an explicit `test: images/test` entry. Validate after
training with the installed Ultralytics API:

```python
from ultralytics import YOLO
model = YOLO('runs/detect/train/weights/best.pt')
metrics = model.val(data='dataset.yaml', split='test')
print('precision:', metrics.box.mp)
print('recall:', metrics.box.mr)
print('mAP50:', metrics.box.map50)
print('mAP50-95:', metrics.box.map)
```

Record per-class metrics, confusion/errors, thresholds and CPU/device latency alongside
aggregate scores. Review results by lighting, location, camera and defect type. Do not
publish validation-set metrics as held-out test performance. There are no verified local
precision, recall, mAP or latency claims for the current supplied weights.

## Enable and monitor

Map actual class names in `models/registry.json`; do not mix incompatible numeric IDs
across datasets. Configure that model's `*_MODEL_PATH`, enabled flag and threshold in the
AI service environment, then restart. `/health` must report the expected categories and
weight version. Test category-specific requests, empty results, failure states and real
bounding boxes. Keep the previous weights to support rollback. New streetlight,
water-leakage and dedicated road-damage capability requires compatible trained weights
and evaluation; filenames alone do not establish those capabilities.

Severity remains an explicitly unvalidated rule-based estimate. Training a severity
model requires reviewed severity labels, a separate held-out evaluation and uncertainty
analysis. Visual duplicate thresholds likewise require a labeled same-incident dataset
before any reliability claim.
