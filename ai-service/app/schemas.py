from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class BoundingBox(BaseModel):
    x1: float = Field(..., description="Top-left X coordinate")
    y1: float = Field(..., description="Top-left Y coordinate")
    x2: float = Field(..., description="Bottom-right X coordinate")
    y2: float = Field(..., description="Bottom-right Y coordinate")

class DetectionItem(BaseModel):
    category: str = Field(..., description="Detected civic issue category")
    confidence: float = Field(..., description="Detection confidence score between 0 and 1")
    bbox: BoundingBox
    model: str = Field(..., description="Model that produced this detection")

class SeverityEvidence(BaseModel):
    category: str
    detectionConfidence: float = Field(ge=0, le=1)
    imageCoverage: float = Field(ge=0, le=1)
    model: str

class SeverityAssessment(BaseModel):
    level: Optional[Literal['Low', 'Medium', 'High']] = None
    state: Literal['estimated', 'uncertain', 'unavailable']
    method: str
    validated: Literal[False] = False
    reason: str
    evidence: List[SeverityEvidence] = Field(default_factory=list)

class PredictResponse(BaseModel):
    detected: bool = Field(..., description="Whether any issue was detected")
    message: Optional[str] = "Object detection executed successfully"
    detections: List[DetectionItem] = []
    severity: Optional[SeverityAssessment] = None
    generatedDescription: Optional[str] = None
    modelsUsed: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)

class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    detail: Optional[str] = None
