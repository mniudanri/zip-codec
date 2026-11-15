# Encode & Decode - the simple JSON pair
[← Back to Parent README](../README.md)

---

## List of APIs
### POST /api/v1/archives/encode
Upload ZIP file, return Base64 and sha256

### POST /api/v1/archives/decode
Send JSON with base64 and sha256, return decoded ZIP stream file

---

## Definition
This pair is **byte-exact**: decoding what you encoded reproduces the original
archive bit for bit, verified by SHA-256.
Use it when the archive is **under ~24 MB**. Past that the Base64 no longer fits
the inline ceiling and you want
[the streaming pair](encode-decode-stream.md) instead.
---

## Encode API
```bash
curl -s -F "file=@example-file.zip" http://localhost:8080/api/v1/archives/encode
```
> **The `@` is mandatory** when using `-F` to read and upload the contents of a local file, without this `@` in `-F` will treat as text string, and the service
> answers `415 Unreadable archive`.

### Response
```json
{
  "manifest": {
    "filename": "example-file.zip",
    "sizeBytes": 1024,
    "sha256": "9f86d0…",
    "entryCount": 3,
    "maxDepth": 2,
    "variant": "STANDARD",
    "base64Length": 1368,
    "entryNameCharset": "IBM437"
  },
  "base64": "UEsDBBQ…"
}
```
Keep the `sha256`, passing it back on decode is what turns a silent corruption
into a clean `400`.
### Optional parameters
| Parameter | Values | Meaning |
|-----------|--------|---------|
| `variant` | `STANDARD` (default), `MIME`, `URL_SAFE` | Base64 alphabet |
`MIME` inserts line breaks every 76 characters; `URL_SAFE` swaps `+/` for `-_`.

---
## Decode API
```bash
curl -s -X POST http://localhost:8080/api/v1/archives/decode \
     -H 'Content-Type: application/json' \
     -d '{"base64":"UEsDBBQ…","expectedSha256":"9f86d0…"}' \
     -o restored.zip
```
### Request body
| Field | Required | Meaning                                               |
|-------|----------|-------------------------------------------------------|
| `base64` | yes | The encoded archive                                   |
| `expectedSha256` | no | Verified against the decoded bytes; mismatch -> `400` |
| `variant` | no | Must match the alphabet used to encode                |
