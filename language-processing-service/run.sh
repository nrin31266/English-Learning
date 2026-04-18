#!/bin/bash

# Activate virtual environment
source "$(dirname "$0")/lps-env/bin/activate"

# Run FastAPI app on port 8089
exec uvicorn src.main:app --host 0.0.0.0 --port 8089
