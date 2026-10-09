# Console image library

Real road-defect images are stored in `console/public/images/` and served
as static assets. No code changes are needed to add more images — just
drop files in the right folder and rebuild (IMAGE_COUNTS is computed at
build time from the folder contents).

## Licence and approval

All images are from ScanwAi's scanning infrastructure, accessed via
EcoGreen360's subscription.

**Licence approval**: Use in this closed demo is approved in writing by
Olli (ScanwAi) on 2026-10-09. Scope: closed demo use only — not for
open publication or redistribution.

Detection boxes are ScanwAi's AI model output (`ai_detected: true`).
Credit line "Detections by ScanwAi" is accurate for all images.

Private traceability: `~/Claude/Projects/scancrowd-demo-private/image-sources.csv`
(never committed, never deployed).

## Folder layout

```
console/public/images/
  pothole/    pothole-01.jpg  pothole-01.json  … (15 images, Stockholm)
  crack/      crack-01.jpg    crack-01.json    … (12 images, Stockholm)
  sign/       (empty — no ScanwAi source data for this class)
  manhole/    (empty — Tallinn images rejected: plates/faces/landmarks visible)
  marking/    (empty — no ScanwAi source data)
  gravel/     (empty — no ScanwAi source data)
  night/      (empty — no ScanwAi source data)
```

## ScanwAi class coverage

| Console category | ScanwAi damageClass | Images available |
|---|---|---|
| Pothole | `pothole`, `crocodile_crack` | ✅ 15 (Stockholm) |
| Other (crack) | `line_crack` | ✅ 12 (Stockholm) |
| Manhole | `manhole_cover` boxes | ❌ 10 downloaded, all rejected (privacy) |
| Traffic sign | — | ❌ no ScanwAi class |
| Road marking | — | ❌ no ScanwAi class |
| Gravel | — | ❌ no ScanwAi class |
| Night | — | ❌ no ScanwAi class |

Categories without images show a camera placeholder ("No photo for X").

## Naming convention

`<folder>-<NN>.jpg` — two-digit zero-padded sequential number starting at 01.
Filenames are intentionally neutral and never identify location.

## Sidecar JSON format

```json
{
  "category": "pothole",
  "width": 1280,
  "height": 682,
  "detections": [
    {
      "label": "pothole",
      "confidence": 0.923,
      "box": [412.0, 310.5, 280.4, 195.2]
    }
  ]
}
```

| Field | Description |
|---|---|
| `category` | Matches the parent folder name |
| `width` / `height` | Pixel dimensions of the stored image |
| `detections[].label` | Defect class from ScanwAi AI model |
| `detections[].confidence` | Model confidence 0–1 |
| `detections[].box` | `[x, y, w, h]` in pixels at stored image size, top-left origin |

## IMAGE_COUNTS (build-time, automatic)

`IssueReview.tsx` imports `IMAGE_COUNTS` from the virtual module
`virtual:image-counts`. The Vite plugin in `console/vite.config.ts`
reads `console/public/images/` at build time and produces the count
for each category. **Adding images does not require any code change —
just rebuild.**

## Privacy requirements for new images

1. EXIF and GPS stripped
2. Neutral filename (no location)
3. No face visible and not blurred
4. No licence plate visible and not blurred
5. No place name, town sign, or recognisable landmark visible
6. Images must come from a source approved by Olli (ScanwAi)

## Adding more images

1. Download image, strip EXIF, resize to 1280 px wide JPEG.
2. Pass all 6 privacy checks above.
3. Name it `<folder>-<NN>.jpg` (next sequential number).
4. Create sidecar JSON with detection boxes in pixel space.
5. Record the source in `~/Claude/Projects/scancrowd-demo-private/image-sources.csv`.
6. Rebuild the console (`npm -w console run build`).
