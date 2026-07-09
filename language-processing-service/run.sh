#!/bin/bash



# Run FastAPI
exec uvicorn src.main:app --host 0.0.0.0 --port 8089