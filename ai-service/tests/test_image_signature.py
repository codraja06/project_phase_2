import io
import pytest
from PIL import Image
from app.image_signature import image_signature, MAX_BYTES

def photo(color='red', fmt='PNG'):
    output = io.BytesIO()
    Image.new('RGB', (128, 64), color).save(output, format=fmt)
    return output.getvalue()

def test_signature_is_stable_and_has_normalized_color_channels():
    signature = image_signature(photo())
    assert signature == image_signature(photo())
    assert len(signature['hash']) == 16
    assert len(signature['histogram']) == 48
    for channel in range(3):
        assert sum(signature['histogram'][channel * 16:(channel + 1) * 16]) == pytest.approx(1)
    assert signature['histogram'] != image_signature(photo('blue'))['histogram']

@pytest.mark.parametrize('contents', [b'', b'not an image', b'x' * (MAX_BYTES + 1)], ids=['empty', 'corrupt', 'oversized'])
def test_invalid_uploads_are_rejected(contents):
    with pytest.raises(ValueError):
        image_signature(contents)

def test_unsupported_decodable_formats_are_rejected():
    with pytest.raises(ValueError):
        image_signature(photo(fmt='BMP'))
