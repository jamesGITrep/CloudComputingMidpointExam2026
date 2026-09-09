import os
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

app = FastAPI(title="Audit Log Service")

DB_USER = os.getenv("DB_USER", "audit_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "audit_pass")
DB_NAME = os.getenv("DB_NAME", "audit_db")
DB_HOST = os.getenv("DB_HOST", "audit-db")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"

@app.get("/")
def read_root():
    return {"message": "Audit Log Service is running"}

@app.get("/health")
def health_check():
    try:
        engine = create_engine(DATABASE_URL)
        connection = engine.connect()
        connection.close()
        return {"status": "healthy", "database": "connected"}
    except OperationalError as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}
