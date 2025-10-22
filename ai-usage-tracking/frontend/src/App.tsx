import { useState } from 'react';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
  const [userID, setUserID] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [maxCap, setMaxCap] = useState(50);

  const handleLogin = (userId: string, count: number, max: number) => {
    setUserID(userId);
    setRequestCount(count);
    setMaxCap(max);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUserID('');
    setIsAuthenticated(false);
    setRequestCount(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {!isAuthenticated ? (
          <Login onLogin={handleLogin} />
        ) : (
          <ChatInterface
            userID={userID}
            requestCount={requestCount}
            maxCap={maxCap}
            onRequestCountUpdate={setRequestCount}
            onLogout={handleLogout}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
