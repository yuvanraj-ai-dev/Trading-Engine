# High-Performance Trading Engine

A high-performance trading matching engine built with a C++ core and a FastAPI Python wrapper, featuring a React frontend for real-time visualization.

## Architecture

- **C++ Matching Engine**: Low-latency core order book and matching algorithm.
- **pybind11**: Bridge connecting the C++ engine to Python.
- **FastAPI**: I/O-heavy API layer handling REST and WebSockets.
- **React**: Real-time frontend displaying the order book and allowing order entry.
- **Docker Compose**: Containerized environment.

## Project Structure

- `/engine`: C++ core engine and pybind11 bindings.
- `/backend`: FastAPI wrapper.
- `/frontend`: React/Vite frontend.
- `docker-compose.yml`: Local infrastructure setup.
- `test_script.py`: Load testing script.

## Local Setup

### 1. Build and Run via Docker Compose
This is the easiest way to run the whole stack locally (Backend + Engine + Redis + Postgres).

```bash
docker-compose up --build
```
The FastAPI backend will be available at `http://localhost:8000`.

### 2. Run the Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:5173`.

## Deployment

Please refer to [DEPLOYMENT.md](DEPLOYMENT.md) for a comprehensive guide on deploying to GitHub, Render, Vercel, and NeonDB.

## Testing

Run `test_script.py` to blast the backend with random buy and sell orders.

```bash
python test_script.py
```
Watch your React frontend update the bids and asks in real-time!
