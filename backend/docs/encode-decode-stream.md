# Encode & Decode - the streaming pair
[← Back to Parent README](../README.md)

---

## List of APIs
### POST /api/v1/archives/encode/stream
Upload ZIP, return raw `text/plain` Base64

### POST /api/v1/archives/decode/stream
Send raw `text/plain` Base64, return binary file ZIP

---
## Definition
Identical bytes to [simple encode & decode pair](encode-decode.md), but in **constant memory**
and with **no size ceiling**. No JSON wrapping on either leg, which removes the
single biggest source of corrupted output.
**Use this pair whenever the archive is above ~24 MB, or whenever you are
driving the API from a shell.**
---

## Encode API (stream)
```bash
curl -s -o example-file.b64 -D - -F "file=@example-file.zip" http://localhost:8080/api/v1/archives/encode/stream
```
```
HTTP/1.1 200
Content-Type: text/plain
Content-Length: 7912
X-Archive-Sha256: b0c7c9d8…
X-Archive-Size-Bytes: 5932
X-Archive-Entry-Count: 1
X-Archive-Max-Depth: 2
X-Archive-Variant: STANDARD
```
The body is the raw Base64, so it redirects straight to a file. The manifest
travels in `X-Archive-*` headers instead of a JSON envelope.
Two properties worth knowing:
* **`Content-Length` is computed before streaming begins**, so clients still get
  a determinate progress bar rather than a chunked unknown-length transfer.
* **The archive is fully validated before the first byte is written**,
  so a policy violation is still a clean `422`, not a
  half-written body.
---

## Decode API (stream)
```bash
# after accept example-file.b64 from encode API,
# call api decode stream, pass binary file "@example-file.b64" & sha256
curl -s -o restored.zip --fail-with-body -X POST -H 'Content-Type: text/plain' \
     --data-binary @example-file.b64 \
     "http://localhost:8080/api/v1/archives/decode/stream?expectedSha256=b0c7c9d8…"

# check identical of files
cmp example-file.zip restored.zip && echo "byte-identical"
```
---

### Query parameters
| Parameter | Required | Meaning                                               |
|-----------|----------|-------------------------------------------------------|
| `expectedSha256` | no | Verified against the decoded bytes; mismatch -> `400` |
| `variant` | no | `STANDARD` (default), `MIME`, `URL_SAFE`              |