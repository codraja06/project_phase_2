# Python FastAPI YOLO AI Computer Vision Microservice

This microservice provides automated object detection for civic issue images using Ultralytics YOLOv8.

## Supported Civic Issue Classes

- `0`: pothole
- `1`: road_damage
- `2`: garbage
- `3`: drainage
- `4`: broken_streetlight

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
2. Place model weights at `ai-service/models/best.pt` or specify `MODEL_PATH` in environment.
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
