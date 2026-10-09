#!/usr/bin/env python3
"""
v3: Stockholm potholes (up to 15) + Stockholm cracks (up to 12) + Tallinn manholes (up to 10).
Clears existing images and re-downloads clean set.
Approval: ScanwAi (Olli), written 2026-10-09.
"""

import io, json, ssl, sys, time, csv
from pathlib import Path
from collections import defaultdict

SCANWAI_DIR    = Path.home() / "scanwai-raportti-web" / "data" / "private"
CONSOLE_IMAGES = Path.home() / "Claude/Projects/scancrowd-demo/console/public/images"
PRIVATE_DIR    = Path.home() / "Claude/Projects/scancrowd-demo-private"

OBS_FILES = [
    (SCANWAI_DIR / "tallinn_real_obs.json",   "tallinn"),
    (SCANWAI_DIR / "stockholm_real_obs.json", "stockholm"),
]

# damageClass or box-label logic → folder
CATEGORY_MAP = {
    "pothole":         "pothole",
    "crocodile_crack": "pothole",
    "line_crack":      "crack",
}

# Only Stockholm for pothole/crack (plates blurred).
# Tallinn for manhole (only obs where ALL boxes = manhole_cover).
SELECTION_RULES = {
    "pothole": {"sources": ("stockholm",), "all_boxes_label": None},
    "crack":   {"sources": ("stockholm",), "all_boxes_label": None},
    "manhole": {"sources": ("tallinn",),   "all_boxes_label": "manhole_cover"},
}

TARGETS = {"pothole": 15, "crack": 12, "manhole": 10}

_SSL = ssl.create_default_context()
try:
    import certifi; _SSL = ssl.create_default_context(cafile=certifi.where())
except ImportError: pass

from urllib.request import urlopen, Request

def download(url):
    req = Request(url, headers={"User-Agent": "ScanCrowd-Demo/1.0"})
    with urlopen(req, timeout=30, context=_SSL) as r:
        return r.read()

def process(data, target_w=1280):
    from PIL import Image
    img = Image.open(io.BytesIO(data))
    w, h = img.size
    if w > target_w:
        h = int(h * target_w / w); w = target_w
        img = img.resize((w, h), Image.LANCZOS)
    else:
        w, h = img.size
    if img.mode != "RGB": img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue(), w, h

def boxes_to_pixels(raw_boxes, w, h):
    out = []
    for b in raw_boxes:
        x = b["minX"] * w; y = b["minY"] * h
        bw = (b["maxX"] - b["minX"]) * w
        bh = (b["maxY"] - b["minY"]) * h
        out.append({
            "label":      b["label"],
            "confidence": round(b.get("confidence", 0.0), 3),
            "box":        [round(x,1), round(y,1), round(bw,1), round(bh,1)],
        })
    return out

def load_obs():
    obs = []
    for fpath, src in OBS_FILES:
        if not fpath.exists(): continue
        with open(fpath) as f:
            data = json.load(f)
        d = data.get("data", {})
        items = []
        if isinstance(d, dict):
            for v in d.values():
                if isinstance(v, list): items.extend(v)
        elif isinstance(d, list):
            items = d
        for o in items:
            o["_source"] = src
            obs.append(o)
    return obs

def category_for(obs):
    """Return target folder for an observation, or None."""
    boxes = (obs.get("detectionBoxes") or {}).get("boxes", [])
    labels = [b["label"] for b in boxes]
    # Manhole: all boxes must be manhole_cover
    if boxes and all(l == "manhole_cover" for l in labels):
        return "manhole"
    # Standard damage class mapping
    dc = (obs.get("damageClass") or "").lower()
    return CATEGORY_MAP.get(dc)

def main():
    from PIL import Image as PI

    all_obs = load_obs()
    visible = [
        o for o in all_obs
        if not o.get("hidden") and not o.get("imageIsDeleted")
        and o.get("imageUrl")
        and (o.get("detectionBoxes") or {}).get("boxes")
    ]
    print(f"Visible with boxes: {len(visible)}")

    # Clear and recreate folders
    for cat in ["pothole", "crack", "sign", "manhole", "marking", "gravel", "night"]:
        d = CONSOLE_IMAGES / cat
        d.mkdir(parents=True, exist_ok=True)
        for f in d.glob("*"): f.unlink()

    # Group by (category, source)
    by_cat_src = defaultdict(list)
    for o in visible:
        cat = category_for(o)
        if not cat: continue
        src = o["_source"]
        by_cat_src[(cat, src)].append(o)

    for k, v in sorted(by_cat_src.items()):
        print(f"  {k}: {len(v)}")

    mapping = []
    kept = defaultdict(int)
    rejected = 0
    reject_log = []

    for cat, target in TARGETS.items():
        rules = SELECTION_RULES[cat]
        pool = []
        for src in rules["sources"]:
            pool.extend(by_cat_src.get((cat, src), []))

        pool.sort(key=lambda o: (
            -float(o.get("confidence") or 0),
            -len((o.get("detectionBoxes") or {}).get("boxes", [])),
        ))

        count = 0
        for obs in pool:
            if count >= target: break
            obs_id = obs["id"]
            url    = obs["imageUrl"]
            try:
                print(f"  DL {cat}/{count+1}: {obs_id[:8]} ({obs['_source']})")
                raw = download(url)
                time.sleep(0.2)

                check = PI.open(io.BytesIO(raw))
                if check.size[0] < 400 or check.size[1] < 200:
                    reject_log.append(f"{obs_id}: too small {check.size}")
                    rejected += 1
                    continue

                jpeg, w, h = process(raw)
                dets = boxes_to_pixels((obs.get("detectionBoxes") or {}).get("boxes", []), w, h)

                count += 1
                fname = f"{cat}-{count:02d}.jpg"
                (CONSOLE_IMAGES / cat / fname).write_bytes(jpeg)
                (CONSOLE_IMAGES / cat / f"{cat}-{count:02d}.json").write_text(
                    json.dumps({"category": cat, "width": w, "height": h, "detections": dets}, indent=2)
                )
                mapping.append({
                    "filename": fname, "category": cat,
                    "scanwai_obs_id": obs_id, "scanwai_url": url,
                    "damage_class": obs.get("damageClass",""), "source_dataset": obs["_source"],
                    "image_licence": "ScanwAi proprietary – approved by Olli (ScanwAi) 2026-10-09",
                    "boxes_source": "ScanwAi AI model",
                    "notes": f"{obs['_source'].title()} scan; {'plates blurred by ScanwAi' if obs['_source']=='stockholm' else 'privacy-reviewed manually'}",
                })
                kept[cat] += 1
            except Exception as e:
                reject_log.append(f"{obs_id}: {e}")
                rejected += 1

    # Write CSV
    csv_path = PRIVATE_DIR / "image-sources.csv"
    PRIVATE_DIR.mkdir(parents=True, exist_ok=True)
    with open(csv_path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["filename","category","scanwai_obs_id","scanwai_url","damage_class","source_dataset","image_licence","boxes_source","notes"])
        w.writeheader(); w.writerows(mapping)

    print(f"\n=== RESULTS ===")
    print(f"Kept: {dict(kept)}, total {sum(kept.values())}")
    print(f"Rejected: {rejected}")
    for r in reject_log[:10]: print(f"  REJECT: {r}")
    print(f"CSV: {csv_path}")
    # Print kept counts for IMAGE_COUNTS update
    print(f"\nIMAGE_COUNTS = {dict(kept)}")

if __name__ == "__main__":
    main()
