import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.schemas import PredictResponse, ErrorResponse
from app.detector import detector_instance
from app.assessment import assess
from app.image_signature import image_signature, MAX_BYTES

app = FastAPI(
    title="AI Civic Issue Detection Service",
    description="Ultralytics YOLO Computer Vision Microservice for Civic Problem Detection",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import io
from PIL import Image, ImageOps

@app.post('/image-signature')
async def fingerprint_image(image: UploadFile = File(...)):
    contents = await image.read(MAX_BYTES + 1)
    try:
        return await run_in_threadpool(image_signature, contents)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    model_ready = detector_instance.is_ready()
    return {
        "status": "OK",
        "service": "AI Object Detection Microservice",
        "modelConfigured": model_ready,
        "loadedModels": list(detector_instance.models.keys()),
        "modelCount": len(detector_instance.models),
        "modelPath": settings.MODEL_PATH
        ,"models": detector_instance.describe_models()
    }

@app.post(
    "/predict",
    response_model=PredictResponse,
    responses={
        503: {"model": ErrorResponse, "description": "AI Model Weights Unconfigured"},
        400: {"model": ErrorResponse, "description": "Invalid Image Input"}
    }
)
async def predict_issue(image: UploadFile = File(...), category: str = Form('auto')):
    # Check model availability first
    if not detector_instance.is_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI model weights are not configured. Please provide MODEL_PATH/best.pt."
        )

    try:
        contents = await image.read(MAX_BYTES + 1)
        if len(contents) > MAX_BYTES:
            raise HTTPException(status_code=413, detail='Choose an image up to 10 MB.')
        if not contents or len(contents) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded image file is empty."
            )

        # Validate image content using PIL
        try:
            test_img = Image.open(io.BytesIO(contents))
            if test_img.format not in ('JPEG', 'PNG', 'WEBP') or test_img.width * test_img.height > 24_000_000:
                raise ValueError('Unsupported image type or dimensions')
            test_img.verify()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provided file must be a valid image."
            )

        try:
            detections, models_used, warnings = await run_in_threadpool(detector_instance.detect_with_metadata, contents, category)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error))
        with Image.open(io.BytesIO(contents)) as source:
            severity, description = assess(detections, *ImageOps.exif_transpose(source).size)

        return PredictResponse(
            detected=len(detections) > 0,
            message="Civic issue detection completed successfully" if len(detections) > 0 else "No supported civic issue detected automatically.",
            detections=detections,
            severity=severity,
            generatedDescription=description,
            modelsUsed=models_used,
            warnings=warnings,
        )
    except HTTPException:
        raise
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(re)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Computer vision could not process this image. Please retry or report manually."
        )

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.AI_PORT, reload=True)
