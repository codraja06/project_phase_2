import math
import pytest
from app.assessment import assess


def detection(category="pothole", confidence=.9, size=60):
    return {"category": category, "confidence": confidence,
            "bbox": {"x1": 0, "y1": 0, "x2": size, "y2": size}, "model": "test"}


@pytest.mark.parametrize("category,size,level", [
    ("garbage", 10, "Low"), ("pothole", 10, "Medium"), ("pothole", 60, "High")])
def test_estimates_and_grounded_description(category, size, level):
    severity, description = assess([detection(category, size=size)], 100, 100)
    assert severity["level"] == level
    assert severity["validated"] is False
    assert severity["evidence"][0]["imageCoverage"] == size * size / 10000
    assert category.replace("_", " ") in description
    assert "address" not in description and "caused" not in description


@pytest.mark.parametrize("detections", [[], [detection(confidence=.59)],
    [detection(category="unknown")], [detection(size=110)], [detection(confidence=math.nan)]])
def test_uncertain_evidence_never_invents_a_level_or_description(detections):
    severity, description = assess(detections, 100, 100)
    assert severity["level"] is None
    assert severity["state"] == "uncertain"
    assert description is None


def test_mixed_detections_use_highest_severity_not_highest_confidence():
    severity, description = assess([detection("garbage", .99, 10), detection("pothole", .7, 80)], 100, 100)
    assert severity["level"] == "High"
    assert "garbage" in description and "pothole" in description
