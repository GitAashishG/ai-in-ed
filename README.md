# 🎓 AI Usage Tracking System

A research tool for studying how computer science students interact with AI assistants when solving coding problems. This application serves as an intelligent wrapper around Azure OpenAI, comprehensively logging all user interactions for educational research.

---

## 📖 Project Overview

### Purpose
This tool enables researchers to:
- Track student usage patterns when working with AI assistants
- Analyze how students formulate questions and use AI responses
- Study copy-paste behavior and code reuse
- Understand engagement levels and reading patterns
- Collect data on AI's role in CS education

### How It Works
1. **Students log in** with their A-number (e.g., `A01234567`)
2. **Ask coding questions** through a simple chat interface
3. **Receive AI-generated responses** powered by Azure OpenAI (GPT-4)
4. **All interactions are logged** automatically for research analysis

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ installed
- Azure OpenAI account with API access
- Pre-approved list of student A-numbers

### 1️⃣ Clone & Install
```bash
# Clone the repository
git clone https://github.com/GitAashishG/ai-in-ed.git
cd ai-in-ed

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2️⃣ Configure Environment
Create `backend/.env` with your Azure OpenAI credentials:
```env
# Azure OpenAI Configuration
AZURE_OPENAI_KEY=your-azure-openai-key
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com/
AZURE_OPENAI_MODEL=gpt-4.1
AZURE_OPENAI_API_VERSION=2024-08-01-preview

# Application Configuration
PORT=3001
MAX_REQUESTS_PER_USER=50
AUTHORIZED_USERIDS=A01234567,A01234568,A01234569

# Database (SQLite for local, Cosmos DB for production)
DB_TYPE=sqlite
SQLITE_DB_PATH=./data/ai-usage-tracking.db
```

> 💡 **Tip**: Copy `backend/.env.example` as a starting point

### 3️⃣ Start the Application
```bash
# Terminal 1: Start backend
cd backend
npm run dev
# → Running on http://localhost:3001

# Terminal 2: Start frontend
cd frontend
npm run dev
# → Running on http://localhost:5173
```

### 4️⃣ Access the App
Open your browser to **http://localhost:5173** and log in with an authorized A-number.

---

## 📊 What Gets Logged?

### Event Types
The system tracks **16 different event types** to capture comprehensive usage patterns:

| Category | Event Type | What It Captures |
|----------|-----------|------------------|
| **Input Behavior** | `typing` | Keystroke count, typing duration, prompt length |
| | `paste` | Pasted text length, source detection |
| | `copy` | Text copied from prompt field |
| | `cut` | Text cut from prompt field |
| | `promptFocus` | When user clicks into prompt field |
| | `promptBlur` | When user leaves prompt field |
| | `promptClear` | When prompt is cleared or reset |
| **AI Interaction** | `promptSubmit` | Full question text, timestamp |
| | `responseView` | AI response length, generation time, token usage |
| **Response Engagement** | `responseScroll` | Scroll position, percentage read |
| | `responseCopy` | Text copied from AI response (what students find useful) |
| **Context Management** | `contextReset` | When conversation history is cleared |
| **Session Tracking** | `sessionStart` | Login time, browser info |
| | `sessionEnd` | Logout time, total session duration |
| | `idleStart` | After 60 seconds of inactivity |
| | `idleEnd` | When user returns from idle |

### Example Event Data

**Typing Event:**
```json
{
  "eventType": "typing",
  "data": {
    "inputLength": 42,
    "timeInField": 5234,
    "keystrokeCount": 15
  }
}
```

**Response Copy Event:**
```json
{
  "eventType": "responseCopy",
  "data": {
    "copiedLength": 87,
    "totalResponseLength": 450,
    "copiedText": "def bubble_sort(arr):\n    for i in range(len(arr))...",
    "timestamp": "2025-10-22T01:23:45.678Z"
  }
}
```

### Database Storage
All data is stored in three tables:
- **`users`** - Authentication, request counts, login history
- **`interactions`** - Full prompt-response pairs with conversation context
- **`events`** - Granular interaction tracking (typing, copying, scrolling, etc.)

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite (fast dev server)
- **Styling**: Tailwind CSS
- **Markdown**: react-markdown (for AI response formatting)

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js + TypeScript
- **AI Integration**: Azure OpenAI (GPT-4.1) via `openai` package
- **Database**: SQLite (local) / Cosmos DB (production)

### Key Features
- ✅ Real-time event tracking
- ✅ Session management (UUID-based)
- ✅ Rate limiting (configurable per user)
- ✅ Conversation context (maintains last 5 messages)
- ✅ Markdown code formatting in responses
- ✅ Idle detection (60-second threshold)

---

## 📂 Project Structure

```
ai-in-ed/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── database/       # SQLite adapter (Cosmos DB ready)
│   │   ├── services/       # Azure OpenAI integration
│   │   ├── types/          # TypeScript interfaces
│   │   └── server.ts       # Main application
│   ├── data/               # SQLite database (auto-created)
│   ├── .env.example        # Environment template
│   └── package.json        # Backend dependencies
│
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Login, ChatInterface, etc.
│   │   ├── services/       # API client
│   │   └── App.tsx         # Main app component
│   └── package.json        # Frontend dependencies
│
├── ARCHITECTURE.md         # Detailed technical documentation
└── README.md              # This file
```

---

## 🔒 Security & Privacy

### Authentication
- **A-Number Whitelist**: Only pre-approved students can access
- **No Passwords**: Simplified for research environment
- **Session Tracking**: Each login gets a unique session ID

### Data Privacy
⚠️ **Important**: All user interactions are logged for research purposes
- Full prompts and AI responses stored
- Typing patterns, copy-paste behavior tracked
- Users should be informed via consent form

### Environment Security
✅ **Protected**:
- API keys stored in `.env` files (never committed)
- `.gitignore` configured to exclude credentials
- CORS restricted to frontend URL


### Data Export
To analyze your data:
```bash
# SQLite database location
backend/data/ai-usage-tracking.db

