# Backend: do we need one, and which?

Written 2026-10-04.

## Where things stand

- The live app (`web_interface/`) is **fully client-side** and calls no server. GitHub
  Pages can't run one anyway.
- `server/app.py` is **already FastAPI** (routers in `server/blueprints/`). The old
  `requirements.txt` still lists Flask, flask-socketio and eventlet, which is stale. Fix it
  before the server is used again.
- Its old endpoints (`/analyze` kernels, `/depth`, `/morph/{shape}`, `/text-to-cloud`,
  `/palette`) are disconnected from the new front end.

## Recommendation

**No backend for anything the browser can do.** ASCII, particles, dither, GIF/WebM export,
webcam and Polyfork hotlinking all run on the visitor's device, which is free, private and
scales for nothing.

Add a backend only for work a browser can't do:

| Job | Why server-side | Shape |
|---|---|---|
| Image → 3D (image-to-3dlab) | Needs an NVIDIA/Apple GPU, takes minutes | **Job queue** |
| Long, high-res video/GIF renders | Minutes of encoding | Job queue |
| Saved recipes / shared links / gallery | Needs storage | Plain API |

### Flask, FastAPI, or a queue?

- **Flask could carry it**, but FastAPI is already in the code, handles async I/O and
  long-polling better, and generates an OpenAPI spec for free. Keep **FastAPI**.
- Anything that takes longer than a few seconds must **not** run inside the request. Use a
  **job queue**: the API accepts the job and returns a `job_id`; a worker (on the GPU
  machine) runs it; the browser polls `/jobs/{id}` (or listens over SSE) for progress and the
  result URL.
- The queue system you built for the risk-management project is a good candidate if it
  already does enqueue / worker / status / retry. Otherwise the standard picks are
  **Redis + RQ** (simplest) or **arq** (async, fits FastAPI). Celery is more than this needs.
- Results (GLBs, videos) go to object storage (or the worker's disk behind a static route),
  not into the database.

### Hosting sketch

Front end stays on GitHub Pages. API + Redis on a small host (Fly.io/Render/a VPS). The GPU
worker runs on whichever machine has the GPU and pulls jobs from Redis, so it doesn't need
to be publicly reachable.

## Using the Python we already have

Parked locally (not committed): `git stash list` → *"parked: backend cleanup (b64 weight
map, 200px analyze, /status route, tests, pointism default)"*. `git stash pop` restores it.
It makes `/analyze` return the edge map as base64 at 200×200, moves the health check to
`/status`, drops `/sdf` (covered by `/morph/{shape}`), and updates the tests. It also
switches the CLI default character set to `pointism`, which is a style choice to decide on.

What's still worth keeping, and how it could earn its place:

| Piece | What it does today | Useful for |
|---|---|---|
| `smart_ascii/` CLI (`engine.py`, `generate_variants.py`, `config.yaml`) | Image → **text** ASCII files; GitHub-profile art; batches of variants | Plain-text output the browser app doesn't make: README/profile banners, terminal art, `.txt` exports. Could back a "Download as text" button via an endpoint, or just stay a CLI |
| `/text-to-cloud` | Text → point cloud | A "type a word" source for the particle engine (the browser could also do this with a 2D canvas) |
| `/palette` | Dominant colours of an image | Auto-picking ink/paper colours for the dither modes (`ideas/02`) |
| `/analyze` kernels (edges, sharpen, emboss, gaussian) | Pre-filtered weight maps | Superseded: the GPU does this per frame now. Keep only if a server pipeline needs it |
| `/depth`, `/depth_mock_sim` | Depth estimation stub | The natural place for a real depth model (image → relief) if one is added: server/GPU work |
| FastAPI app shell + tests | Routing, CORS, static serving | The base for the job-queue API above (image → 3D, long renders) |

Priority if the backend comes back: 1) fix `requirements.txt` to FastAPI/uvicorn,
2) pop the stash and run `pytest`, 3) add the job queue, with image → 3D as the first job.
Until then the Python stays a **local tool**, not part of the live site.
