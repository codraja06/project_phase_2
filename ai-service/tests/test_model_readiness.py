from app.model_readiness import coverage
import json
from app.detector import CivicIssueDetector


def test_coverage_uses_actual_classes_not_model_names():
    rows = coverage([{"id": "road_damage", "state": "ready", "categories": ["pothole"]},
                     {"id": "streetlight", "state": "unavailable", "categories": ["broken_streetlight"]}])
    assert next(row for row in rows if row["category"] == "pothole")["available"]
    assert not next(row for row in rows if row["category"] == "road_damage")["available"]
    assert not next(row for row in rows if row["category"] == "broken_streetlight")["available"]


def test_model_paths_and_thresholds_from_dotenv_are_used_without_label_renaming(tmp_path, monkeypatch):
    weights = tmp_path / 'road.pt'
    weights.touch()
    registry = tmp_path / 'registry.json'
    registry.write_text(json.dumps([{'id': 'road_damage', 'path': str(tmp_path / 'missing.pt'),
                                    'pathEnv': 'TEST_DOTENV_MODEL_PATH', 'categories': ['road_damage']}]))
    monkeypatch.setattr('app.detector.dotenv_values', lambda _: {
        'TEST_DOTENV_MODEL_PATH': str(weights), 'TEST_DOTENV_MODEL_CONFIDENCE': '0.7'})
    class Model:
        names = {0: 'pothole'}
    detector = CivicIssueDetector(str(registry), lambda _: Model())
    assert detector.registry['road_damage']['threshold'] == .7
    assert detector.describe_models()[0]['categories'] == ['pothole']
    assert detector.describe_models()[0]['unsupportedCategories'] == ['road_damage']
    monkeypatch.setenv('TEST_DOTENV_MODEL_ENABLED', 'false')
    assert CivicIssueDetector(str(registry), lambda _: Model()).describe_models()[0]['state'] == 'disabled'
    monkeypatch.delenv('TEST_DOTENV_MODEL_ENABLED')
    monkeypatch.setenv('TEST_DOTENV_MODEL_PATH', '')
    assert CivicIssueDetector(str(registry), lambda _: Model()).describe_models()[0]['state'] == 'disabled'
    monkeypatch.delenv('TEST_DOTENV_MODEL_PATH')
    monkeypatch.setattr('app.detector.dotenv_values', lambda _: {'TEST_DOTENV_MODEL_PATH': ''})
    assert CivicIssueDetector(str(registry), lambda _: Model()).describe_models()[0]['state'] == 'disabled'
