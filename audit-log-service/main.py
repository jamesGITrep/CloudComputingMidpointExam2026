import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from typing import Optional

app = FastAPI(title="Audit Log Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_USER = os.getenv("DB_USER", "audit_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "audit_pass")
DB_NAME = os.getenv("DB_NAME", "audit_db")
DB_HOST = os.getenv("DB_HOST", "audit-db")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
engine = None

def get_engine():
    global engine
    if engine is None:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    return engine

def init_db():
    try:
        eng = get_engine()
        with eng.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    action VARCHAR(255) NOT NULL,
                    user_email VARCHAR(100) NOT NULL,
                    details TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.commit()

            check = conn.execute(text("SELECT COUNT(*) FROM audit_logs")).scalar()
            if check == 0:
                conn.execute(text("""
                    INSERT INTO audit_logs (action, user_email, details)
                    VALUES 
                    ('SYSTEM_INITIALIZED', 'system@support.internal', 'Support Ticket System microservices cluster started.'),
                    ('ADMIN_SEEDED', 'system@support.internal', 'Default admin account provisioned (admin@support.com).'),
                    ('SECURITY_CHECK', 'system@support.internal', 'Automated health probe verified all databases.')
                """))
                conn.commit()
    except Exception as e:
        print(f"Error initializing audit DB: {e}")

@app.on_event("startup")
def on_startup():
    init_db()

class AuditLogCreate(BaseModel):
    action: str
    user_email: str
    details: Optional[str] = ""

@app.get("/")
def read_root():
    return {"message": "Audit Log Service is running"}

@app.get("/health")
def health_check():
    try:
        eng = get_engine()
        with eng.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

@app.get("/logs")
def get_logs():
    init_db()
    try:
        eng = get_engine()
        with eng.connect() as conn:
            result = conn.execute(text("SELECT id, action, user_email, details, timestamp FROM audit_logs ORDER BY id DESC LIMIT 100"))
            logs = []
            for row in result:
                logs.append({
                    "id": row[0],
                    "action": row[1],
                    "user_email": row[2],
                    "details": row[3],
                    "timestamp": str(row[4])
                })
            return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/logs")
def create_log(log: AuditLogCreate):
    init_db()
    try:
        eng = get_engine()
        with eng.connect() as conn:
            conn.execute(text("""
                INSERT INTO audit_logs (action, user_email, details)
                VALUES (:action, :user_email, :details)
            """), {
                "action": log.action,
                "user_email": log.user_email,
                "details": log.details or ""
            })
            conn.commit()
            return {"status": "recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
