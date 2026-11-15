# Explode - archive to recursive JSON tree
[← Back to Parent README](../README.md)

---
```
POST /api/v1/archives/explode
```
Returns a **recursive JSON tree** mirroring the archive's directory structure,
with **one Base64 payload per file**. Use it when you need per-file access,
routing individual documents to OCR, indexing, or selective extraction, rather
than one opaque blob.<br><br>
If you only need the structure and sizes, use [inspect](inspect.md), which never
reads entry data at all.
---
## Request
```bash
curl -s -F "file=@example-file.zip" "http://localhost:8080/api/v1/archives/explode?recurse=true"
```
| Parameter | Default | Meaning |
|-----------|---------|---------|
| `recurse` | `false` | Expand nested `.zip` entries into directories |
| `variant` | `STANDARD` | Base64 alphabet for the per-file `content` |
---

## Response
```json
{
  "manifest": { "entryCount": 3, "maxDepth": 3, "variant": "STANDARD" },
  "root": {
    "type": "DIRECTORY", "name": "", "path": "", "nestedArchive": false,
    "children": [
      {
        "type": "DIRECTORY", "name": "docs", "path": "docs", "nestedArchive": false,
        "children": [
          { "type": "FILE", "name": "readme.txt", "path": "docs/readme.txt",
            "sizeBytes": 5, "mimeType": "text/plain", "crc32": "3610a686",
            "content": "aGVsbG8=" }
        ]
      }
    ]
  }
}
```

### Response fields
| Field | On | Meaning |
|-------|----|---------|
| `type` | both | `DIRECTORY` or `FILE` |
| `name` | both | Last path segment |
| `path` | both | Full normalized path from the archive root |
| `nestedArchive` | directory | `true` when this directory was itself a `.zip` |
| `children` | directory | Nested nodes |
| `sizeBytes` | file | Uncompressed size |
| `mimeType` | file | Sniffed from **magic bytes**, never the extension |
| `crc32` | file | As recorded in the archive |
| `content` | file | Base64 payload (absent in inspect mode) |
> MIME types come from Apache Tika sniffing the actual bytes, because the file
> extension inside a ZIP is attacker-controlled.
---

## Nested archives
With `recurse=true` a nested `.zip` becomes a directory flagged
`"nestedArchive": true`, and its contents appear as children:
```
example-file.zip/            <- nestedArchive: true
└── inner.txt
```
With `recurse=false` the same entry stays a single `FILE` node whose `content`
is the nested archive's own Base64.