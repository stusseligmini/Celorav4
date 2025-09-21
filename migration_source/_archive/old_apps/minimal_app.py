from fastapi import FastAPI
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create minimal FastAPI app
app = FastAPI(title="Celora API Minimal", version="1.0.0")

@app.get("/")
async def root():
    return {
        "message": "Celora API Minimal is running!",
        "status": "ok",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "port": os.getenv("PORT", "8000")
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "celora-minimal",
        "database": "not connected - minimal version",
        "environment": os.getenv("ENVIRONMENT", "development")
    }

@app.get("/test")
async def test():
    return {
        "test": "ok",
        "message": "All systems operational",
        "env_vars": {
            "PORT": os.getenv("PORT"),
            "ENVIRONMENT": os.getenv("ENVIRONMENT"),
            "PYTHON_VERSION": os.getenv("PYTHON_VERSION"),
            "JWT_SECRET": "Set" if os.getenv("JWT_SECRET") else "Not Set"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
