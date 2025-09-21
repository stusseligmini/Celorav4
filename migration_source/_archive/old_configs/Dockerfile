# Use Python 3.11 slim image
FROM python:3.11-slim

# Install required system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy and install requirements first (for better caching)
COPY requirements_simple.txt .
RUN pip install --no-cache-dir -r requirements_simple.txt

# Copy the application code
COPY . .

# Create a non-root user to run the application
RUN useradd --create-home --shell /bin/bash celora
RUN chown -R celora:celora /app

# Switch to the non-root user
USER celora

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Expose the application port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "simple_app:app", "--host", "0.0.0.0", "--port", "8000"]
