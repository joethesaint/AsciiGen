# ASCII Creative Engine - Implementation Log

## Status: 🟢 Hybrid Architecture Transition
**Current Phase:** Phase 2 - Refining Python Processing Logic

---

## 🏗 Roadmap

### Phase 1: The Bridge 🔵 (Complete)
- [x] Initialize Flask project structure.
- [x] Set up `Flask-SocketIO` for real-time duplex communication.
- [x] Port Python `smart_convert` logic to serve JSON data packets.

### Phase 2: Python Processing (The Brain) 🟢 (In Progress)
- [ ] Refactor `imp_ascii.py` into a server-side processor.
- [ ] Implement image-to-grid mapping that emits arrays of brightness/char data.
- [ ] Optimize processing loop for low-latency delivery.

### Phase 3: p5.js Rendering (The Beauty) ⚪
- [ ] Connect `sketch.js` to the WebSocket stream.
- [ ] Map received brightness grids to the `Particle` class.
- [ ] Implement "Mode A/B" toggle (Classic Grid vs. Exploding Particles).

### Phase 4: Interactivity & Polish ⚪
- [ ] Add mouse-repel forces in the p5.js loop.
- [ ] Implement color data transmission from Python to JS.
- [ ] Add motion blur and Perlin Noise drift effects.

---

## 📝 Design Decisions

### Why Flask + WebSockets?
While p5.js can handle simple image processing, Python's **Pillow** and potential **NumPy** integrations allow for much more complex "heavy duty" manipulations (like autocontrast, edge detection, or massive batch processing) without bogging down the browser's UI thread.

### Data Protocol
We will send **2D Brightness/Character Arrays** via Socket.IO. This minimizes the compute load on the browser, allowing the frontend to focus purely on high-frequency visual physics.

---

## 🛠 Tech Stack
- **Backend:** Python 3.x, Flask, Flask-SocketIO, Pillow.
- **Frontend:** HTML5, Vanilla CSS, p5.js, Socket.IO Client.
- **Communication:** WebSockets (Real-time).
