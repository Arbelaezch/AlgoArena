import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/auth/useAuth';
import { useNavigate } from 'react-router';

interface PasswordRequirement {
  id: string;
  text: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { id: 'length', text: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', text: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', text: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'number', text: 'One number', test: (p) => /\d/.test(p) },
  { id: 'special', text: 'One special character', test: (p) => /[@$!%*?&]/.test(p) },
];

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordReq, setShowPasswordReq] = useState(false);
  const [passwordReqs, setPasswordReqs] = useState<Record<string, boolean>>({});

  const { login, register, isLoading, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Validate password requirements
  useEffect(() => {
    const newReqs: Record<string, boolean> = {};
    passwordRequirements.forEach(req => {
      newReqs[req.id] = req.test(password);
    });
    setPasswordReqs(newReqs);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isLogin) {
        await login({ email, password });
      } else {
        // Validate password requirements for registration
        const allReqsMet = passwordRequirements.every(req => req.test(password));
        if (!allReqsMet) {
          throw new Error('Please meet all password requirements');
        }
        await register({ email, password });
      }
      // Navigation will happen automatically via useEffect when isAuthenticated changes
    } catch (err) {
      // Error is handled by the auth hook
      console.log(err);
    }
  };

  const switchTab = (tab: 'login' | 'register') => {
    setIsLogin(tab === 'login');
    setEmail('');
    setUsername('');
    setPassword('');
    setShowPasswordReq(false);
    clearError();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 flex items-center justify-center p-5">
      <div className="bg-white p-12 rounded-3xl shadow-2xl w-full max-width-md relative overflow-hidden">
        {/* Top gradient border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">AlgoArena</h1>
          <p className="text-gray-600 text-sm">Your algorithmic trading playground</p>
        </div>

        {/* Tab switcher */}
        <div className="flex mb-8 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => switchTab('login')}
            className={`flex-1 py-3 text-center font-medium rounded-lg transition-all duration-300 ${
              isLogin
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'bg-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => switchTab('register')}
            className={`flex-1 py-3 text-center font-medium rounded-lg transition-all duration-300 ${
              !isLogin
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'bg-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email field */}
          <div>
            <label className="block mb-2 text-gray-800 font-medium text-sm">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="Enter your email"
              required
            />
          </div>

          {/* Username field (register only) */}
          {!isLogin && (
            <div>
              <label className="block mb-2 text-gray-800 font-medium text-sm">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="Enter your username"
                pattern="^[a-zA-Z0-9_]+$"
                minLength={3}
                maxLength={30}
                required
              />
            </div>
          )}

          {/* Password field */}
          <div>
            <label className="block mb-2 text-gray-800 font-medium text-sm">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => !isLogin && setShowPasswordReq(true)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="Enter your password"
              required
            />
            
            {/* Password requirements (register only) */}
            {!isLogin && showPasswordReq && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-2 font-medium">Password requirements:</p>
                {passwordRequirements.map((req) => (
                  <div
                    key={req.id}
                    className={`text-xs mb-1 transition-colors duration-300 ${
                      passwordReqs[req.id] ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    • {req.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl text-base transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}