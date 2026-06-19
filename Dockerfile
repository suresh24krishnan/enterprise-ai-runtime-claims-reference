# ── Stage 1: Build React + Vite frontend ───────────────────────────────────
FROM node:20-slim AS frontend-build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ── Stage 2: Python + FastAPI + LangGraph runtime ──────────────────────────
FROM python:3.11-slim

# HF Spaces requires a non-root user with UID 1000
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-build /app/dist ./dist

RUN chown -R appuser:appuser /app
USER appuser

# HF Spaces exposes a single port; everything runs on 7860
EXPOSE 7860

# Run uvicorn from the backend directory so relative imports resolve correctly
WORKDIR /app/backend
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
