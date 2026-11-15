# Inspect - structure and metadata only
[← Back to Parent README](../README.md)

---
```
POST /api/v1/archives/inspect
```
Returns the **same tree shape** as [explode](explode.md), but **entry data is
never read**. Every `FILE` node carries its size, MIME type and CRC, but no
`content` field.
---

## Request
```bash
curl -s -F "file=@example-file.zip" http://localhost:8080/api/v1/archives/inspect
```
| Parameter | Default | Meaning |
|-----------|---------|---------|
| `recurse` | `false` | Expand nested `.zip` entries |
Note there is **no `variant` parameter**, nothing is Base64-encoded, so the
manifest's `variant` comes back `null`.
---

## Response
```json
{
  "manifest": { "entryCount": 1, "maxDepth": 2, "variant": null },
  "root": {
    "type": "DIRECTORY", "name": "", "path": "",
    "children": [
      { "type": "FILE", "name": "readme.md", "path": "readme.md",
        "sizeBytes": 8, "mimeType": "text/markdown", "crc32": "a1b2c3d4" }
    ]
  }
}
```
---

## Choosing between inspect and explode
| Need                                   | Endpoint                   |
|----------------------------------------|----------------------------|
| "What's inside?", names, sizes, types  | [inspect](inspect.md)      |
| "Give me the files", per-file payloads | [explode](explode.md)      |
| "Give me the whole archive as text"    | [encode](encode-decode.md) |