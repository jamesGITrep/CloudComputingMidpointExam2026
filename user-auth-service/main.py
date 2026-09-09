import os
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

app = FastAPI(title="User Auth Service")

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_NAME = os.getenv("DB_NAME", "user_auth_db")
DB_HOST = os.getenv("DB_HOST", "user-db")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"

@app.get("/")
def read_root():
    return {"message": "User Auth Service is running"}

@app.get("/health")
def health_check():
    try:
        engine = create_engine(DATABASE_URL)
        connection = engine.connect()
        connection.close()
        return {"status": "healthy", "database": "connected"}
    except OperationalError:
        return {"status": "unhealthy", "database": "disconnected"}
