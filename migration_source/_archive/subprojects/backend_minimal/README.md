Celora minimal backend

This folder contains a minimal FastAPI backend used for compact deployment.

How to run locally:

pip install -r requirements.txt
uvicorn app:app --reload --port 8000

Endpoints:
- GET /health
- POST /wallets
- POST /wallets/{owner}/cards
- GET /wallets/{owner}/cards
