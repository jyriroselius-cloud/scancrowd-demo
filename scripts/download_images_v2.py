#!/usr/bin/env python3
"""
v2: Download Stockholm potholes (plates blurred) + all Stockholm cracks.
Re-download clean set.
"""

import io, json, ssl, sys, time, csv
from pathlib import Path
from urllib.request import urlopen, Request
from collections import defaultdict

SCANWAI_DIR    = Path.home() / "scanwai-raportti-web" / "data" / "private"
CONSOLE_IMAGES = Path.home() / "Claude/Projects/scancrowd-demo/console/public/images"
PRIVATE_DIR    = Path.home() / "Claude/Projects/scancrowd-demo-private"

OBS_FILES = [
    (SCANWAI_DIR / "tallinn_real_obs.json",   "tallinn"),
    (SCANWAI_DIR / "stockholm_real_obs.json", "stockholm"),
]

CATEGORY_MAP = {
    "pothole":         "pothole",
    "crocodile_crack": "pothole",
    "line_crack":      "crack",
}

# Only use Stockholm potholes (plates blurred). All Stockholm cracks are fine.
SELECTION_RULES = {
    "pothole": ("stockholm",),   # only Stockholm
    "crack":   ("stockholm",),   # only Stockholm
}

TARGETS = {"pothole": 15, "crack": 12}

_SSL = ssl.create_default_context()
try:
    import certifi; _SSL = ssl.create_default_context(cafile=certifi.where())
except ImportError: pass


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


def main():
    from PIL import Image as PI

    # Clear existing images
    for cat in ["pothole", "crack", "sign", "manhole", "marking", "gravel", "night"]:
        d = CONSOLE_IMAGES / cat
        d.mkdir(parents=True, exist_ok=True)
        for f in d.glob("*"):
            f.unlink()

    all_obs = load_obs()
    visible = [
        o for o in all_obs
        if not o.get("hidden") and not o.get("imageIsDeleted")
        and o.get("imageUrl")
        and (o.get("detectionBoxes") or {}).get("boxes")
    ]
    print(f"Visible with boxes: {len(visible)}")

    # Group by (category, source)
    by_cat_src = defaultdict(list)
    for o in visible:
        dc = (o.get("damageClass") or "").lower()
        cat = CATEGORY_MAP.get(dc)
        if not cat: continue
        src = o["_source"]
        by_cat_src[(cat, src)].append(o)

    for k, v in by_cat_src.items():
        print(f"  {k}: {len(v)}")

    mapping = []
    kept = defaultdict(int)
    rejected = 0
    reject_log = []

    for cat, target in TARGETS.items():
        allowed_srcs = SELECTION_RULES.get(cat, ("stockholm", "tallinn"))
        pool = []
        for src in allowed_srcs:
            pool.extend(by_cat_src.get((cat, src), []))

        # Sort: most confident / most boxes first
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
                time.sleep(0.25)

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
                })
                kept[cat] += 1
            except Exception as e:
                reject_log.append(f"{obs_id}: {e}")
                rejected += 1

    csv_path = PRIVATE_DIR / "image-sources.csv"
    with open(csv_path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["filename","category","scanwai_obs_id","scanwai_url","damage_class","source_dataset"])
        w.writeheader(); w.writerows(mapping)

    print(f"\n=== RESULTS ===")
    print(f"Kept: {dict(kept)}, total {sum(kept.values())}")
    print(f"Rejected: {rejected}")
    for r in reject_log[:5]: print(f"  REJECT: {r}")
    print(f"CSV: {csv_path}")

if __name__ == "__main__":
    main()
