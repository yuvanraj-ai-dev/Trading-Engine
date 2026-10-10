# High-Performance Trading Engine

🚀 **Live Demo:** [https://trading-engine-7vev.vercel.app/](https://trading-engine-7vev.vercel.app/)
🔗 **Backend API:** [https://trading-engine-api-3i7j.onrender.com](https://trading-engine-api-3i7j.onrender.com)

---

## What This Is

A production-grade, real-time **limit order matching engine** — the core system that powers every stock exchange and crypto trading platform. Orders from buyers and sellers are matched at the best available price using price-time priority (FIFO), with partial fills, cancellations, and live order book depth all handled correctly.

The system is split into three fully independent layers, each chosen for what it does best.

---

## How It Works

### C++ Matching Engine
The brain of the system. The order book is implemented using two sorted `std::map` structures — one for bids (descending by price) and one for asks (ascending by price). Each price level holds a `std::list<Order>` to preserve time priority within that level. A flat `std::unordered_map` provides O(1) order lookup for instant cancellations.

When a new order arrives, the engine walks the opposite side of the book and greedily matches at the best available price until either the incoming order is fully filled or no more crossing prices exist. Any unfilled remainder rests on the book. Partial fills are natively supported — a buy of 10 units against a resting sell of 7 leaves a residual buy of 3 on the book.

### FastAPI Bridge
The C++ engine is compiled directly into a Python module using **pybind11**, meaning FastAPI calls the matching engine as a native Python object — zero serialization overhead, no sockets, no inter-process communication. The API exposes REST endpoints for placing and cancelling orders, and a WebSocket endpoint that streams live order book snapshots to all connected clients every second.

### React Frontend
A dark-mode exchange UI modelled on professional platforms like Binance Pro. It maintains a persistent WebSocket connection to the backend, rendering the live bid/ask depth table with visual volume bars. Clicking any price level in the order book auto-fills the order entry form. Placed orders appear in an Open Orders panel with real-time partial fill tracking and one-click cancellation. A real-time price line chart (powered by TradingView's **lightweight-charts**) draws the mid-price as orders execute.

An **Admin panel** (accessed via a secret key) allows wiping the entire order book — useful for resetting state between test runs.

---

## Deployment

| Layer | Platform | Notes |
|---|---|---|
| Frontend | **Vercel** | Auto-deploys on every push to `main` |
| Backend + C++ Engine | **Render** | Docker container — C++ compiles at build time via CMake + pybind11 |
| Database (future) | **NeonDB** (Postgres) | Provisioned, ready to persist trade history |
| Pub-Sub (future) | Redis | In docker-compose for local use |

The C++ engine is compiled **inside** the Docker image during the Render build step, so the deployed backend is a single self-contained service with no runtime dependencies beyond the container.

---

## Testing

A load test script (`test_script.py`) fires randomised buy and sell orders at the live API endpoint. Orders are generated with prices randomly distributed around a mid-point to produce a realistic mix of immediate matches and resting orders.

**To run against the live deployment:**
```bash
# Edit API_URL in test_script.py to the Render URL, then:
python test_script.py
```

The script reports total time, orders/second throughput, and success rate. While running, open the live Vercel URL — you will see the order book depth and price chart update in real time as the engine processes the flood of orders.

### Testing Constraints

| Constraint | Detail |
|---|---|
| **Render cold starts** | Render's free tier spins down after inactivity. The first request after a cold start can take 30–60 seconds. Subsequent requests are fast. |
| **Concurrency** | The current in-memory order book is single-threaded (no mutex). Concurrent writes from multiple simultaneous API requests could cause a race condition. Safe for sequential testing; a production version would add a lock or use a lock-free queue. |
| **State persistence** | The order book lives in memory. A Render restart clears all orders. Trade history persistence via NeonDB is wired up but not yet committed to the order flow. |
| **WebSocket fan-out** | The WS pushes to all connected clients on a 1-second timer. Under heavy load, slow clients will see delayed snapshots but the matching engine itself is unaffected. |

### Estimated Traffic Capacity

| Metric | Estimate |
|---|---|
| **C++ engine throughput** | ~200K–500K orders/sec in-process (benchmark target) |
| **API throughput (Render free tier)** | ~50–200 requests/sec (bottleneck is the HTTP layer + container resources, not the engine) |
| **WebSocket clients** | ~100 simultaneous connections comfortably on a single instance |

The C++ core is not the bottleneck — the network and container tier is. Horizontally scaling the API layer (multiple Render instances behind a load balancer) would unlock the full engine speed.

---

## Novelty

Most portfolio trading projects are either a fake UI hitting a mock API, or a slow Python order book. This project is different in three ways:

1. **The matching logic is real.** Price-time priority, partial fills, O(1) cancellation — the same algorithmic design used in production exchanges like NASDAQ and Binance.

2. **The architecture boundary is deliberate.** Separating a zero-overhead C++ core from an I/O-heavy Python API layer is a real systems design decision, not just a portfolio trick. The pybind11 bridge means there is no serialization cost — the Python layer calls into compiled native code directly.

3. **It is live and testable.** The system is deployed end-to-end, observable in real time via WebSocket, and stress-testable with a single script — giving it a degree of production credibility that most showcase projects lack.
