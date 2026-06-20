# 🧠 Enterprise Knowledge Hub

[![CI](https://github.com/your-org/enterprise-knowledge-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/enterprise-knowledge-hub/actions/workflows/ci.yml)
[![Deploy](https://github.com/your-org/enterprise-knowledge-hub/actions/workflows/deploy.yml/badge.svg)](https://github.com/your-org/enterprise-knowledge-hub/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

**An AI-powered knowledge management platform that transforms scattered organizational documents into a searchable, intelligent knowledge base.** Enterprise Knowledge Hub ingests documents, chunks and embeds them with vector search, identifies domain experts, and provides AI-assisted answers — all with enterprise-grade security, RBAC, and audit logging.

---

## Architecture

```mermaid
graph TB
    subgraph Client
        FE[React Frontend]
    end

    subgraph API Layer
        NGINX[Nginx Reverse Proxy]
        API[FastAPI Backend]
    end

    subgraph Data Stores
        PG[(PostgreSQL 16)]
        REDIS[(Redis 7)]
        QDRANT[(Qdrant Vector DB)]
    end

    subgraph Event Streaming
        ZK[Zookeeper]
        KAFKA[Apache Kafka]
        WORKER[Ingestion Worker]
    end

    subgraph AI Pipeline
        EMBED[Embedding Service]
        LLM[LLM Service]
    end

    subgraph Observability
        PROM[Prometheus]
        GRAF[Grafana]
    end

    FE --> NGINX
    NGINX --> API
    API --> PG
    API --> REDIS
    API --> QDRANT
    API --> KAFKA
    KAFKA --> WORKER
    WORKER --> QDRANT
    WORKER --> PG
    WORKER --> EMBED
    API --> LLM
    API --> EMBED
    PROM --> API
    GRAF --> PROM
    KAFKA --> ZK
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Python 3.12, FastAPI | REST API, async request handling |
| **Frontend** | React, TypeScript, Vite | Single-page application |
| **Database** | PostgreSQL 16 | Relational data, users, documents |
| **Cache** | Redis 7 | Session cache, rate limiting |
| **Vector DB** | Qdrant | Semantic search, embeddings storage |
| **Event Stream** | Apache Kafka | Async document ingestion pipeline |
| **AI/LLM** | OpenAI API | Embeddings, AI-powered search answers |
| **Auth** | JWT (HS256) | Stateless authentication, RBAC |
| **Monitoring** | Prometheus + Grafana | Metrics, dashboards, alerting |
| **Proxy** | Nginx | Reverse proxy, static file serving |
| **CI/CD** | GitHub Actions | Automated testing and deployment |
| **Containerization** | Docker, Docker Compose | Development and production environments |

## Features

- 🔍 **Semantic Search** — AI-powered vector search across all documents with natural language queries
- 📄 **Multi-format Ingestion** — Upload and process PDF, Markdown, DOCX, and plain text documents
- 🤖 **AI Answers** — Get contextual answers synthesized from your knowledge base using RAG
- 👥 **Expert Identification** — Automatically identify domain experts based on document contributions
- 🔐 **Enterprise Security** — RBAC, JWT auth, input sanitization, rate limiting, audit logging
- 📊 **Real-time Analytics** — Dashboard with document stats, search trends, and user activity
- 🏷️ **Smart Tagging** — Auto-categorization with tags and departments
- ⚡ **Async Processing** — Kafka-driven document ingestion pipeline for non-blocking uploads
- 📈 **Observability** — Prometheus metrics with pre-built Grafana dashboards

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v24+) and [Docker Compose](https://docs.docker.com/compose/) (v2+)
- [Python 3.12+](https://www.python.org/downloads/) (for local backend development)
- [Node.js 20+](https://nodejs.org/) (for local frontend development)
- [OpenAI API Key](https://platform.openai.com/api-keys) (for AI features)

## Quick Start

The fastest way to get everything running:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/enterprise-knowledge-hub.git
cd enterprise-knowledge-hub

# 2. Copy environment file and configure
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 3. Start all services
cd docker
docker compose up -d

# 4. Verify services are running
docker compose ps
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Grafana | http://localhost:3001 (admin/admin) |
| Prometheus | http://localhost:9090 |
| Qdrant Dashboard | http://localhost:6333/dashboard |

## Development Setup

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Run with hot-reload
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm ci

# Start dev server
npm run dev
```

### Docker (Development Mode)

```bash
cd docker
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

This mounts source code as volumes for hot-reload and enables debug logging.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://postgres:postgres@localhost:5432/knowledge_hub` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `KAFKA_BOOTSTRAP_SERVERS` | Kafka broker address | `localhost:9092` |
| `QDRANT_HOST` | Qdrant server host | `localhost` |
| `QDRANT_PORT` | Qdrant server port | `6333` |
| `JWT_SECRET_KEY` | Secret key for JWT signing | (required, change in production) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime | `30` |
| `OPENAI_API_KEY` | OpenAI API key for embeddings/LLM | (required for AI features) |
| `EMBEDDING_MODEL` | OpenAI embedding model | `text-embedding-ada-002` |
| `LLM_MODEL` | OpenAI LLM model | `gpt-4o-mini` |
| `CORS_ORIGINS` | Allowed CORS origins (JSON array) | `["http://localhost:3000"]` |
| `RATE_LIMIT_PER_MINUTE` | Max API requests per minute per user | `60` |

See [`.env.example`](.env.example) for the full list.

## API Documentation

Interactive API documentation is available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

See [docs/api.md](docs/api.md) for detailed endpoint documentation.

## Project Structure

```
enterprise-knowledge-hub/
├── backend/                    # FastAPI backend service
│   ├── app/
│   │   ├── api/               # Route handlers
│   │   ├── core/              # Config, security, middleware
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── services/          # Business logic layer
│   │   ├── workers/           # Kafka consumer workers
│   │   └── main.py            # Application entrypoint
│   ├── tests/                 # Test suite
│   │   ├── unit/              # Unit tests
│   │   ├── api/               # API integration tests
│   │   └── load/              # Load tests (Locust)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                   # React/TypeScript frontend
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
├── docker/                     # Docker orchestration
│   ├── docker-compose.yml     # Production compose
│   ├── docker-compose.dev.yml # Development overrides
│   ├── prometheus/            # Prometheus config
│   └── grafana/               # Grafana dashboards & provisioning
├── docs/                       # Documentation
│   ├── api.md
│   ├── architecture.md
│   ├── deployment.md
│   └── testing.md
├── .github/workflows/          # CI/CD pipelines
│   ├── ci.yml
│   └── deploy.yml
├── .env.example
├── .gitignore
└── README.md
```

## Deployment

The platform is designed to run on free-tier cloud services:

| Service | Provider | Tier |
|---------|----------|------|
| Backend API | [Render](https://render.com) | Free |
| Frontend | [Vercel](https://vercel.com) | Free |
| PostgreSQL | [Supabase](https://supabase.com) | Free (500 MB) |
| Redis | [Upstash](https://upstash.com) | Free (10K cmds/day) |
| Vector DB | [Qdrant Cloud](https://cloud.qdrant.io) | Free (1 GB) |

See [docs/deployment.md](docs/deployment.md) for step-by-step instructions.

## Testing

```bash
cd backend

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=term-missing

# Run specific test categories
pytest tests/unit/ -v          # Unit tests only
pytest tests/api/ -v           # API integration tests
pytest tests/load/ -v          # Load tests

# Load testing with Locust
cd tests/load
locust -f locustfile.py --host http://localhost:8000
```

See [docs/testing.md](docs/testing.md) for the full testing guide.

## Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Commit** your changes: `git commit -m 'Add my feature'`
4. **Push** to the branch: `git push origin feature/my-feature`
5. **Open** a Pull Request

### Guidelines

- Follow the existing code style (enforced by Ruff)
- Write tests for new features (maintain >70% coverage)
- Update documentation for API changes
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ for enterprise knowledge management
</p>
