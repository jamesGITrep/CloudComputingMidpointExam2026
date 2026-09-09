import os
import json
import base64
import hmac
import hashlib
import time
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

app = FastAPI(title="User Auth Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_NAME = os.getenv("DB_NAME", "user_auth_db")
DB_HOST = os.getenv("DB_HOST", "user-db")
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-support-ticket-jwt-key-2026")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
engine = None

def get_engine():
    global engine
    if engine is None:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    return engine

def hash_password(password: str) -> str:
    return hashlib.sha256(f"{password}_salt_support_2026".encode()).hexdigest()

def create_jwt_token(payload: dict) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload_copy = dict(payload)
    payload_copy["exp"] = int(time.time()) + 86400 * 7  # 7 days
    payload_copy["iat"] = int(time.time())
    
    encoded_header = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    encoded_payload = base64.urlsafe_b64encode(json.dumps(payload_copy).encode()).decode().rstrip("=")
    signature = base64.urlsafe_b64encode(
        hmac.new(JWT_SECRET.encode(), f"{encoded_header}.{encoded_payload}".encode(), hashlib.sha256).digest()
    ).decode().rstrip("=")
    
    return f"{encoded_header}.{encoded_payload}.{signature}"

def decode_jwt_token(token: str) -> dict:
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="Invalid token format")
    header, payload, sig = parts
    expected_sig = base64.urlsafe_b64encode(
        hmac.new(JWT_SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    ).decode().rstrip("=")
    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(status_code=401, detail="Invalid token signature")
    
    padding = 4 - (len(payload) % 4)
    if padding != 4:
        payload += "=" * padding
    data = json.loads(base64.urlsafe_b64decode(payload).decode())
    if data.get("exp", 0) < time.time():
        raise HTTPException(status_code=401, detail="Token expired")
    return data

def init_db():
    try:
        eng = get_engine()
        with eng.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(100) NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    role VARCHAR(50) NOT NULL DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.commit()

            # Seed default admin and user if not exists
            admin_check = conn.execute(text("SELECT id FROM users WHERE email = 'admin@support.com'")).fetchone()
            if not admin_check:
                conn.execute(text("""
                    INSERT INTO users (username, email, password_hash, role)
                    VALUES ('Administrator', 'admin@support.com', :pwd, 'admin')
                """), {"pwd": hash_password("admin123")})
                conn.commit()

            user_check = conn.execute(text("SELECT id FROM users WHERE email = 'user@support.com'")).fetchone()
            if not user_check:
                conn.execute(text("""
                    INSERT INTO users (username, email, password_hash, role)
                    VALUES ('John Doe', 'user@support.com', :pwd, 'user')
                """), {"pwd": hash_password("user123")})
                conn.commit()
    except Exception as e:
        print(f"Error initializing DB: {e}")

@app.on_event("startup")
def on_startup():
    init_db()

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = "user"

class LoginRequest(BaseModel):
    email: str
    password: str

@app.get("/")
def read_root():
    return {"message": "User Auth Service is running"}

@app.get("/health")
def health_check():
    try:
        eng = get_engine()
        with eng.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

@app.post("/register")
def register(req: RegisterRequest):
    init_db()
    eng = get_engine()
    with eng.connect() as conn:
        existing = conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": req.email.strip().lower()}).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        role = "admin" if req.role.lower() == "admin" else "user"
        pwd_hash = hash_password(req.password)
        res = conn.execute(text("""
            INSERT INTO users (username, email, password_hash, role)
            VALUES (:username, :email, :password_hash, :role)
            RETURNING id, username, email, role
        """), {
            "username": req.username.strip(),
            "email": req.email.strip().lower(),
            "password_hash": pwd_hash,
            "role": role
        })
        user = res.fetchone()
        conn.commit()
        
        user_data = {
            "id": user[0],
            "username": user[1],
            "email": user[2],
            "role": user[3]
        }
        token = create_jwt_token(user_data)
        return {"token": token, "user": user_data}

@app.post("/login")
def login(req: LoginRequest):
    init_db()
    eng = get_engine()
    with eng.connect() as conn:
        pwd_hash = hash_password(req.password)
        user = conn.execute(text("""
            SELECT id, username, email, role FROM users 
            WHERE email = :email AND password_hash = :pwd
        """), {
            "email": req.email.strip().lower(),
            "pwd": pwd_hash
        }).fetchone()
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        user_data = {
            "id": user[0],
            "username": user[1],
            "email": user[2],
            "role": user[3]
        }
        token = create_jwt_token(user_data)
        return {"token": token, "user": user_data}

@app.get("/me")
def get_me(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ")[1]
    return decode_jwt_token(token)
