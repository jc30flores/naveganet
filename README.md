# NAVEGANET 

## Backend setup

```bash
python -m venv venv
source venv/bin/activate  # On Windows use venv\Scripts\activate
pip install -r backend/requirements.txt
python backend/scripts/init_db.py
python backend/manage.py migrate
python backend/manage.py runserver
```

API health check: `http://localhost:8000/api/health/`

Frontend code lives in the `frontend/` directory.
