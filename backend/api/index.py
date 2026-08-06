"""
Vercel serverless entry point.
Mangum wraps the FastAPI ASGI app to handle AWS Lambda / Vercel function invocations.
"""
from mangum import Mangum
from app.main import app

handler = Mangum(app, lifespan="off")
