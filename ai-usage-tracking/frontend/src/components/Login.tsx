import { useState } from 'react';
import { apiService } from '../services/api';

interface LoginProps {
  onLogin: (userId: string, requestCount: number, maxCap: number) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId.trim()) {
      setError('Please enter your A-number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiService.checkUser(userId);
      onLogin(userId, response.requestCount, response.maxCap);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Unauthorized A-number. Please enter a valid A-number.');
      } else if (err.response?.status === 403) {
        setError('You have reached your maximum request limit.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome</h2>
          <p className="text-gray-600">
            Enter your A-number to access your AI assistant for computer science assignments.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="anumber" className="block text-sm font-medium text-gray-700 mb-2">
              A-Number
            </label>
            <input
              id="anumber"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="A01234567"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-usu-blue focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-usu-blue text-white py-3 px-4 rounded-lg font-semibold hover:bg-usu-navy transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Enter'}
          </button>
        </form>

        <div className="mt-6 text-xs text-gray-500 text-center">
          This is a research tool. Your interactions are logged for academic purposes.
        </div>
      </div>
    </div>
  );
}
