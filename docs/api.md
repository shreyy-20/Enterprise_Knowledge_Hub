# API Documentation

## Base URL

```
http://localhost:8000/api/v1
```

Production: `https://your-api.onrender.com/api/v1`

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Obtain tokens via the `/auth/login` endpoint. Access tokens expire after 30 minutes. Use the refresh token endpoint to obtain a new access token.

---

## Endpoints

### Authentication

#### Register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123!",
  "full_name": "John Doe",
  "department": "Engineering"
}
```

**Response** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "full_name": "John Doe",
  "department": "Engineering",
  "role": "viewer",
  "is_active": true,
  "created_at": "2026-01-15T10:30:00Z"
}
```

#### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```

**Response** `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### Refresh Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### Get Current User

```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

**Response** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "full_name": "John Doe",
  "department": "Engineering",
  "role": "viewer",
  "is_active": true,
  "created_at": "2026-01-15T10:30:00Z"
}
```

---

### Documents

#### Create Document

```http
POST /api/v1/documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "System Architecture Guide",
  "content": "# Architecture\n\nThis document describes...",
  "format": "markdown",
  "department": "Engineering",
  "tags": ["architecture", "backend", "infrastructure"]
}
```

**Response** `201 Created`

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "title": "System Architecture Guide",
  "format": "markdown",
  "department": "Engineering",
  "tags": ["architecture", "backend", "infrastructure"],
  "author_id": "550e8400-e29b-41d4-a716-446655440000",
  "author_name": "John Doe",
  "status": "processing",
  "chunk_count": 0,
  "created_at": "2026-01-15T11:00:00Z",
  "updated_at": "2026-01-15T11:00:00Z"
}
```

#### List Documents

```http
GET /api/v1/documents?page=1&per_page=20&department=Engineering&tag=architecture
Authorization: Bearer <token>
```

**Response** `200 OK`

```json
{
  "items": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "title": "System Architecture Guide",
      "format": "markdown",
      "department": "Engineering",
      "tags": ["architecture", "backend"],
      "author_name": "John Doe",
      "status": "active",
      "chunk_count": 12,
      "created_at": "2026-01-15T11:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20,
  "pages": 1
}
```

#### Get Document

```http
GET /api/v1/documents/{document_id}
Authorization: Bearer <token>
```

**Response** `200 OK`

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "title": "System Architecture Guide",
  "content": "# Architecture\n\nThis document describes...",
  "format": "markdown",
  "department": "Engineering",
  "tags": ["architecture", "backend"],
  "author_id": "550e8400-e29b-41d4-a716-446655440000",
  "author_name": "John Doe",
  "status": "active",
  "chunk_count": 12,
  "created_at": "2026-01-15T11:00:00Z",
  "updated_at": "2026-01-15T11:00:00Z"
}
```

#### Update Document

```http
PUT /api/v1/documents/{document_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Architecture Guide",
  "content": "# Updated Architecture\n\n...",
  "tags": ["architecture", "backend", "updated"]
}
```

**Response** `200 OK`

#### Delete Document

```http
DELETE /api/v1/documents/{document_id}
Authorization: Bearer <token>
```

**Response** `204 No Content`

---

### Search

#### Semantic Search

```http
POST /api/v1/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "How does the authentication system work?",
  "limit": 10,
  "department": "Engineering",
  "tags": ["backend"],
  "min_score": 0.7
}
```

**Response** `200 OK`

```json
{
  "query": "How does the authentication system work?",
  "results": [
    {
      "document_id": "660e8400-e29b-41d4-a716-446655440001",
      "document_title": "System Architecture Guide",
      "chunk_text": "The authentication system uses JWT tokens with HS256...",
      "score": 0.92,
      "department": "Engineering",
      "author_name": "John Doe"
    }
  ],
  "total": 1,
  "search_time_ms": 45
}
```

#### AI-Powered Answer

```http
POST /api/v1/search/ask
Authorization: Bearer <token>
Content-Type: application/json

{
  "question": "How does the authentication system work?",
  "max_sources": 5
}
```

**Response** `200 OK`

```json
{
  "answer": "The authentication system uses JWT (JSON Web Tokens) with HS256 algorithm. Users authenticate via email/password, receiving an access token (30-min TTL) and a refresh token (7-day TTL). All protected endpoints validate the Bearer token...",
  "sources": [
    {
      "document_id": "660e8400-e29b-41d4-a716-446655440001",
      "document_title": "System Architecture Guide",
      "relevance_score": 0.92
    }
  ],
  "confidence": 0.88
}
```

---

### Experts

#### Get Top Experts

```http
GET /api/v1/experts?department=Engineering&limit=10
Authorization: Bearer <token>
```

**Response** `200 OK`

```json
{
  "experts": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "full_name": "John Doe",
      "department": "Engineering",
      "expertise_score": 87.5,
      "document_count": 15,
      "top_tags": ["architecture", "backend", "security"]
    }
  ]
}
```

---

### Analytics

#### Dashboard Stats

```http
GET /api/v1/analytics/dashboard
Authorization: Bearer <token>
```

**Response** `200 OK`

```json
{
  "total_documents": 156,
  "total_users": 42,
  "total_searches": 1893,
  "documents_this_week": 12,
  "searches_today": 67,
  "top_departments": [
    { "name": "Engineering", "count": 78 },
    { "name": "Product", "count": 45 }
  ],
  "popular_tags": [
    { "name": "architecture", "count": 23 },
    { "name": "onboarding", "count": 18 }
  ]
}
```

---

### Admin

#### List Users (Admin only)

```http
GET /api/v1/admin/users?page=1&per_page=20
Authorization: Bearer <admin_token>
```

**Response** `200 OK`

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "editor",
      "department": "Engineering",
      "is_active": true,
      "created_at": "2026-01-15T10:30:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "per_page": 20
}
```

#### Update User Role (Admin only)

```http
PATCH /api/v1/admin/users/{user_id}/role
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role": "editor"
}
```

**Response** `200 OK`

---

### Health

#### Health Check

```http
GET /health
```

**Response** `200 OK`

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "qdrant": "connected"
  }
}
```

#### Metrics (Prometheus)

```http
GET /metrics
```

Returns Prometheus-format metrics.

---

## Error Codes

| HTTP Status | Error Code | Description |
|-------------|-----------|-------------|
| `400` | `BAD_REQUEST` | Invalid request body or parameters |
| `401` | `UNAUTHORIZED` | Missing or invalid authentication token |
| `403` | `FORBIDDEN` | Insufficient permissions for this action |
| `404` | `NOT_FOUND` | Resource not found |
| `409` | `CONFLICT` | Resource already exists (e.g., duplicate email) |
| `422` | `VALIDATION_ERROR` | Request validation failed |
| `429` | `RATE_LIMITED` | Too many requests — retry after cooldown |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

### Error Response Format

```json
{
  "detail": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "field": "email"
  }
}
```

## Rate Limiting

- **Default limit**: 60 requests per minute per user
- **Search endpoints**: 30 requests per minute per user
- **Auth endpoints**: 10 requests per minute per IP

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705312800
```

When rate limited, the API returns `429 Too Many Requests` with a `Retry-After` header.
