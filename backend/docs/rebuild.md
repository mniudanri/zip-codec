# Rebuild - JSON tree back to an archive
[← Back to Parent README](../README.md)

---
```
POST /api/v1/archives/rebuild
```
Takes a tree in the shape [`/explode`](explode.md) produces and writes a **new**
`.zip` from it. This is the inverse of *explode*, not of *encode*.
---

## Request
```bash
curl -s -X POST http://localhost:8080/api/v1/archives/rebuild -H 'Content-Type: application/json' \
     -d @tree.json --fail-with-body -o rebuilt.zip
```
Body:
```json
{
  "root": {
    "type": "DIRECTORY", "name": "", "path": "",
    "children": [
      { "type": "FILE", "name": "readme.txt", "path": "readme.txt",
        "content": "aGVsbG8=" }
    ]
  },
  "variant": "STANDARD"
}
```
`variant` must match the alphabet the payloads were encoded with.

---
## Response
output of binary file, in request CURL, file named `rebuilt.zip`

---
## Which trees can be rebuilt
| Tree source | Rebuildable | Why |
|-------------|-------------|-----|
| `/explode?recurse=false` | yes | every `FILE` node has `content` |
| `/explode?recurse=true` | **no** | nested archives were expanded; re-zipping would change the archive's shape |
| `/inspect` | **no** | nodes carry no `content` at all |
A tree missing payloads is rejected with `400` and a message naming the first
offending node (`node 'docs/readme.txt' has no Base64 content`).