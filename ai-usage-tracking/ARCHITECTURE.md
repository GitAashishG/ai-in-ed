# AI Usage Tracking System - Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [System Components](#system-components)
5. [Database Design](#database-design)
6. [API Endpoints](#api-endpoints)
7. [Event Tracking System](#event-tracking-system)
8. [Authentication & Authorization](#authentication--authorization)
9. [Data Flow](#data-flow)
10. [Deployment Architecture](#deployment-architecture)
11. [Security Considerations](#security-considerations)

---

## System Overview

The AI Usage Tracking System is a full-stack web application designed for educational research. It serves as an intelligent wrapper around Azure OpenAI, enabling researchers to study how computer science students interact with AI assistants when solving coding problems.

### Design Goals
- **Comprehensive Logging**: Track every user interaction (typing, pasting, copying, scrolling, focus changes)
- **Research-Ready Data**: Store structured data for statistical analysis
- **Minimal Friction**: Simple authentication (A-number only)
- **Rate Limiting**: Configurable request caps per user
- **Context Awareness**: Maintain conversation history for better AI responses
- **Scalable Architecture**: SQLite for local dev, Cosmos DB for production

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         React 18 + TypeScript + Vite                   │    │
│  │                                                         │    │
│  │  Components:                                           │    │
│  │  • Login (A-number authentication)                     │    │
│  │  • ChatInterface (main interaction)                    │    │
│  │  • Header/Footer (branding)                            │    │
│  │                                                         │    │
│  │  Services:                                             │    │
│  │  • APIService (HTTP client with event tracking)       │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/REST (port 5173 → 3001)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Server (Node.js)                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         Express.js + TypeScript                        │    │
│  │                                                         │    │
│  │  API Routes:                                           │    │
│  │  • /api/check-user    (authentication)                 │    │
│  │  • /api/submit        (prompt → AI response)           │    │
│  │  • /api/reset         (clear conversation)             │    │
│  │  • /api/log-event     (track interactions)             │    │
│  │  • /health            (health check)                   │    │
│  │                                                         │    │
│  │  Services:                                             │    │
│  │  • AIService (Azure OpenAI integration)                │    │
│  │  • Database Adapter (abstraction layer)                │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────────────┬──────────────────────┬───────────────────────┘
                   │                      │
                   ▼                      ▼
      ┌─────────────────────┐  ┌──────────────────────┐
      │   Azure OpenAI      │  │  Database Layer      │
      │                     │  │                      │
      │  Model: GPT-4.1     │  │  Local: SQLite       │
      │  Max Tokens: 3000   │  │  Prod: Cosmos DB     │
      │  Context: Last 5    │  │                      │
      │  messages           │  │  Tables:             │
      └─────────────────────┘  │  • users             │
                               │  • interactions      │
                               │  • events            │
                               └──────────────────────┘
```

---

## Technology Stack

### Frontend
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Framework** | React | 18.3.1 | UI library |
| **Language** | TypeScript | 5.6.2 | Type safety |
| **Build Tool** | Vite | 5.4.21 | Fast dev server & bundler |
| **Styling** | Tailwind CSS | 3.4.16 | Utility-first CSS |
| **HTTP Client** | Axios | 1.7.8 | API requests |
| **Markdown** | react-markdown | 9.0.3 | Render AI responses |

### Backend
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Runtime** | Node.js | 20+ LTS | JavaScript runtime |
| **Framework** | Express.js | 4.19.2 | Web server |
| **Language** | TypeScript | 5.6.3 | Type safety |
| **Dev Runner** | tsx | 4.19.1 | TypeScript execution |
| **Database (Local)** | better-sqlite3 | 11.5.0 | SQLite driver |
| **AI Integration** | openai | 4.104.0 | Azure OpenAI client |
| **CORS** | cors | 2.8.5 | Cross-origin requests |
| **Environment** | dotenv | 16.4.5 | Env variable management |
| **UUID** | uuid | 10.0.0 | Session ID generation |

### Database
- **Local Development**: SQLite 3 (file-based, no setup required)
- **Production**: Azure Cosmos DB (NoSQL, globally distributed)

### AI Service
- **Provider**: Azure OpenAI Service
- **Model**: GPT-4.1 (configurable via `AZURE_OPENAI_MODEL`)
- **API Version**: 2024-08-01-preview

---

## System Components

### Frontend Architecture

#### 1. **App.tsx** (Main Application)
```typescript
- Manages global state (user authentication)
- Routes between Login and ChatInterface
- Session persistence via localStorage
```

#### 2. **Login Component**
```typescript
Interface: LoginProps
  - onLogin: (userID: string, requestCount: number, maxCap: number) => void

Features:
  - A-number validation (regex: /^A\d{8}$/)
  - Backend authentication via /api/check-user
  - Error handling for unauthorized users
  - Loading states
```

#### 3. **ChatInterface Component**
```typescript
Interface: ChatInterfaceProps
  - userID: string
  - requestCount: number
  - maxCap: number
  - onRequestCountUpdate: (count: number) => void
  - onLogout: () => void

Features:
  - Prompt input with event tracking
  - AI response display (Markdown formatted)
  - Request count display
  - Context reset functionality
  - Comprehensive event logging (see Event Tracking System)
```

#### 4. **APIService** (API Client)
```typescript
Class: APIService
  - baseURL: string (from VITE_API_URL or localhost:3001)
  - sessionId: string (UUID v4, persists per browser session)

Methods:
  - checkUser(userID: string): Promise<CheckUserResponse>
  - submitPrompt(userID: string, prompt: string): Promise<SubmitResponse>
  - resetContext(userID: string): Promise<void>
  - logEvent(eventData: LogEventData): Promise<void>
  - getSessionId(): string
```

### Backend Architecture

#### 1. **server.ts** (Express Server)
```typescript
Configuration:
  - Port: process.env.PORT || 3001
  - CORS: Configured for frontend origin
  - JSON body parsing
  - Error handling middleware

Endpoints: (see API Endpoints section)
```

#### 2. **AIService** (Azure OpenAI Integration)
```typescript
Class: AIService
  - client: AzureOpenAI
  - deploymentName: string
  - conversationHistory: Map<userID, Message[]>

Methods:
  - generateResponse(userID: string, prompt: string): Promise<AIResponse>
    • Maintains last 5 messages per user
    • System prompt: "You are a helpful assistant..."
    • Max tokens: 3000
    • Returns: response text + token usage
  
  - resetContext(userID: string): void
    • Clears conversation history for user
```

#### 3. **Database Adapter Pattern**
```typescript
Interface: DatabaseAdapter
  - createUser(userID: string, maxCap: number): Promise<User>
  - getUser(userID: string): Promise<User | null>
  - incrementRequestCount(userID: string): Promise<number>
  - createInteraction(data: InteractionData): Promise<void>
  - createEvent(data: EventData): Promise<void>

Implementations:
  - SQLiteAdapter (current)
  - CosmosDBAdapter (future - same interface)
```

#### 4. **SQLiteAdapter**
```typescript
Database: better-sqlite3
Location: ./data/ai-usage-tracking.db

Initialization:
  - Creates tables if not exist (users, interactions, events)
  - WAL mode for better concurrency
  - Foreign key constraints enabled

Methods:
  - All methods from DatabaseAdapter interface
  - Synchronous operations (better-sqlite3 is sync)
  - Prepared statements for performance
```

---

## Database Design

### Schema Overview

```sql
-- Users table (authentication & rate limiting)
CREATE TABLE users (
    userID TEXT PRIMARY KEY,
    requestCount INTEGER DEFAULT 0,
    maxCap INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    lastLoginAt TEXT NOT NULL
);

-- Interactions table (prompt-response pairs with context)
CREATE TABLE interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userID TEXT NOT NULL,
    sessionId TEXT NOT NULL,
    promptText TEXT NOT NULL,
    responseText TEXT NOT NULL,
    tokenCount INTEGER,
    conversationHistory TEXT,  -- JSON: last 5 messages
    timestamp TEXT NOT NULL,
    FOREIGN KEY (userID) REFERENCES users(userID)
);

-- Events table (granular interaction tracking)
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userID TEXT NOT NULL,
    sessionId TEXT NOT NULL,
    eventType TEXT NOT NULL,
    data TEXT NOT NULL,  -- JSON: event-specific data
    timestamp TEXT NOT NULL,
    FOREIGN KEY (userID) REFERENCES users(userID)
);

-- Indexes for performance
CREATE INDEX idx_interactions_userID ON interactions(userID);
CREATE INDEX idx_interactions_sessionId ON interactions(sessionId);
CREATE INDEX idx_events_userID ON events(userID);
CREATE INDEX idx_events_sessionId ON events(sessionId);
CREATE INDEX idx_events_eventType ON events(eventType);
```

### Data Models

#### User Model
```typescript
interface User {
  userID: string;          // A-number (e.g., "A01234567")
  requestCount: number;    // Current request count
  maxCap: number;          // Maximum allowed requests
  createdAt: string;       // ISO 8601 timestamp
  lastLoginAt: string;     // ISO 8601 timestamp
}
```

#### Interaction Model
```typescript
interface Interaction {
  id?: number;
  userID: string;
  sessionId: string;
  promptText: string;
  responseText: string;
  tokenCount?: number;
  conversationHistory: string;  // JSON stringified Message[]
  timestamp: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```

#### Event Model
```typescript
interface Event {
  id?: number;
  userID: string;
  sessionId: string;
  eventType: EventType;
  data: string;  // JSON stringified object
  timestamp: string;
}

type EventType = 
  | 'typing' | 'paste' | 'copy' | 'cut'
  | 'promptFocus' | 'promptBlur'
  | 'promptSubmit' | 'responseView'
  | 'responseScroll' | 'responseCopy'
  | 'promptClear' | 'contextReset'
  | 'sessionStart' | 'sessionEnd'
  | 'idleStart' | 'idleEnd';
```

---

## API Endpoints

### 1. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-22T01:23:45.678Z"
}
```

### 2. Check User (Authentication)
```http
POST /api/check-user
Content-Type: application/json

{
  "userID": "A01234567"
}
```

**Success Response (200):**
```json
{
  "authorized": true,
  "requestCount": 5,
  "maxCap": 50
}
```

**Unauthorized Response (401):**
```json
{
  "authorized": false,
  "message": "Unauthorized user"
}
```

**Logic:**
- Check if `userID` in `AUTHORIZED_USERIDS` (comma-separated env var)
- Create user in DB if first login (with maxCap from `MAX_REQUESTS_PER_USER`)
- Update `lastLoginAt` timestamp
- Return current request count and limit

### 3. Submit Prompt (AI Interaction)
```http
POST /api/submit
Content-Type: application/json

{
  "userID": "A01234567",
  "prompt": "How do I sort a list in Python?"
}
```

**Success Response (200):**
```json
{
  "response": "To sort a list in Python, you can use...",
  "newRequestCount": 6,
  "tokenCount": 234
}
```

**Rate Limit Response (403):**
```json
{
  "error": "Request limit reached"
}
```

**Server Error (500):**
```json
{
  "error": "Failed to process request"
}
```

**Logic:**
1. Get user from database
2. Check if `requestCount < maxCap`
3. Generate AI response via AIService (maintains context)
4. Increment request count
5. Store interaction in database (with full conversation history)
6. Return response + new count + token usage

### 4. Reset Context
```http
POST /api/reset
Content-Type: application/json

{
  "userID": "A01234567"
}
```

**Success Response (200):**
```json
{
  "message": "Context reset successfully"
}
```

**Logic:**
- Clear conversation history for user in AIService
- Does NOT reset request count (by design)

### 5. Log Event (Interaction Tracking)
```http
POST /api/log-event
Content-Type: application/json

{
  "userID": "A01234567",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "eventType": "typing",
  "data": {
    "inputLength": 42,
    "timeInField": 5234,
    "keystrokeCount": 15
  }
}
```

**Success Response (200):**
```json
{
  "message": "Event logged"
}
```

**Logic:**
- Validate event data
- Store event in events table (data as JSON string)
- Fire-and-forget (doesn't block user interaction)

---

## Event Tracking System

### Event Types & Data Captured

#### 1. **typing**
```typescript
{
  inputLength: number;      // Current prompt length
  timeInField: number;      // Milliseconds since typing started
  keystrokeCount: number;   // Total keystrokes in burst
}
```
- **Trigger**: Debounced 2 seconds after user stops typing
- **Purpose**: Understand typing patterns, prompt complexity

#### 2. **paste**
```typescript
{
  pastedLength: number;     // Length of pasted text
  source: 'clipboard';      // Always clipboard
  previousLength: number;   // Prompt length before paste
}
```
- **Trigger**: User pastes content (Ctrl+V or right-click)
- **Purpose**: Detect copy-paste behavior from external sources

#### 3. **copy**
```typescript
{
  copiedLength: number;     // Length of selected text
  copiedFromPrompt: true;   // Always true for this event
  totalPromptLength: number;// Full prompt length
  timestamp: string;        // ISO 8601
}
```
- **Trigger**: User copies from prompt textarea
- **Purpose**: Track what students copy from their own prompts

#### 4. **cut**
```typescript
{
  cutLength: number;        // Length of cut text
  remainingLength: number;  // Prompt length after cut
  timestamp: string;
}
```
- **Trigger**: User cuts text (Ctrl+X or right-click)
- **Purpose**: Understand prompt revision behavior

#### 5. **promptFocus**
```typescript
{
  currentLength: number;    // Prompt length when focused
  timestamp: string;
}
```
- **Trigger**: User clicks into prompt textarea
- **Purpose**: Track engagement with input field

#### 6. **promptBlur**
```typescript
{
  finalLength: number;      // Prompt length when leaving
  timestamp: string;
}
```
- **Trigger**: User leaves prompt textarea
- **Purpose**: Pair with focus for time-in-field analysis

#### 7. **promptSubmit**
```typescript
{
  promptText: string;       // Full prompt (for research)
  promptLength: number;
  timestamp: string;
}
```
- **Trigger**: User clicks Submit or presses Cmd/Ctrl+Enter
- **Purpose**: Record exact prompt sent to AI

#### 8. **responseView**
```typescript
{
  responseLength: number;   // AI response length
  responseTime: number;     // Milliseconds to generate
  tokenCount: number;       // Tokens used by AI
}
```
- **Trigger**: After successful AI response
- **Purpose**: Measure AI performance and response complexity

#### 9. **responseScroll**
```typescript
{
  scrollPercentage: number; // 0-100% scrolled
  scrollTop: number;        // Pixels from top
  scrollHeight: number;     // Total scrollable height
  timestamp: string;
}
```
- **Trigger**: User scrolls in response area
- **Purpose**: Understand reading behavior (skim vs. deep read)

#### 10. **responseCopy**
```typescript
{
  copiedLength: number;         // Length of selected text
  totalResponseLength: number;  // Full response length
  copiedText: string;           // First 200 chars of copied text
  timestamp: string;
}
```
- **Trigger**: User copies text from AI response
- **Purpose**: Identify most valuable AI output sections

#### 11. **promptClear**
```typescript
{
  clearedLength: number;    // Length of cleared text
  method: string;           // 'resetButton' or 'manual'
  timestamp: string;
}
```
- **Trigger**: User clears prompt field
- **Purpose**: Track prompt iteration behavior

#### 12. **contextReset**
```typescript
{
  previousPromptLength: number;
  previousResponseLength: number;
  timestamp: string;
}
```
- **Trigger**: User clicks "Reset Context" button
- **Purpose**: Understand when users want fresh conversations

#### 13. **sessionStart**
```typescript
{
  timestamp: string;
  userAgent: string;        // Browser info
}
```
- **Trigger**: Component mount (login)
- **Purpose**: Mark beginning of usage session

#### 14. **sessionEnd**
```typescript
{
  sessionDuration: number;  // Total milliseconds
  timestamp: string;
}
```
- **Trigger**: Component unmount (logout/close tab)
- **Purpose**: Calculate session length

#### 15. **idleStart**
```typescript
{
  timestamp: string;
  idleThreshold: number;    // 60000 ms (1 minute)
}
```
- **Trigger**: 60 seconds of no activity
- **Purpose**: Detect when user stops engaging

#### 16. **idleEnd**
```typescript
{
  timestamp: string;
}
```
- **Trigger**: User activity after idle
- **Purpose**: Calculate idle duration

### Event Tracking Implementation

**Frontend (ChatInterface.tsx):**
```typescript
// Debounced typing tracker
const handlePromptChange = (e) => {
  // ... update state ...
  
  // Start/reset timer
  if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  
  typingTimerRef.current = setTimeout(() => {
    apiService.logEvent({ userID, sessionId, eventType: 'typing', data });
  }, 2000);
};

// Immediate event trackers
<textarea
  onCopy={handleCopy}
  onCut={handleCut}
  onFocus={handlePromptFocus}
  onBlur={handlePromptBlur}
  onPaste={handlePaste}
/>

<div
  ref={responseRef}
  onScroll={handleResponseScroll}
  onCopy={handleResponseCopy}
/>
```

**Backend (server.ts):**
```typescript
app.post('/api/log-event', async (req, res) => {
  const { userID, sessionId, eventType, data } = req.body;
  
  await db.createEvent({
    userID,
    sessionId,
    eventType,
    data: JSON.stringify(data),
    timestamp: new Date().toISOString()
  });
  
  res.json({ message: 'Event logged' });
});
```

---

## Authentication & Authorization

### Design Philosophy
- **Minimal Friction**: No passwords (research environment with known users)
- **A-Number Based**: USU student IDs as unique identifiers
- **Whitelist Approach**: Only pre-approved users can access

### Implementation

**Environment Configuration:**
```env
AUTHORIZED_USERIDS=A01234567,A01234568,A01234569
```

**Validation Flow:**
1. User enters A-number (format: `A` + 8 digits)
2. Frontend validates regex: `/^A\d{8}$/`
3. Backend checks if userID in `AUTHORIZED_USERIDS`
4. If authorized:
   - Create user record if first login
   - Update `lastLoginAt`
   - Return current stats
5. If unauthorized:
   - Return 401 error
   - User cannot proceed

**Session Management:**
- Session ID: UUID v4 generated on login
- Stored in: Frontend localStorage (`sessionStorage` would be better for security)
- Used for: Linking all events in a single session
- Persists: Until browser closed or logout

### Security Considerations
- No sensitive PII stored (A-numbers are school-issued IDs)
- CORS restricted to frontend origin
- Rate limiting per user prevents abuse
- All interactions logged (users informed via disclaimer)

---

## Data Flow

### 1. User Login Flow
```
┌────────┐         ┌──────────┐         ┌─────────┐
│ User   │         │ Frontend │         │ Backend │
└───┬────┘         └─────┬────┘         └────┬────┘
    │                    │                   │
    │ Enter A-number     │                   │
    ├───────────────────>│                   │
    │                    │                   │
    │                    │ POST /api/check-user
    │                    ├──────────────────>│
    │                    │                   │
    │                    │   Validate userID │
    │                    │   Create/Update   │
    │                    │   user in DB      │
    │                    │                   │
    │                    │   { authorized,   │
    │                    │     requestCount, │
    │                    │<─  maxCap }       │
    │                    │                   │
    │   Show ChatInterface│                  │
    │<───────────────────┤                   │
    │                    │                   │
```

### 2. Prompt Submission Flow
```
┌────────┐         ┌──────────┐         ┌─────────┐         ┌─────────┐
│ User   │         │ Frontend │         │ Backend │         │ Azure   │
│        │         │          │         │         │         │ OpenAI  │
└───┬────┘         └─────┬────┘         └────┬────┘         └────┬────┘
    │                    │                   │                   │
    │ Type prompt        │                   │                   │
    ├───────────────────>│                   │                   │
    │                    │                   │                   │
    │                    │ logEvent('typing')│                   │
    │                    ├──────────────────>│                   │
    │                    │                   │                   │
    │ Click Submit       │                   │                   │
    ├───────────────────>│                   │                   │
    │                    │                   │                   │
    │                    │ logEvent('promptSubmit')              │
    │                    ├──────────────────>│                   │
    │                    │                   │                   │
    │                    │ POST /api/submit  │                   │
    │                    ├──────────────────>│                   │
    │                    │                   │                   │
    │                    │                   │ Check rate limit  │
    │                    │                   │ Get context       │
    │                    │                   │                   │
    │                    │                   │ Generate response │
    │                    │                   ├──────────────────>│
    │                    │                   │                   │
    │                    │                   │<── AI response ───┤
    │                    │                   │                   │
    │                    │                   │ Save interaction  │
    │                    │                   │ Increment count   │
    │                    │                   │                   │
    │                    │   { response,     │                   │
    │                    │<─   newCount,     │                   │
    │                    │     tokenCount }  │                   │
    │                    │                   │                   │
    │   Display response │                   │                   │
    │<───────────────────┤                   │                   │
    │                    │                   │                   │
    │                    │ logEvent('responseView')              │
    │                    ├──────────────────>│                   │
    │                    │                   │                   │
```

### 3. Event Logging Flow
```
User Action (copy, scroll, etc.)
         ↓
Frontend Event Handler
         ↓
apiService.logEvent({userID, sessionId, eventType, data})
         ↓
POST /api/log-event
         ↓
Backend validates & stores
         ↓
Database (events table)
```

---

## Deployment Architecture

### Local Development

**Setup:**
```bash
# Backend
cd backend
npm install
npm run dev          # tsx watch (hot reload)
# → http://localhost:3001

# Frontend
cd frontend
npm install
npm run dev          # Vite dev server
# → http://localhost:5173
```

**Database:**
- SQLite file: `backend/data/ai-usage-tracking.db`
- Auto-created on first run
- No migration needed

### Production Deployment (Azure)

**Recommended Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│              Azure Front Door (CDN)                      │
│              HTTPS Termination                           │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┴──────────────┐
         │                              │
         ▼                              ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Static Web App     │     │  App Service        │
│  (Frontend Build)   │     │  (Backend API)      │
│                     │     │                     │
│  - React SPA        │     │  - Node.js 20       │
│  - Vite build       │     │  - Express server   │
│  - Environment:     │     │  - Environment:     │
│    VITE_API_URL     │     │    All .env vars    │
└─────────────────────┘     └──────────┬──────────┘
                                       │
                         ┌─────────────┴──────────────┐
                         │                            │
                         ▼                            ▼
              ┌──────────────────┐      ┌───────────────────┐
              │  Cosmos DB       │      │  Azure OpenAI     │
              │  (NoSQL)         │      │  Service          │
              │                  │      │                   │
              │  - users         │      │  - GPT-4 model    │
              │  - interactions  │      │  - API endpoint   │
              │  - events        │      └───────────────────┘
              └──────────────────┘
```

**Docker Configuration (TODO):**
```dockerfile
# Backend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/server.js"]

# Frontend Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

**Environment Configuration:**
```bash
# Backend (Azure App Service)
az webapp config appsettings set \
  --name your-backend-app \
  --resource-group your-rg \
  --settings \
    DB_TYPE=cosmosdb \
    COSMOS_ENDPOINT=$COSMOS_ENDPOINT \
    COSMOS_KEY=$COSMOS_KEY \
    AZURE_OPENAI_KEY=$OPENAI_KEY \
    AZURE_OPENAI_ENDPOINT=$OPENAI_ENDPOINT \
    AUTHORIZED_USERIDS=$USER_LIST

# Frontend (Static Web App)
VITE_API_URL=https://your-backend.azurewebsites.net
```

---

## Security Considerations

### 1. Environment Variables
✅ **Current Protection:**
- `.env` files in `.gitignore`
- `.env.example` provided for setup
- Backend uses `dotenv` to load variables
- No credentials in code

⚠️ **Risks:**
- Root `.env` file exists (should be deleted)
- Frontend env vars visible in browser (use only non-sensitive config)

### 2. CORS Configuration
```typescript
// backend/src/server.ts
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

**Production:** Update `FRONTEND_URL` to actual domain

### 3. API Security
✅ **Implemented:**
- User authentication (A-number whitelist)
- Rate limiting (per-user request caps)
- Input validation (A-number regex)

❌ **Not Implemented (Future):**
- API key authentication
- Request throttling (rate limiting per IP)
- SQL injection protection (using parameterized queries, but could add ORM)

### 4. Data Privacy
⚠️ **User Awareness:**
- All interactions logged (full prompts, responses, events)
- Users informed via disclaimer
- A-numbers stored (not highly sensitive, but school-issued)

**GDPR Considerations (if applicable):**
- Right to erasure: Add endpoint to delete user data
- Data export: Add endpoint to export user's data
- Consent tracking: Log explicit consent in database

### 5. Azure OpenAI Key Security
✅ **Protected:**
- Stored in environment variables
- Never exposed to frontend
- Used only in backend server

⚠️ **Best Practice:**
- Use Azure Key Vault for production
- Rotate keys regularly
- Monitor API usage for anomalies

### 6. Package Security
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Use lock files (committed to git)
package-lock.json  ✅ SHOULD BE COMMITTED
```

---

## Future Enhancements

### Phase 1: Cosmos DB Migration
1. Implement `CosmosDBAdapter` (same interface as SQLiteAdapter)
2. Update environment configuration
3. Create migration script for existing SQLite data
4. Test data consistency

### Phase 2: Admin Dashboard
1. Create `/admin` route with authentication
2. Analytics views:
   - User engagement metrics
   - Event type distributions
   - AI usage patterns
   - Session duration statistics
3. Data export (CSV/JSON)
4. User management (add/remove authorized users)

### Phase 3: Enhanced Analytics
1. Real-time event streaming (SignalR)
2. Heatmaps of user interactions
3. Prompt similarity analysis
4. Response quality metrics
5. A/B testing framework (different AI models)

### Phase 4: Advanced Features
1. Multi-model support (GPT-4, Claude, Llama)
2. Code execution sandbox
3. Feedback collection (thumbs up/down)
4. Prompt templates
5. Collaboration features (shared sessions)

---

## Development Guidelines

### Code Style
- **TypeScript**: Strict mode enabled
- **Naming**: camelCase for variables, PascalCase for types
- **Async/Await**: Preferred over promises
- **Error Handling**: Try-catch blocks with proper logging

### Git Workflow
```bash
# Feature branch
git checkout -b feature/your-feature

# Commit format
git commit -m "feat: Add copy event tracking"
git commit -m "fix: Resolve CORS issue in production"
git commit -m "docs: Update API endpoint documentation"

# Before merge
npm run build    # Ensure builds succeed
npm test         # Run tests (when added)
```

### Testing Strategy (Future)
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Supertest for API endpoints
- **E2E Tests**: Playwright for full user flows
- **Load Tests**: k6 for stress testing

---

## Troubleshooting

### Common Issues

#### 1. **Frontend can't connect to backend**
```bash
# Check if backend is running
curl http://localhost:3001/health

# Check CORS configuration
# Ensure FRONTEND_URL in backend/.env matches frontend URL
```

#### 2. **Database locked error**
```bash
# SQLite issue - close other connections
# Or use WAL mode (already configured)
```

#### 3. **Azure OpenAI 401 Unauthorized**
```bash
# Verify credentials
echo $AZURE_OPENAI_KEY
echo $AZURE_OPENAI_ENDPOINT

# Check API version compatibility
# Current: 2024-08-01-preview
```

#### 4. **Build errors after dependency updates**
```bash
# Clear caches
rm -rf node_modules package-lock.json
npm install

# Frontend: Clear Vite cache
rm -rf .vite
npm run dev
```

---

## Conclusion

This architecture provides a solid foundation for educational research on AI usage patterns. The modular design allows for easy scaling from local SQLite to cloud Cosmos DB, comprehensive event tracking captures detailed user behavior, and the abstraction layers (DatabaseAdapter, APIService) enable future enhancements without major refactoring.

**Key Strengths:**
- ✅ Comprehensive event tracking (16 event types)
- ✅ Type-safe codebase (TypeScript throughout)
- ✅ Scalable database architecture (adapter pattern)
- ✅ Production-ready AI integration (Azure OpenAI)
- ✅ Research-focused data collection

**Next Steps:**
1. Deploy to Azure (Cosmos DB + App Services)
2. Build admin dashboard for data analysis
3. Add automated testing suite
4. Implement data export functionality
5. Gather initial research data and iterate

---

**Last Updated**: October 21, 2025  
**Version**: 1.0.0  
**Maintainers**: USU CS Research Team
