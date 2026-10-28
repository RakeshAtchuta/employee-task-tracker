import importlib
import os
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient
import main


def test_task_crud_and_validation(monkeypatch):
    with tempfile.TemporaryDirectory() as temp:
        test_db = Path(temp) / "test_tasks.db"
        monkeypatch.setattr(main, "DB_PATH", test_db)
        main.init_db()
        with TestClient(main.app) as client:
            assert client.get("/api/health").json() == {"status": "ok"}

            created = client.post("/api/tasks", json={
                "title": "QA test case", "description": "Verify task CRUD",
                "priority": "High", "assigned_employee": "Rakesh"
            })
            assert created.status_code == 201
            task = created.json()
            task_id = task["id"]
            assert task["status"] == "Pending"

            assert client.get("/api/tasks").json()[0]["id"] == task_id
            assert client.get(f"/api/tasks/{task_id}").status_code == 200

            changed = client.patch(f"/api/tasks/{task_id}/status", json={"status": "Completed"})
            assert changed.status_code == 200
            assert changed.json()["status"] == "Completed"

            edited = client.put(f"/api/tasks/{task_id}", json={"title": "Updated QA case"})
            assert edited.status_code == 200
            assert edited.json()["title"] == "Updated QA case"

            invalid = client.patch(f"/api/tasks/{task_id}/status", json={"status": "Finished"})
            assert invalid.status_code == 422

            deleted = client.delete(f"/api/tasks/{task_id}")
            assert deleted.status_code == 200
            assert client.get(f"/api/tasks/{task_id}").status_code == 404
