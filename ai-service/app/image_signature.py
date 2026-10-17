"""Conservative visual-duplicate signals, not a same-incident classifier."""
import io
from PIL import Image, ImageOps

MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 24_000_000

def image_signature(contents: bytes):
    if not contents or len(contents) > MAX_BYTES:
        raise ValueError('Choose an image up to 10 MB.')
    try:
        with Image.open(io.BytesIO(contents)) as source:
            if source.format not in ('JPEG', 'PNG', 'WEBP') or source.width * source.height > MAX_PIXELS:
                raise ValueError('Choose a JPEG, PNG or WebP image up to 24 megapixels.')
            image = ImageOps.exif_transpose(source).convert('RGB')
            gray_image = image.convert('L').resize((9, 8), Image.Resampling.LANCZOS)
            pixels = gray_image.load()
            gray = [pixels[x, y] for y in range(8) for x in range(9)]
            bits = 0
            for y in range(8):
                for x in range(8):
                    bits = (bits << 1) | int(gray[y * 9 + x] > gray[y * 9 + x + 1])
            rgb = image.resize((64, 64), Image.Resampling.LANCZOS)
            hist = rgb.histogram()
            bins = [sum(hist[channel * 256 + i:channel * 256 + i + 16]) / 4096 for channel in range(3) for i in range(0, 256, 16)]
            return {'method': 'dhash64-rgb48-v1', 'hash': f'{bits:016x}', 'histogram': bins}
    except (OSError, Image.DecompressionBombError) as error:
        raise ValueError('The image could not be decoded safely.') from error
