import { useState, useRef } from 'react';
import { apiService } from '../services/api';
import ReactMarkdown from 'react-markdown';

interface ChatInterfaceProps {
  userID: string;
  requestCount: number;
  maxCap: number;
  onRequestCountUpdate: (count: number) => void;
  onLogout: () => void;
}

export default function ChatInterface({
  userID,
  requestCount,
  maxCap,
  onRequestCountUpdate,
  onLogout
}: ChatInterfaceProps) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingStartTimeRef = useRef<number>(0);
  const keystrokeCountRef = useRef<number>(0);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setPrompt(newValue);
    
    // Track typing
    if (typingStartTimeRef.current === 0) {
      typingStartTimeRef.current = Date.now();
    }
    keystrokeCountRef.current++;

    // Debounce logging
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    
    typingTimerRef.current = setTimeout(() => {
      if (typingStartTimeRef.current > 0) {
        const timeInField = Date.now() - typingStartTimeRef.current;
        apiService.logEvent({
          userID,
          sessionId: apiService.getSessionId(),
          eventType: 'typing',
          data: {
            inputLength: newValue.length,
            timeInField,
            keystrokeCount: keystrokeCountRef.current
          }
        });
        typingStartTimeRef.current = 0;
        keystrokeCountRef.current = 0;
      }
    }, 2000);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    
    apiService.logEvent({
      userID,
      sessionId: apiService.getSessionId(),
      eventType: 'paste',
      data: {
        pastedLength: pastedText.length,
        source: 'clipboard'
      }
    });
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError('');

    const submitTime = Date.now();

    try {
      // Log prompt submit event
      await apiService.logEvent({
        userID,
        sessionId: apiService.getSessionId(),
        eventType: 'promptSubmit',
        data: {
          promptText: prompt,
          promptLength: prompt.length,
          timestamp: new Date().toISOString()
        }
      });

      const result = await apiService.submitPrompt(userID, prompt);
      setResponse(result.response);
      onRequestCountUpdate(result.newRequestCount);

      // Track response view
      apiService.logEvent({
        userID,
        sessionId: apiService.getSessionId(),
        eventType: 'responseView',
        data: {
          responseLength: result.response.length,
          responseTime: Date.now() - submitTime,
          tokenCount: result.tokenCount
        }
      });
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You have reached your maximum request limit.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await apiService.resetContext(userID);
      setPrompt('');
      setResponse('');
      setError('');
    } catch (err) {
      console.error('Failed to reset context:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-6">
      {/* User Info Bar */}
      <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
        <div>
          <span className="text-sm font-medium text-gray-700">User ID: </span>
          <span className="text-sm font-bold text-usu-blue">{userID}</span>
          <span className="mx-3 text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">Requests: </span>
          <span className="text-sm font-bold text-usu-blue">
            {requestCount}/{maxCap}
          </span>
        </div>
        <button
          onClick={onLogout}
          className="text-sm text-gray-600 hover:text-gray-800 transition"
        >
          Logout
        </button>
      </div>

      {/* Input Area */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
          Enter your question:
        </label>
        <textarea
          ref={textareaRef}
          id="prompt"
          value={prompt}
          onChange={handlePromptChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyPress}
          placeholder="How do I sort a list in Python?"
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-usu-blue focus:border-transparent outline-none transition resize-none"
          disabled={loading}
        />
        
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading || !prompt.trim()}
            className="flex-1 bg-usu-blue text-white py-3 px-6 rounded-lg font-semibold hover:bg-usu-navy transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Getting help...' : 'Submit and Get Help'}
          </button>
          
          <button
            onClick={handleReset}
            disabled={loading}
            className="bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
          >
            Reset Context
          </button>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Tip: Press Cmd/Ctrl + Enter to submit
        </p>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Response Area */}
      {response && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Response:</h3>
          <div
            ref={responseRef}
            className="prose prose-sm max-w-none prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-code:text-pink-600"
          >
            <ReactMarkdown>
              {response}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Welcome Message */}
      {!response && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-gray-700">
            👋 Welcome! Ask me any question about computer science, programming, or coding assignments.
          </p>
        </div>
      )}
    </div>
  );
}
