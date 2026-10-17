"""Experimental detection-derived triage, not a validated severity classifier.

Bounding-box coverage is an image-space proxy only, never physical damage size.
Descriptions deliberately verbalize detections rather than infer scene details.
"""
import math

VERSION = "detection-triage-v1"
BASE = {"pothole": 35, "road_damage": 35, "garbage": 15,
        "garbage_overflow": 25, "broken_streetlight": 25, "drainage": 30,
        "drainage_problem": 30, "water_leakage": 30, "dead_animal": 35,
        "broken_tree": 40}


def assess(detections, width, height):
    severity = {"level": None, "state": "uncertain", "method": VERSION,
                "validated": False, "reason": "Insufficient confident image evidence; authority review required.",
                "evidence": []}
    usable = []
    candidates = []
    for det in detections:
        cat, confidence, box = det["category"], det["confidence"], det["bbox"]
        coords = [box[k] for k in ("x1", "y1", "x2", "y2")]
        if not all(math.isfinite(v) for v in [confidence, *coords]):
            continue
        x1, y1, x2, y2 = coords
        if not (0 <= x1 < x2 <= width and 0 <= y1 < y2 <= height and 0 <= confidence <= 1):
            continue
        if cat not in BASE or confidence < .6:
            continue
        coverage = (x2 - x1) * (y2 - y1) / (width * height)
        evidence = {"category": cat, "detectionConfidence": confidence,
                    "imageCoverage": round(coverage, 4), "model": det["model"]}
        usable.append(evidence)
        score = BASE[cat] + (30 if coverage >= .3 else 15 if coverage >= .1 else 0)
        candidates.append((score, evidence))
    if candidates:
        score, _ = max(candidates, key=lambda item: item[0])
        severity.update(level="High" if score >= 60 else "Medium" if score >= 35 else "Low",
                        state="estimated", evidence=usable,
                        reason="Experimental estimate from detected category and image-space coverage; not validated. Authority review required.")
    description = None
    if usable:
        observations = []
        for category in dict.fromkeys(item["category"] for item in usable):
            items = [item for item in usable if item["category"] == category]
            coverage = max(item["imageCoverage"] for item in items)
            observations.append(f"{category.replace('_', ' ')} ({len(items)} detected region(s), largest region about {round(coverage * 100)}% of the image)")
        description = "The image detection suggests " + "; ".join(observations) + ". Please inspect the reported issue."
    return severity, description
