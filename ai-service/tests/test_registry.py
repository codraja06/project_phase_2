import io
import json
import numpy as np
import pytest
from PIL import Image
from app.detector import CivicIssueDetector, apply_nms


class Tensor:
    def __init__(self, value): self.value = value
    def cpu(self): return self
    def numpy(self): return np.array(self.value)


class Box:
    xyxy = [Tensor([5, 5, 30, 30])]
    conf = [Tensor(.8)]
    cls = [Tensor(0)]


class FakeModel:
    def __init__(self, path):
        self.names = {0: 'pothole' if 'road' in path else 'garbage'}
        self.fail = False
    def predict(self, **kwargs):
        if self.fail: raise RuntimeError('Test inference failure')
        return [type('Result', (), {'boxes': [Box()]})()]


@pytest.fixture
def configured(tmp_path):
    entries = []
    for name in ['road', 'garbage']:
        file = tmp_path / f'{name}.pt'; file.touch()
        entries.append({'id': name, 'path': str(file), 'pathEnv': f'TEST_{name.upper()}_MODEL_PATH',
                        'categories': ['pothole'] if name == 'road' else ['garbage']})
    entries.append({'id': 'streetlight', 'path': str(tmp_path / 'missing.pt'), 'categories': ['broken_streetlight']})
    registry = tmp_path / 'registry.json'; registry.write_text(json.dumps(entries))
    return CivicIssueDetector(str(registry), FakeModel)


def image():
    buf = io.BytesIO(); Image.new('RGB', (50, 50)).save(buf, format='PNG'); return buf.getvalue()


def test_auto_and_category_routing_return_actual_model_identifiers(configured):
    detections, models, warnings = configured.detect_with_metadata(image())
    assert set(models) == {'road', 'garbage'} and not warnings
    assert {d['category'] for d in detections} == {'pothole', 'garbage'}
    assert configured.select_models('pothole') == ['road']
    detections, models, _ = configured.detect_with_metadata(image(), 'garbage')
    assert models == ['garbage'] and detections[0]['bbox']['x1'] == 5


def test_missing_and_incompatible_models_are_explicit(configured):
    with pytest.raises(RuntimeError, match='No compatible trained model'):
        configured.select_models('broken_streetlight')
    # A filename cannot imply road damage if its actual trained class is pothole.
    with pytest.raises(RuntimeError, match='No compatible trained model'):
        configured.select_models('road_damage')
    with pytest.raises(ValueError): configured.select_models('unknown-category')
    assert next(m for m in configured.describe_models() if m['id'] == 'streetlight')['state'] == 'unavailable'


def test_inference_failure_does_not_masquerade_as_no_detection(configured):
    configured.models['road'].fail = True
    _, models, warnings = configured.detect_with_metadata(image())
    assert models == ['garbage'] and 'road' in warnings[0]
    configured.models['garbage'].fail = True
    with pytest.raises(RuntimeError, match='All selected detection models failed'):
        configured.detect(image())


def test_nms_preserves_overlapping_different_categories():
    box = {'x1': 0, 'y1': 0, 'x2': 20, 'y2': 20}
    assert len(apply_nms([{'category': 'pothole', 'confidence': .9, 'bbox': box},
                          {'category': 'garbage', 'confidence': .8, 'bbox': box}])) == 2


def test_camera_exif_orientation_is_applied_before_inference(configured):
    captured = {}
    original = configured.models['road'].predict
    def predict(**kwargs):
        captured['shape'] = kwargs['source'].shape
        return original(**kwargs)
    configured.models['road'].predict = predict
    photo = Image.new('RGB', (100, 50)); exif = photo.getexif(); exif[274] = 6
    buf = io.BytesIO(); photo.save(buf, format='JPEG', exif=exif)
    configured.detect(buf.getvalue(), 'pothole')
    assert captured['shape'] == (100, 50, 3)
