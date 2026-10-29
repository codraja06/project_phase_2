# Python FastAPI YOLO AI Computer Vision Microservice

This microservice provides automated object detection for civic issue images using Ultralytics YOLOv8.

## Available civic issue classes

Class IDs belong to each trained model, not to a single application-wide numbered
list. See [the actual model coverage](models/MODEL_CONFIGURATION.md). Current
weights support pothole, garbage/overflow, dead animal and broken tree categories.
The existing road-model file contains a pothole class only. Road damage, broken
streetlight, water leakage and drainage require compatible trained weights.

## API Endpoints

- `GET /health`: Microservice health check & model configuration status.
- `POST /predict`: Receives multipart/form-data image, executes detection, and returns bounding boxes `[x1, y1, x2, y2]`, class names, and confidence scores.

## Setup Instructions

1. Create a virtual environment and install requirements:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Configure independent weights through `models/registry.json` or the model path
   variables in `ai-service/.env`. `MODEL_PATH` is only a legacy fallback.
3. Run the microservice:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
# Current multi-model configuration

See [independent model configuration](models/MODEL_CONFIGURATION.md) and
[the registry](models/registry.json) for the current loader, environment variables,
category routing, actual class compatibility, and availability limits. `MODEL_PATH`
remains a legacy fallback. The existing `best_road.pt` exposes a pothole class;
road-damage, streetlight, and water-leakage inference require compatible weights.

The service reads `ai-service/.env` regardless of the working directory. Process
environment variables override that file. An explicitly empty model path disables
that model. Restart after changes, then run:

```powershell
.\venv\Scripts\python.exe -m app.model_readiness
```

The command loads actual weights and reports actual normalized classes; exit code
2 means required coverage is missing. A loaded model is not an accuracy validation.
