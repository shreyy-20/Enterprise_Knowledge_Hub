# backend/tests/load/locustfile.py
"""
Locust load test script simulating concurrent user behavior against the FastAPI endpoints.
"""

import random
import uuid
from locust import HttpUser, task, between, events


class KnowledgeHubLoadTester(HttpUser):
    """Simulates active users browsing, searching, and querying the knowledge hub."""
    
    # Wait between 1 and 3 seconds between tasks
    wait_time = between(1.0, 3.0)
    
    # Sample search queries to distribute
    queries = [
        "firewall policy",
        "kubernetes deploy",
        "security audit checklist",
        "database migration",
        "OAuth2 authentication",
        "Redis caching",
        "Kafka message broker",
        "analytics dashboard stats",
        "expert search",
        "compliance rules"
    ]

    def on_start(self):
        """Set up auth state for the simulated user by registering and logging in."""
        self.username = f"load_{uuid.uuid4().hex[:8]}"
        self.email = f"{self.username}@loadtest.com"
        self.password = "LoadTestPass123!"
        self.headers = {}
        
        # 1. Register User
        reg_payload = {
            "email": self.email,
            "username": self.username,
            "password": self.password,
            "full_name": f"Load User {self.username.upper()}"
        }
        
        with self.client.post("/api/v1/auth/register", json=reg_payload, catch_response=True) as response:
            if response.status_code == 201:
                response.success()
            else:
                response.failure(f"Registration failed: {response.status_code} - {response.text}")
                return
                
        # 2. Login User
        login_data = {
            "username": self.email,
            "password": self.password
        }
        with self.client.post("/api/v1/auth/login", data=login_data, catch_response=True) as response:
            if response.status_code == 200:
                token_data = response.json()
                access_token = token_data.get("access_token")
                self.headers = {"Authorization": f"Bearer {access_token}"}
                response.success()
            else:
                response.failure(f"Login failed: {response.status_code} - {response.text}")

    @task(3)
    def list_documents(self):
        """List document metadata."""
        if not self.headers:
            return
        self.client.get("/api/v1/documents/", headers=self.headers)

    @task(4)
    def search_knowledge(self):
        """Perform semantic or hybrid search."""
        if not self.headers:
            return
        query = random.choice(self.queries)
        search_type = random.choice(["semantic", "hybrid", "keyword"])
        
        payload = {
            "query": query,
            "search_type": search_type,
            "size": 5
        }
        
        self.client.post("/api/v1/search/", json=payload, headers=self.headers)

    @task(2)
    def ask_rag_question(self):
        """Query the AI RAG system."""
        if not self.headers:
            return
        query = f"Can you explain our policy on {random.choice(self.queries)}?"
        payload = {
            "query": query
        }
        self.client.post("/api/v1/search/ask", json=payload, headers=self.headers)

    @task(2)
    def fetch_user_me(self):
        """Get current user details."""
        if not self.headers:
            return
        self.client.get("/api/v1/users/me", headers=self.headers)

    @task(1)
    def view_dashboards(self):
        """Attempt to view admin dashboards (should return 403 for standard users)."""
        if not self.headers:
            return
        # Catch response since 403 is expected and should not register as a system failure
        with self.client.get("/api/v1/analytics/dashboard", headers=self.headers, catch_response=True) as response:
            if response.status_code in [200, 403]:
                response.success()
            else:
                response.failure(f"Unexpected status code: {response.status_code}")
