# Support Ticket System

A locally runnable helpdesk platform using an API Gateway, a React frontend, and 4 isolated backend microservices.

## Architecture
- **API Gateway:** Nginx
- **Frontend:** React + Vite
- **User & Auth Service:** FastAPI + PostgreSQL
- **Ticket Service:** Express + MySQL
- **Knowledge Base Service:** Express + PostgreSQL
- **Audit Log Service:** FastAPI + MySQL

## Running the Application
```bash
docker-compose up --build
```

Access the application at `http://localhost`.
