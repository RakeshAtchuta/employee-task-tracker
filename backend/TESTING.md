# API Test Notes

The automated test `test_api.py` covers:
- API health check
- Create task (HTTP 201, default Pending status)
- List tasks and fetch a task
- Update task status
- Update task fields
- Reject invalid status values
- Delete task and verify 404 after deletion

Run from `backend/`:
```bash
python -m pip install -r requirements.txt
python -m pip install pytest httpx
pytest -q
```

Record your actual local test output in your submission; do not claim a test passed unless you executed it.
