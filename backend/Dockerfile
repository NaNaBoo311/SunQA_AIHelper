# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies (required for some document parsing libraries like python-magic)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend source code
COPY . .

# Expose port (Railway injects PORT env variable)
EXPOSE 8000

# Run FastAPI using uvicorn, allowing dynamic PORT assignment from Railway
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
