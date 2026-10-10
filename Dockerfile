FROM python:3.10-slim

WORKDIR /app

# Install build tools for C++
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install python requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt pybind11

# Copy engine source and build it
COPY engine /app/engine
WORKDIR /app/engine
RUN mkdir build && cd build && cmake -Dpybind11_DIR=$(python -c "import pybind11; print(pybind11.get_cmake_dir())") .. && make
# Find the built .so file and copy it to backend
RUN cp build/*.so /app/

# Copy backend code
COPY backend /app/backend

WORKDIR /app
ENV PYTHONPATH=/app
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
