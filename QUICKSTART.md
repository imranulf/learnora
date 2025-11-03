# Learnora - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Prerequisites
- Python 3.12 or higher
- Node.js 18 or higher
- Git

### Step 1: Clone and Setup

```bash
cd Learnora
```

### Step 2: Backend Setup

```bash
# Navigate to backend
cd core-service

# Create virtual environment (optional but recommended)
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
# Using uv (recommended - faster):
pip install uv
uv sync

# OR using pip:
pip install -e .

# Create environment file
copy .env.example .env  # Windows
# cp .env.example .env  # macOS/Linux

# Edit .env and add your Google API key:
# GOOGLE_API_KEY=your-actual-api-key-here
```

### Step 3: Frontend Setup

```bash
# Open a new terminal
cd learner-web-app

# Install dependencies
npm install

# Create environment file
copy .env.example .env  # Windows
# cp .env.example .env  # macOS/Linux
```

### Step 4: Run the Application

**Terminal 1 - Backend:**
```bash
cd core-service
uvicorn app.main:app --reload
```
Backend will run at: http://localhost:8000
API Docs at: http://localhost:8000/docs

**Terminal 2 - Frontend:**
```bash
cd learner-web-app
npm run dev
```
Frontend will run at: http://localhost:5173

### Step 5: Test It Out

1. Open http://localhost:5173 in your browser
2. Click "Sign In"
3. Create a new account or use test credentials
4. Explore the dashboard!

## 📚 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check out the [API Documentation](http://localhost:8000/docs) when backend is running
- Review the [Architecture Documentation](docs/ai_agent/) for AI agent details
- See [Authentication Guide](docs/20251028-authentication-integration-mui-toolpad.md)

## 🔧 Troubleshooting

### Backend won't start
- Make sure Python 3.12+ is installed: `python --version`
- Check if all dependencies are installed: `pip list`
- Verify .env file exists with GOOGLE_API_KEY set

### Frontend won't start
- Make sure Node.js 18+ is installed: `node --version`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Check if backend is running on port 8000

### Database errors
- Delete the database file: `rm learnora.db`
- Restart the backend - it will recreate the database

## 🎯 Key Features to Try

1. **Learning Path Planning** - Create personalized learning paths
2. **Knowledge Graph** - Track your learning progress with RDF-based knowledge storage
3. **Concept Management** - Organize learning concepts
4. **User Authentication** - Secure login and user management

## 📞 Need Help?

Check the documentation in the `/docs` folder or refer to the main README.md file.

---

**Happy Learning! 🎓**
