# Deployment Guide (Free Tiers & Cloud Hosting)

This guide provides step-by-step instructions for deploying the Enterprise Knowledge Hub using developer-friendly free-tier services:
*   **Database**: Supabase (PostgreSQL)
*   **Backend Hosting**: Render (FastAPI & Background Workers)
*   **Frontend Hosting**: Vercel (React / TypeScript / Vite)
*   **Vector Database**: Qdrant Cloud (Managed Vector DB)
*   **Caching & Rates**: Upstash (Serverless Redis)

---

## 1. Managed Databases Setup

### A. Supabase (PostgreSQL)
1.  **Sign Up**: Create an account on [Supabase](https://supabase.com).
2.  **Create Project**: Click **New Project**, enter a name (e.g., `knowledge-hub-db`), and set a strong database password. Choose the region closest to your application server.
3.  **Connection Settings**:
    *   Navigate to **Project Settings** > **Database**.
    *   Under **Connection String**, select the **URI** format.
    *   Choose **Transaction** mode (port `6543`) or **Session** mode (port `5432`). For FastAPI applications using async connections, the connection pool behaves best with **Session mode** (`port=5432`) or direct connection, but remember to replace the protocol in the URI with `postgresql+asyncpg://`.
    *   Example Connection URL:
        `postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres`

### B. Qdrant Cloud (Vector DB)
1.  **Sign Up**: Create an account on [Qdrant Cloud](https://cloud.qdrant.io).
2.  **Provision Cluster**: Create a free-tier cluster. This provides:
    *   1 Node, 0.5 vCPU, 1 GB RAM, 4 GB Disk (plenty for up to ~50,000 document chunks).
3.  **Retrieve Keys**:
    *   Copy the **Endpoint** URL (e.g., `https://xxxxxx.eu-central.aws.cloud.qdrant.io:6333`).
    *   Create an **API Key** under the Access management panel and copy the secret token.

### C. Upstash (Serverless Redis)
1.  **Sign Up**: Register on [Upstash](https://upstash.com).
2.  **Create Database**: Create a Redis database, select your cloud provider and region, and choose the SSL connection settings.
3.  **Retrieve URL**:
    *   Under the database dashboard, find the **Redis Connect URI**.
    *   Copy the URL format containing the credentials:
        `rediss://default:[YOUR-PASSWORD]@xxxx-xxxx-37900.upstash.io:37900`
    *   *Note*: Ensure you use the `rediss://` protocol prefix (with double `s`) to enforce SSL encryption in transit.

---

## 2. Backend & Worker Deployment (Render)

Render hosts our FastAPI backend web server and the background workers processing Kafka/Ingestion tasks.

### A. FastAPI Web Application
1.  Log in to [Render](https://render.com).
2.  Click **New +** > **Web Service**.
3.  Connect your GitHub repository.
4.  Configure the service:
    *   **Name**: `knowledge-hub-api`
    *   **Environment**: `Docker`
    *   **Dockerfile Path**: `backend/Dockerfile` (if the Dockerfile is in the backend directory).
    *   **Instance Type**: `Free`
5.  Set the following **Environment Variables** in Render:
    *   `ENVIRONMENT`: `production`
    *   `DEBUG`: `false`
    *   `DATABASE_URL`: `postgresql+asyncpg://postgres:[PWD]@db.xxx.supabase.co:5432/postgres`
    *   `REDIS_URL`: `rediss://default:[PWD]@xxx.upstash.io:37900`
    *   `QDRANT_HOST`: `https://xxxxxx.eu-central.aws.cloud.qdrant.io`
    *   `QDRANT_PORT`: `6333`
    *   `QDRANT_API_KEY`: `[YOUR-QDRANT-API-KEY]`
    *   `QDRANT_COLLECTION`: `knowledge_embeddings`
    *   `JWT_SECRET_KEY`: `[GENERATE-A-LONG-RANDOM-HEX-STRING]`
    *   `JWT_ALGORITHM`: `HS256`
    *   `OPENAI_API_KEY`: `[YOUR-OPENAI-API-KEY]`
    *   `KAFKA_BOOTSTRAP_SERVERS`: `[YOUR-KAFKA-SERVERS]` (e.g. Upstash Kafka or similar provider; if using internal queues, adjust configuration settings).

### B. Ingestion & Embedding Workers
Render allows deploying background worker processes that do not expose external web ports.
1.  Click **New +** > **Background Worker**.
2.  Connect the same repository.
3.  Configure the service:
    *   **Name**: `knowledge-hub-worker`
    *   **Environment**: `Docker`
    *   **Dockerfile Path**: `backend/Dockerfile`
    *   **Docker Command**: `python -m app.workers.ingestion_worker` (or your worker execution command).
    *   **Instance Type**: `Free`
4.  Bind the exact same **Environment Variables** group as the Web service.

---

## 3. Frontend Deployment (Vercel)

The React TypeScript client is hosted on Vercel as a Single Page Application (SPA).

1.  Log in to [Vercel](https://vercel.com).
2.  Click **Add New** > **Project** and import your repository.
3.  Configure the build settings:
    *   **Framework Preset**: `Vite` (or `Other` if Vite is auto-detected).
    *   **Root Directory**: `frontend`
    *   **Build Command**: `npm run build` or `vite build`
    *   **Output Directory**: `dist`
4.  Configure **Environment Variables**:
    *   `VITE_API_URL`: `https://knowledge-hub-api.onrender.com/api/v1`
5.  **SPA Routing Override (`vercel.json`)**:
    Since Vercel serves static files, reloading nested routes (e.g., `/dashboard/documents`) will trigger 404 errors. Add a `vercel.json` file in the `frontend/` directory to redirect all requests to `index.html`:
    ```json
    {
      "rewrites": [
        {
          "source": "/(.*)",
          "destination": "/index.html"
        }
      ]
    }
    ```

---

## 4. Bootstrapping & Initialization

Once your Supabase DB is active and environment variables are set up, perform the following steps to initialize database tables, run migrations, and seed the first admin user:

### Step 1: Initialize Database Tables
If you do not use Alembic, you can trigger database initialization from the backend console or via a temporary script. FastAPI runs `init_db()` automatically on startup lifespan, which creates all tables defined in SQLAlchemy models.
To verify, check Supabase's **Table Editor** to ensure tables like `users`, `roles`, `documents`, and `experts` exist.

### Step 2: Seed Roles and Permissions
Run the seed script from the backend environment to populate initial roles (`Admin`, `User`) and permissions.
Create a file named `seed.py` (or run a database console command):
```bash
# SSH into Render container or run locally with production env variables
python -m app.core.seed
```

### Step 3: Create Seed User
Create your primary administrator account:
```bash
# Run CLI script to create an admin
python -m app.core.create_admin --email admin@company.com --password "SuperSecurePass123!" --fullname "System Admin"
```

---

## 5. Monitoring & Rollback Procedures

### Service Monitoring
*   **Supabase Dashboard**: Monitor active database connections, CPU usage, and slow queries. Set up email alerts in Supabase if connection limits are reached.
*   **Upstash Console**: Track Redis command rate, payload sizes, and check active rate limits.
*   **Render Logs**: Access **Log Streaming** in the Render console for both `knowledge-hub-api` and `knowledge-hub-worker` to detect runtime Python/SQL errors.

### Rollback Process
1.  **Code Rollback**:
    *   To revert a bad deployment, navigate to Render's project dashboard, select the active web service, click **Deployments**, locate the last stable deployment commit, and click **Rollback to this deploy**.
2.  **Database Migration Rollback**:
    *   If using migrations (e.g., Alembic), run the rollback command locally using the production database connection string:
        ```bash
        alembic downgrade -1
        ```
    *   In Supabase, you can restore automatic daily backups from the **Database** > **Backups** page if data corruption occurs.
