# zip-codec-ui
Frontend console for the ZIP Codec Service. React 19 + Vite + TypeScript + Mantine.
> Dependencies were **never installed** in this workspace, the files are hand-authored.
> Run step 2 before anything else.

## Steps
```bash
# set variables
export VITE_PROXY_TARGET=<BACKEND_HOST> # default http://localhost:8080
export VITE_HEALTH_URL=<CHECK_URL> # default /actuator/health
export VITE_REQUEST_TIMEOUT_MS=<BACKEND_API_TIMEOUT>
export VITE_MAX_PREVIEW_CHARS=<MAX_CHARACTER_BASE64_PREVIEW>
export VITE_MAX_UPLOAD_BYTES=<MAX_UPLOAD_BYTE_SIZE>

# set variable also could use .env.example
# example command: cp .env.example .env

# install the node dependencies
npm install

# start the server
npm run dev
```

Open <http://localhost:5173>.
The header shows a **backend** badge, green means the proxy reached
`http://localhost:8080/actuator/health`.

---

## Other commands
| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :5173, proxies `/api` and `/actuator` to :8080 |
| `npm run build` | Typecheck, then production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint, including the layering rules |
| `npm run verify` | format check -> lint -> typecheck -> test -> build |
---

## Prerequisites
* node v22+
* npm
* backend server [zip-codec-server](https://github.com/mniudanri/zip-codec/blob/main/backend/README.md)