# Query example (using sqlite3 CLI)
sqlite3 backend/data/ai-usage-tracking.db
> SELECT eventType, COUNT(*) FROM events GROUP BY eventType;
> SELECT userID, COUNT(*) FROM interactions GROUP BY userID;
```

> 📝 **Note**: Admin dashboard for data visualization is planned for future release

---

## 🚢 Deployment

### Local Development
- **Backend**: `npm run dev` (port 3001)
- **Frontend**: `npm run dev` (port 5173)
- **Database**: SQLite (auto-created at `backend/data/`)

### Production (Azure)
1. **Backend**: Azure App Service (Node.js)
2. **Frontend**: Azure Static Web Apps
3. **Database**: Azure Cosmos DB (NoSQL)
4. **AI**: Azure OpenAI Service

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for detailed deployment instructions.

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 3001 is in use
lsof -i :3001

# Verify .env file exists
ls backend/.env

# Check dependencies
cd backend && npm install
```

### Frontend can't connect to backend
```bash
# Check backend is running
curl http://localhost:3001/health

# Verify API URL (in frontend/.env if using custom)
VITE_API_URL=http://localhost:3001
```

### "Unauthorized user" error
- Ensure A-number is in `AUTHORIZED_USERIDS` (backend/.env)
- Format: `A01234567,A01234568` (comma-separated, no spaces)

### Azure OpenAI errors
- Verify credentials in `backend/.env`
- Check deployment name matches `AZURE_OPENAI_MODEL`
- Ensure API version is supported: `2024-08-01-preview`

---

## 📝 Configuration Reference

### Backend Environment Variables
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3001` | No |
| `AZURE_OPENAI_KEY` | Azure OpenAI API key | - | **Yes** |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL | - | **Yes** |
| `AZURE_OPENAI_MODEL` | Deployment/model name | `gpt-4.1` | No |
| `MAX_REQUESTS_PER_USER` | Request limit per student | `50` | No |
| `AUTHORIZED_USERIDS` | Comma-separated A-numbers | - | **Yes** |
| `DB_TYPE` | `sqlite` or `cosmosdb` | `sqlite` | No |
| `SQLITE_DB_PATH` | SQLite file path | `./data/ai-usage-tracking.db` | No |

### Frontend Environment Variables (Optional)
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3001` |


