#!/usr/bin/env python3
"""Download university logos via Wikipedia API and convert to pixel art."""

import os, time, json, urllib.request, urllib.parse
from pathlib import Path
from PIL import Image, ImageDraw
import io

LOGOS_DIR = Path(__file__).parent / "data" / "logos"
LOGOS_DIR.mkdir(exist_ok=True)

PIXEL_SIZE = 32
REAL_THRESHOLD = 500  # bytes — below this means it's a fallback
HEADERS = {
    'User-Agent': 'UniversityDestinyMatch/1.0 (educational; python-urllib)',
    'Accept': 'application/json',
}

UNIVERSITIES = [
    ("Harvard University",                   "harvard",    "Harvard_University"),
    ("Yale University",                      "yale",       "Yale_University"),
    ("Princeton University",                 "princeton",  "Princeton_University"),
    ("Columbia University",                  "columbia",   "Columbia_University"),
    ("University of Pennsylvania",           "upenn",      "University_of_Pennsylvania"),
    ("Dartmouth College",                    "dartmouth",  "Dartmouth_College"),
    ("Brown University",                     "brown",      "Brown_University"),
    ("Cornell University",                   "cornell",    "Cornell_University"),
    ("Massachusetts Institute of Technology","mit",        "Massachusetts_Institute_of_Technology"),
    ("Stanford University",                  "stanford",   "Stanford_University"),
    ("California Institute of Technology",   "caltech",    "California_Institute_of_Technology"),
    ("University of Chicago",                "uchicago",   "University_of_Chicago"),
    ("Duke University",                      "duke",       "Duke_University"),
    ("Northwestern University",              "northwestern","Northwestern_University"),
    ("Johns Hopkins University",             "jhu",        "Johns_Hopkins_University"),
    ("Carnegie Mellon University",           "cmu",        "Carnegie_Mellon_University"),
    ("Georgetown University",                "georgetown", "Georgetown_University"),
    ("Vanderbilt University",                "vanderbilt", "Vanderbilt_University"),
    ("Washington University in St. Louis",   "wustl",      "Washington_University_in_St._Louis"),
    ("University of California, Berkeley",   "ucberkeley", "University_of_California,_Berkeley"),
    ("University of California, Los Angeles","ucla",       "University_of_California,_Los_Angeles"),
    ("University of Michigan",               "umich",      "University_of_Michigan"),
    ("New York University",                  "nyu",        "New_York_University"),
    ("University of Oxford",                 "oxford",     "University_of_Oxford"),
    ("University of Cambridge",              "cambridge",  "University_of_Cambridge"),
    ("Imperial College London",              "imperial",   "Imperial_College_London"),
    ("London School of Economics",           "lse",        "London_School_of_Economics"),
    ("Seoul National University",            "snu",        "Seoul_National_University"),
    ("Yonsei University",                    "yonsei",     "Yonsei_University"),
    ("Korea University",                     "korea",      "Korea_University"),
    ("KAIST",                                "kaist",      "KAIST"),
    ("National University of Singapore",     "nus",        "National_University_of_Singapore"),
    ("The University of Tokyo",              "utokyo",     "University_of_Tokyo"),
    ("ETH Zurich",                           "eth",        "ETH_Zurich"),
    ("University of Toronto",                "toronto",    "University_of_Toronto"),
]

def wiki_thumbnail_url(article_title, size=200):
    title = urllib.parse.quote(article_title)
    api = (f"https://en.wikipedia.org/w/api.php"
           f"?action=query&titles={title}&prop=pageimages"
           f"&format=json&pithumbsize={size}")
    req = urllib.request.Request(api, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read())
        pages = data.get("query", {}).get("pages", {})
        for page in pages.values():
            thumb = page.get("thumbnail", {})
            if thumb.get("source"):
                return thumb["source"]
    except Exception as e:
        print(f"    API error: {e}")
    return None

def download_image(url, dest_path):
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        with open(dest_path, "wb") as f:
            f.write(data)
        return True
    except Exception as e:
        print(f"    Download error: {e}")
        return False

def to_pixel_art(src_path, dst_path, size=PIXEL_SIZE):
    img = Image.open(src_path).convert("RGBA")
    bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    bg.paste(img, mask=img.split()[3])
    img = bg.convert("RGB")
    img = img.resize((size, size), Image.LANCZOS)
    img.save(dst_path, "PNG", optimize=True)

def make_fallback(short, dst_path, size=PIXEL_SIZE):
    h = sum(ord(c) * (i+1) for i, c in enumerate(short)) * 6271
    r = max(60, (h >> 16) & 0xFF % 200 + 40)
    g = max(60, (h >> 8) & 0xFF % 180 + 40)
    b = max(60, h & 0xFF % 200 + 40)
    img = Image.new("RGB", (size, size), (r, g, b))
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    bar = max(2, size // 8)
    draw.rectangle([cx-bar, 4, cx+bar, size-5], fill=(255,255,255))
    draw.rectangle([4, cy-bar, size-5, cy+bar], fill=(255,255,255))
    img.save(dst_path, "PNG")

results = {}
print(f"Downloading logos (slow mode — 3s delay)...\n")

for uni_name, short, wiki_title in UNIVERSITIES:
    final_path = LOGOS_DIR / f"{short}.png"
    tmp_path = LOGOS_DIR / f"{short}_tmp"

    # Skip if real logo already exists
    if final_path.exists() and final_path.stat().st_size > REAL_THRESHOLD:
        print(f"[SKIP] {short}.png ({final_path.stat().st_size}b)")
        results[uni_name] = f"data/logos/{short}.png"
        continue

    print(f"[GET]  {short}")

    time.sleep(3)  # generous delay to avoid 429
    thumb_url = wiki_thumbnail_url(wiki_title, size=200)

    if not thumb_url:
        # Try alternative: Wikipedia REST summary API
        title = urllib.parse.quote(wiki_title)
        alt_api = f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
        req = urllib.request.Request(alt_api, headers={**HEADERS, 'Accept': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read())
            thumb = data.get("thumbnail", {}) or data.get("originalimage", {})
            if thumb.get("source"):
                thumb_url = thumb["source"]
                print(f"  (via REST API)")
        except Exception as e:
            print(f"  REST fallback error: {e}")

    if thumb_url:
        print(f"  URL: ...{thumb_url[-50:]}")
        time.sleep(1)
        ok = download_image(thumb_url, tmp_path)
        if ok and tmp_path.exists() and tmp_path.stat().st_size > 300:
            try:
                to_pixel_art(tmp_path, final_path, PIXEL_SIZE)
                print(f"  OK {short}.png ({final_path.stat().st_size}b)")
                results[uni_name] = f"data/logos/{short}.png"
            except Exception as e:
                print(f"  Convert error: {e} → fallback")
                make_fallback(short, final_path, PIXEL_SIZE)
                results[uni_name] = f"data/logos/{short}.png"
            tmp_path.unlink(missing_ok=True)
        else:
            print(f"  → download fail → fallback")
            make_fallback(short, final_path, PIXEL_SIZE)
            results[uni_name] = f"data/logos/{short}.png"
            tmp_path.unlink(missing_ok=True)
    else:
        print(f"  → no URL → fallback")
        make_fallback(short, final_path, PIXEL_SIZE)
        results[uni_name] = f"data/logos/{short}.png"

real = sum(1 for _, s, _ in UNIVERSITIES if (LOGOS_DIR / f"{s}.png").stat().st_size > REAL_THRESHOLD)
print(f"\n✓ {real}/{len(UNIVERSITIES)} real logos, rest fallbacks")
