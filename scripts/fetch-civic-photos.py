"""Download licensed reference photography and preserve Commons attribution metadata."""
import io
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1] / 'mobile' / 'assets' / 'civic'
ROOT.mkdir(parents=True, exist_ok=True)
PHOTOS = {
    'chennai-bridge': 'Napier Bridge in Chennai, Tamil Nadu 07.jpg',
    'marina-coast': 'Marina beach, Chennai aerial view.jpg',
    'chennai-streets': 'View-from-Marina-Beach-Lighthouse-Chennai-1.jpg',
    'pothole': 'Potholes in Bengaluru road.jpg',
    'waste': 'Improper garbage dumping.jpg',
    'streetlight': 'Street lamp1.jpg',
    'water': 'Leak in rusted pipe bottom view.jpg',
}

def request(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'CivicTrack/1.0 (educational civic interface; asset attribution included)'}), timeout=30).read()

def download(item):
    key, title = item
    params = urllib.parse.urlencode({'action': 'query', 'titles': 'File:' + title, 'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiurlwidth': 1600, 'format': 'json'})
    pages = json.loads(request('https://commons.wikimedia.org/w/api.php?' + params))['query']['pages']
    info = next(iter(pages.values()))['imageinfo'][0]
    metadata = info['extmetadata']
    clean = lambda field: re.sub('<[^>]+>', '', metadata.get(field, {}).get('value', ''))
    license_name = clean('LicenseShortName')
    if not any(value in license_name for value in ('CC BY', 'CC0', 'Public domain')):
        raise ValueError(f'Unsupported license for {title}: {license_name}')
    try:
        data = request(info.get('thumburl', info['url']))
    except Exception:
        data = request(info['url'])
    photo = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert('RGB')
    photo.thumbnail((1600, 1600))
    photo.save(ROOT / (key + '.jpg'), quality=86, optimize=True)
    return {'file': key + '.jpg', 'title': title, 'author': clean('Artist'), 'license': license_name,
            'licenseUrl': clean('LicenseUrl'), 'source': info['descriptionurl'],
            'changes': 'Resized and JPEG compressed. Display may be cropped and tinted in the interface.'}

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    with ThreadPoolExecutor(max_workers=3) as pool:
        credits = list(pool.map(download, PHOTOS.items()))
    (ROOT / 'credits.json').write_text(json.dumps(credits, indent=2, ensure_ascii=False), encoding='utf-8')
    for item in credits:
        print(item['file'], item['author'], item['license'])
