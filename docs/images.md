# Console image library

Real road-defect images are stored in `console/public/images/` and served
as static assets. No code changes are needed to add more images — just
drop files in the right folder.

## Folder layout

```
console/public/images/
  pothole/    pothole-01.jpg  pothole-01.json  …
  crack/      crack-01.jpg    crack-01.json    …
  sign/       (empty — no ScanwAi source data)
  manhole/    (empty)
  marking/    (empty)
  gravel/     (empty)
  night/      (empty)
```

Each image has a paired sidecar JSON with the same base name.

## Naming convention

`<folder>-<NN>.jpg` — two-digit zero-padded sequential number starting at 01.
Example: `pothole-07.jpg`, `crack-13.jpg`.

The filenames are intentionally neutral. Traceability back to source
observations is kept in the **private** mapping file
`~/Claude/Projects/scancrowd-demo-private/image-sources.csv`,
which is never committed or deployed.

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
| `detections[].label` | Defect class from ScanwAi model |
| `detections[].confidence` | Model confidence 0–1 |
| `detections[].box` | `[x, y, w, h]` in pixels at the stored image size, top-left origin |

## How the console picks an image

`IssueReview.tsx` maps each issue's `category` to a folder:

| Issue category | Folder |
|---|---|
| Pothole | `pothole` |
| Other | `crack` |
| Traffic sign | `sign` (falls back to `pothole`) |
| Manhole | `manhole` (falls back to `pothole`) |
| Road marking | `marking` (falls back to `pothole`) |
| Street light | `pothole` |

The index within the folder is chosen by hashing the issue ID, so the
same issue always shows the same image across reloads (deterministic).

Empty folders fall back to `pothole` first, then `crack`.

## How detection boxes are drawn

The console fetches the sidecar JSON and renders an SVG overlay
(mint accent, `var(--mint)`) scaled from the stored image dimensions
to the displayed image size using a `ResizeObserver`. A credit line
"Detections by ScanwAi" appears below the image.

## Adding more images

1. Download the image, strip EXIF/GPS, resize to 1280 px wide JPEG.
2. **Privacy check**: reject any image where a face or licence plate is
   visible and not blurred, or where a place name, town sign, or
   recognisable landmark is identifiable.
3. Name it `<folder>-<NN>.jpg` (next sequential number).
4. Create a sidecar JSON with the detection boxes in pixel space.
5. Update `IMAGE_COUNTS` in `console/src/screens/IssueReview.tsx`.
6. Record the source in `~/Claude/Projects/scancrowd-demo-private/image-sources.csv`.

## Current image counts

| Folder | Count |
|---|---|
| pothole | 6 |
| crack | 12 |
| sign | 0 |
| manhole | 0 |
| marking | 0 |
| gravel | 0 |
| night | 0 |
