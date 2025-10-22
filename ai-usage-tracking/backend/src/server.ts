import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDatabase } from './database';
import { getAIService } from './services/ai-service';
import { ConversationMessage } from './types';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory conversation storage (will be reset on server restart)
const conversations: Record<string, ConversationMessage[]> = {};

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Helper function to check if user is authorized
function isAuthorized(userId: string): boolean {
  const normalizedUserId = userId.trim().toLowerCase();
  const authorizedIds = (process.env.AUTHORIZED_USERIDS || '')
    .split(',')
    .map(id => id.trim().toLowerCase());
  return authorizedIds.includes(normalizedUserId);
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Check user authorization and request count
app.post('/api/check-user', async (req: Request, res: Response) => {
  try {
    const { userID } = req.body;

    if (!userID) {
      return res.status(400).json({ error: 'UserID is required' });
    }

    if (!isAuthorized(userID)) {
      return res.status(401).json({ error: 'Unauthorized UserID' });
    }

    const db = getDatabase();
    let user = await db.getUser(userID);

    // Create user if doesn't exist
    if (!user) {
      user = await db.createUser(userID);
    }

    const maxCap = parseInt(process.env.MAX_REQUESTS_PER_USER || '50');

    if (user.requestCount >= maxCap) {
      return res.status(403).json({
        error: 'Maximum request limit reached',
        requestCount: user.requestCount,
        maxCap
      });
    }

    res.json({
      authorized: true,
      requestCount: user.requestCount,
      maxCap
    });
  } catch (error) {
    console.error('Error in /api/check-user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit prompt and get AI response
app.post('/api/submit', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { prompt, userID, sessionId } = req.body;

    if (!prompt || !userID) {
      return res.status(400).json({ error: 'Prompt and userID are required' });
    }

    if (!isAuthorized(userID)) {
      return res.status(401).json({ error: 'Unauthorized UserID' });
    }

    const db = getDatabase();
    const user = await db.getUser(userID);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const maxCap = parseInt(process.env.MAX_REQUESTS_PER_USER || '50');
    
    if (user.requestCount >= maxCap) {
      return res.status(403).json({ error: 'Maximum request limit reached' });
    }

    // Initialize conversation history for user if it doesn't exist
    if (!conversations[userID]) {
      conversations[userID] = [];
    }

    // Add user's prompt to conversation history
    conversations[userID].push({ role: 'user', content: prompt });

    // Keep only last 5 messages to manage context
    if (conversations[userID].length > 5) {
      conversations[userID] = conversations[userID].slice(-5);
    }

    // Get AI response
    const aiService = getAIService();
    const { response: aiResponse, tokenCount } = await aiService.generateResponse(
      conversations[userID]
    );

    // Add AI's response to conversation history
    conversations[userID].push({ role: 'assistant', content: aiResponse });

    // Increment request count
    const newRequestCount = await db.incrementRequestCount(userID);

    const responseTime = Date.now() - startTime;

    // Log the interaction
    await db.createInteraction({
      userId: userID,
      sessionId: sessionId || uuidv4(),
      type: 'prompt-response',
      prompt,
      response: aiResponse,
      model: aiService.getModel(),
      timestamp: new Date().toISOString(),
      conversationHistory: [...conversations[userID]],
      metadata: {
        responseTime,
        tokenCount
      }
    });

    console.log(`UserID: ${userID}, Response generated in ${responseTime}ms`);

    res.json({
      response: aiResponse,
      newRequestCount,
      maxCap,
      tokenCount
    });
  } catch (error) {
    console.error('Error in /api/submit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset conversation context
app.post('/api/reset', async (req: Request, res: Response) => {
  try {
    const { userID, sessionId } = req.body;

    if (!userID) {
      return res.status(400).json({ error: 'UserID is required' });
    }

    if (!isAuthorized(userID)) {
      return res.status(401).json({ error: 'Unauthorized UserID' });
    }

    // Reset conversation history
    conversations[userID] = [];

    // Log the reset event
    const db = getDatabase();
    await db.createEvent({
      userId: userID,
      sessionId: sessionId || uuidv4(),
      eventType: 'contextReset',
      timestamp: new Date().toISOString(),
      data: {}
    });

    res.json({ message: 'Conversation context reset' });
  } catch (error) {
    console.error('Error in /api/reset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log user events (typing, pasting, etc.)
app.post('/api/log-event', async (req: Request, res: Response) => {
  try {
    const { userID, sessionId, eventType, data } = req.body;

    if (!userID || !eventType) {
      return res.status(400).json({ error: 'UserID and eventType are required' });
    }

    const db = getDatabase();
    await db.createEvent({
      userId: userID,
      sessionId: sessionId || uuidv4(),
      eventType,
      timestamp: new Date().toISOString(),
      data: data || {}
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error in /api/log-event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  const { closeDatabase } = await import('./database');
  await closeDatabase();
  process.exit(0);
});
