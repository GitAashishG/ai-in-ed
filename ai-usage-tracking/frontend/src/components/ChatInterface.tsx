import { useState, useRef, useEffect } from 'react';
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
  const lastActivityRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<number>(Date.now());

  // Log session start on mount
  useEffect(() => {
    apiService.logEvent({
      userID,
      sessionId: apiService.getSessionId(),
      eventType: 'sessionStart',
      data: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      }
    });

    // Track session end on unmount
    return () => {
      const sessionDuration = Date.now() - sessionStartRef.current;
      apiService.logEvent({
        userID,
        sessionId: apiService.getSessionId(),
        eventType: 'sessionEnd',
        data: {
          sessionDuration,
          timestamp: new Date().toISOString()
        }
      });
    };
  }, [userID]);

  // Idle detection
  useEffect(() => {
    const IDLE_THRESHOLD = 60000; // 60 seconds of inactivity
    let isIdle = false;

    const resetIdleTimer = () => {
      lastActivityRef.current = Date.now();
      
      if (isIdle) {
        // User became active again
        isIdle = false;
        apiService.logEvent({
          userID,
          sessionId: apiService.getSessionId(),
          eventType: 'idleEnd',
          data: {
            timestamp: new Date().toISOString()
          }
        });
      }

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      idleTimerRef.current = setTimeout(() => {
        if (!isIdle) {
          isIdle = true;
          apiService.logEvent({
            userID,
            sessionId: apiService.getSessionId(),
            eventType: 'idleStart',
            data: {
              timestamp: new Date().toISOString(),
              idleThreshold: IDLE_THRESHOLD
            }
          });
        }
      }, IDLE_THRESHOLD);
    };

    // Track various activity events
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, resetIdleTimer);
    });

    // Initial timer
    resetIdleTimer();

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetIdleTimer);
      });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [userID]);

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
        source: 'clipboard',
        previousLength: prompt.length
      }
    });
  };

  const handleCopy = (_e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const selection = window.getSelection()?.toString() || '';
    
    apiService.logEvent({
      userID,
      sessionId: apiService.getSessionId(),
      eventType: 'copy',
      data: {
        copiedLength: selection.length,
        copiedFromPrompt: true,
        totalPromptLength: prompt.length,
        timestamp: new Date().toISOString()
      }
    });
  };

  const handleCut = (_e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const selection = window.getSelection()?.toString() || '';
    
    apiService.logEvent({
      userID,
      sessionId: apiService.getSessionId(),
      eventType: 'cut',
      data: {
        cutLength: selection.length,
        remainingLength: prompt.length - selection.length,
        timestamp: new Date().toISOString()
      }
    });
  };

  const handlePromptFocus = () => {
    apiService.logEvent({
      userID,
      sessionId: apiService.getSessionId(),
      eventType: 'promptFocus',
      data: {
        currentLength: prompt.length,
        timestamp: new Date().toISOString()
      }
    });
  };

  const handlePromptBlur = () => {
    apiService.logEvent({
      userID,
      sessionId: apiService.getSessionId(),
      eventType: 'promptBlur',
      data: {
        finalLength: prompt.length,
        timestamp: new Date().toISOString()
      }
    });
  };

  const handleResponseScroll = () => {
    if (responseRef.current) {
      const element = responseRef.current;
      const scrollPercentage = (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;
      
      apiService.logEvent({
        userID,
        sessionId: apiService.getSessionId(),
        eventType: 'responseScroll',
        data: {
          scrollPercentage: Math.round(scrollPercentage) || 0,
          scrollTop: element.scrollTop,
          scrollHeight: element.scrollHeight,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  const handleResponseCopy = () => {
    const selection = window.getSelection()?.toString() || '';
    if (selection.length > 0) {
      apiService.logEvent({
        userID,
        sessionId: apiService.getSessionId(),
        eventType: 'responseCopy',
        data: {
          copiedLength: selection.length,
          totalResponseLength: response.length,
          copiedText: selection.substring(0, 200), // First 200 chars for context
          timestamp: new Date().toISOString()
        }
      });
    }
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
      const previousPromptLength = prompt.length;
      const previousResponseLength = response.length;
      
      await apiService.resetContext(userID);
      
      // Log context reset
      await apiService.logEvent({
        userID,
        sessionId: apiService.getSessionId(),
        eventType: 'contextReset',
        data: {
          previousPromptLength,
          previousResponseLength,
          timestamp: new Date().toISOString()
        }
      });
      
      // If clearing prompt field
      if (previousPromptLength > 0) {
        await apiService.logEvent({
          userID,
          sessionId: apiService.getSessionId(),
          eventType: 'promptClear',
          data: {
            clearedLength: previousPromptLength,
            method: 'resetButton',
            timestamp: new Date().toISOString()
          }
        });
      }
      
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
          onCopy={handleCopy}
          onCut={handleCut}
          onFocus={handlePromptFocus}
          onBlur={handlePromptBlur}
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
            onScroll={handleResponseScroll}
            onCopy={handleResponseCopy}
            className="prose prose-sm max-w-none prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-code:text-pink-600 max-h-96 overflow-y-auto"
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
