# Testing Suite Guide

This document describes the testing practices, framework structures, execution commands, and coverage reporting for the Enterprise Knowledge Hub testing suite.

---

## 1. Local Testing with Pytest

The testing suite uses **pytest** along with **pytest-asyncio** to support asynchronous database transactions and endpoints.

### Prerequisites
Before running tests, ensure that you have installed the testing dependencies:
```bash
pip install pytest pytest-asyncio aiosqlite httpx locust pytest-cov
```

### Running Tests
Execute the pytest suite from the project's `backend/` directory:

```bash
# Run all tests
pytest

# Run tests with verbose output
pytest -v

# Run only unit tests
pytest tests/unit/

# Run only API integration tests
pytest tests/api/

# Run a specific test file
pytest tests/unit/test_chunking.py

# Run a specific test by function name
pytest -k "test_password_hashing"
```

---

## 2. Code Coverage Metrics

We use `pytest-cov` to generate code coverage metrics to identify untested paths.

### Generate HTML Coverage Report
Run the following command to run all tests and generate a structured HTML report:
```bash
pytest --cov=app --cov-report=html tests/
```
This creates a `htmlcov/` directory. Open `htmlcov/index.html` in your browser to inspect coverage line-by-line.

### CLI Coverage Summary
To quickly display a coverage summary directly in your shell:
```bash
pytest --cov=app --cov-report=term-missing tests/
```

---

## 3. Load Testing with Locust

We use **Locust** to perform load and stress tests against API endpoints. The load test script is located in `backend/tests/load/locustfile.py`.

### Prerequisites
Make sure `locust` is installed:
```bash
pip install locust
```

### Running Locust
1.  Start the FastAPI application locally:
    ```bash
    uvicorn app.main:app --host 127.0.0.1 --port 8000
    ```
2.  In another terminal, start the Locust agent inside `backend/tests/load/`:
    ```bash
    locust -f locustfile.py
    ```
3.  Open the web interface in your browser:
    [http://localhost:8089](http://localhost:8089)
4.  Enter the parameters:
    *   **Number of users**: Total simulated concurrent users (e.g., `100`).
    *   **Spawn rate**: Users added per second (e.g., `10`).
    *   **Host**: Target FastAPI server URL (`http://localhost:8000`).
5.  Click **Start Swarming** to begin load tests and view real-time latency graphs, failure rates, and requests-per-second (RPS) statistics.

---

## 4. Test Fixtures (conftest.py)

The testing infrastructure relies on fixtures configured in `backend/tests/conftest.py` to ensure clean, isolated tests.

### Key Fixtures

*   **`event_loop`**: Overrides the default pytest-asyncio event loop to scope it to the session level, enabling async database connections.
*   **`test_db`**: An asynchronous SQLite database (`sqlite+aiosqlite:///:memory:`) initialized with the schema. This fixture:
    1.  Sets up clean tables from SQLAlchemy models metadata on start.
    2.  Yields an async session.
    3.  Rolls back transactions to prevent database state pollution between tests.
*   **`client`**: An `httpx.AsyncClient` that wraps the FastAPI app (`app.main`). It overrides the standard `get_db` dependency to inject the `test_db` session, allowing API integration testing without running a live server.
*   **`test_user`**: Inserts a standard, active user account into the test DB.
*   **`test_admin`**: Inserts a superuser administrator account into the test DB.
*   **`auth_headers`**: Provides the bearer token Authorization headers for the standard user.
*   **`admin_headers`**: Provides the bearer token Authorization headers for the admin user.
