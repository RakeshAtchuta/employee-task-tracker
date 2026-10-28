from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
import sqlite3

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "tasks.db"
VALID_PRIORITIES = {"Low", "Medium", "High"}
VALID_STATUSES = {"Pending", "In Progress", "Completed"}


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                priority TEXT NOT NULL CHECK(priority IN ('Low','Medium','High')),
                assigned_employee TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Pending'
                    CHECK(status IN ('Pending','In Progress','Completed')),
                created_at TEXT NOT NULL
            )
        """)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Employee Task Tracker API",
    description="CRUD REST API for employee tasks, backed by SQLite.",
    version="1.0.0",
    lifespan=lifespan,
)

# For local assessment development. Restrict origins before production deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=1000)
    priority: str
    assigned_employee: str = Field(min_length=1, max_length=120)

    @classmethod
    def validate_values(cls, values):
        return values


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    priority: str | None = None
    assigned_employee: str | None = Field(default=None, min_length=1, max_length=120)
    status: str | None = None


class TaskStatusUpdate(BaseModel):
    status: str


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str
    priority: str
    assigned_employee: str
    status: str
    created_at: str


def task_from_row(row):
    return dict(row)


def check_priority(priority: str):
    if priority not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=422,
            detail=f"priority must be one of: {', '.join(sorted(VALID_PRIORITIES))}",
        )


def check_status(value: str):
    if value not in VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"status must be one of: {', '.join(sorted(VALID_STATUSES))}",
        )


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/tasks", response_model=list[TaskOut])
def list_tasks():
    with connect() as conn:
        rows = conn.execute("SELECT * FROM tasks ORDER BY id DESC").fetchall()
    return [task_from_row(row) for row in rows]


@app.get("/api/tasks/{task_id}", response_model=TaskOut)
def get_task(task_id: int):
    with connect() as conn:
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task_from_row(row)


@app.post("/api/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(task: TaskCreate):
    title = task.title.strip()
    employee = task.assigned_employee.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Title cannot be blank")
    if not employee:
        raise HTTPException(status_code=422, detail="Assigned employee cannot be blank")
    check_priority(task.priority)
    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with connect() as conn:
        cursor = conn.execute(
            """INSERT INTO tasks (title, description, priority, assigned_employee, status, created_at)
               VALUES (?, ?, ?, ?, 'Pending', ?)""",
            (title, task.description.strip(), task.priority, employee, created_at),
        )
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return task_from_row(row)


@app.put("/api/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: int, task: TaskUpdate):
    changes = task.model_dump(exclude_unset=True, exclude_none=True)
    if not changes:
        raise HTTPException(status_code=400, detail="Provide at least one field to update")
    if "title" in changes:
        changes["title"] = changes["title"].strip()
        if not changes["title"]:
            raise HTTPException(status_code=422, detail="Title cannot be blank")
    if "assigned_employee" in changes:
        changes["assigned_employee"] = changes["assigned_employee"].strip()
        if not changes["assigned_employee"]:
            raise HTTPException(status_code=422, detail="Assigned employee cannot be blank")
    if "priority" in changes:
        check_priority(changes["priority"])
    if "status" in changes:
        check_status(changes["status"])
    if "description" in changes:
        changes["description"] = changes["description"].strip()

    allowed = {"title", "description", "priority", "assigned_employee", "status"}
    if not set(changes).issubset(allowed):
        raise HTTPException(status_code=422, detail="Invalid field")
    assignments = ", ".join(f"{field} = ?" for field in changes)
    values = list(changes.values()) + [task_id]
    with connect() as conn:
        existing = conn.execute("SELECT id FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Task not found")
        conn.execute(f"UPDATE tasks SET {assignments} WHERE id = ?", values)
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return task_from_row(row)


@app.patch("/api/tasks/{task_id}/status", response_model=TaskOut)
def update_task_status(task_id: int, payload: TaskStatusUpdate):
    check_status(payload.status)
    with connect() as conn:
        existing = conn.execute("SELECT id FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Task not found")
        conn.execute("UPDATE tasks SET status = ? WHERE id = ?", (payload.status, task_id))
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return task_from_row(row)


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int):
    with connect() as conn:
        cursor = conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully", "id": task_id}
