# Learnora Scripts

Helper scripts to run the Learnora platform services.

## Windows (PowerShell)

### Quick Start - Run Everything
```powershell
.\start-all.ps1
```
This will open two new PowerShell windows:
- One for the backend (FastAPI)
- One for the frontend (React)

### Run Backend Only
```powershell
.\run-backend.ps1
```
Starts the FastAPI backend server at http://localhost:8000

### Run Frontend Only
```powershell
.\run-frontend.ps1
```
Starts the React development server at http://localhost:5173

## Linux/macOS (Bash)

### Run Backend
```bash
./run-core-service.sh
```

### Run Frontend
```bash
./run-learner-web-app.sh
```

## What These Scripts Do

### Backend Script (`run-backend.ps1` / `run-core-service.sh`)
1. Checks if `.env` file exists (creates from `.env.example` if not)
2. Creates Python virtual environment if needed
3. Activates virtual environment
4. Installs dependencies if needed
5. Starts the FastAPI server with auto-reload

### Frontend Script (`run-frontend.ps1` / `run-learner-web-app.sh`)
1. Checks if `.env` file exists (creates from `.env.example` if not)
2. Checks if `node_modules` exists (runs `npm install` if not)
3. Starts the React development server

### Start All Script (`start-all.ps1`)
1. Launches backend in a new PowerShell window
2. Launches frontend in a new PowerShell window
3. Both run simultaneously

## Troubleshooting

### PowerShell Execution Policy Error
If you get an error about execution policy, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port Already in Use
- Backend (8000): Stop any other process using port 8000
- Frontend (5173): Stop any other Vite/React dev server

### Dependencies Not Installing
- Backend: Make sure Python 3.12+ is installed
- Frontend: Make sure Node.js 18+ is installed

## Manual Commands

If you prefer to run commands manually:

### Backend
```bash
cd core-service
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/macOS
pip install -e .
uvicorn app.main:app --reload
```

### Frontend
```bash
cd learner-web-app
npm install
npm run dev
```
 files are not production level implementation. Mostly it runs dev version in vm.