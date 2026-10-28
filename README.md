# Employee Task Tracker

A simple full-stack task management app built for the Aminoid AI technical assessment.

- **Frontend:** React + Vite
- **Backend:** Python + FastAPI
- **Database:** SQLite
- **API documentation/testing:** FastAPI Swagger UI (`/docs`)

## Features

- Dashboard counters for total, pending, in-progress, and completed tasks
- Create, read, edit, and delete tasks
- Change status directly from the task table
- Search by task title, description, or employee; filter by status
- SQLite persistence (tasks remain after refreshing or restarting the backend)
- Form validation, API error handling, and not-found responses
- Responsive layout

## Prerequisites

Install Python 3.10+ and Node.js 18+ (with npm).

## 1. Start the backend

From the project root:

**Windows PowerShell**
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn main:app --reload
```

**macOS/Linux**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn main:app --reload
```

The API runs at `http://127.0.0.1:8000`. SQLite database file `backend/tasks.db` is created automatically on first startup.

Open `http://127.0.0.1:8000/docs` to try the endpoints.

## 2. Start the frontend

Open a second terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL Vite prints (normally `http://localhost:5173`).

Optional: to use another API host, create `frontend/.env`:
```env
VITE_API_URL=http://127.0.0.1:8000/api
```
Restart Vite after changing environment variables.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/tasks` | List all tasks |
| GET | `/api/tasks/{task_id}` | Get one task |
| POST | `/api/tasks` | Create a task (starts as Pending) |
| PUT | `/api/tasks/{task_id}` | Update task fields |
| PATCH | `/api/tasks/{task_id}/status` | Update status only |
| DELETE | `/api/tasks/{task_id}` | Delete a task |

Priority values: `Low`, `Medium`, `High`  
Status values: `Pending`, `In Progress`, `Completed`

### Sample create body
```json
{
  "title": "Prepare monthly report",
  "description": "Collect metrics and share with the manager",
  "priority": "High",
  "assigned_employee": "Ananya Rao"
}
```

## Test CRUD operations

Use Swagger UI (`/docs`) or these steps:

1. **Create:** `POST /api/tasks` using the sample body. Expect `201 Created` and a task ID.
2. **Read:** `GET /api/tasks`; confirm the created task appears. Try `GET /api/tasks/{id}`.
3. **Update:** `PATCH /api/tasks/{id}/status` with `{"status":"In Progress"}`. Expect updated task.
4. **Delete:** `DELETE /api/tasks/{id}`. Expect a success message.
5. **Verify deletion:** `GET /api/tasks/{id}` should return `404`.
6. **Persistence:** Create another task, refresh the frontend (or restart the backend), and confirm it remains.

### Optional automated API test

Install test dependencies:
```bash
python -m pip install pytest httpx
```
From `backend/` run:
```bash
pytest -q
```
The test suite temporarily redirects the database to a temporary file.

## GitHub submission

From the project root:
```bash
git init
git add .
git commit -m "Build Employee Task Tracker assessment"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/employee-task-tracker.git
git push -u origin main
```
Create an empty GitHub repository first and replace `YOUR-USERNAME` with your account username. Do not commit virtual environments, secrets, or the local SQLite file.

## Screen recording checklist

- Show both backend and frontend running
- Create a task
- Demonstrate the task appearing in the table
- Change status and show dashboard counters
- Edit a task
- Delete a task
- Refresh the page and show data persists
- Open Swagger UI and demonstrate API responses
- Briefly show source folders and README setup instructions

## Notes

- The app is intended for a local technical assessment/demo, not production deployment.
- CORS is configured for local Vite development.
- Employee assignment is entered as a name; there is no separate employee directory in the requested assessment scope.
- Review and execute the project locally, then capture your own real screen recording and push it to your own GitHub repository.
