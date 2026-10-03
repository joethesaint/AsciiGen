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
