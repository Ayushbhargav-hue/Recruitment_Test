import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './PinVerification.css';

const PinVerification = () => {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [wsConnection, setWsConnection] = useState(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [showKeyboardHint, setShowKeyboardHint] = useState(true);
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const pinInputRef = useRef(null);

  // API base URL
  const API_BASE_URL = 'http://localhost:8000';
  const WS_BASE_URL = 'ws://localhost:8000';

  // Auto-hide keyboard hint after 5 seconds
  useEffect(() => {
    if (showKeyboardHint) {
      const timer = setTimeout(() => {
        setShowKeyboardHint(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showKeyboardHint]);

  // Function to setup WebSocket connection
  const setupWebSocket = (sessionId, token) => {
    if (!sessionId || wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `${WS_BASE_URL}/ws/${sessionId}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsWsConnected(true);
      wsRef.current = ws;
      
      ws.send(JSON.stringify({
        type: 'auth',
        token: token,
        session_id: sessionId
      }));
      
      toast.success('Real-time connection established');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket message:', data);
      
      switch(data.type) {
        case 'connection':
          toast.success('Connected to test server');
          break;
        case 'pong':
          console.log('Keep-alive received');
          break;
        case 'progress_saved':
          toast.success('Progress auto-saved');
          break;
        case 'test_completed':
          toast.success(`Test completed! Score: ${data.score}%`);
          break;
        case 'auto_save_confirmed':
          console.log('Auto-save confirmed');
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsWsConnected(false);
      toast.error('Connection error. Reconnecting...');
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsWsConnected(false);
      wsRef.current = null;
      
      setTimeout(() => {
        if (sessionId && token) {
          setupWebSocket(sessionId, token);
        }
      }, 5000);
    };
  };

  // Function to send WebSocket messages
  const sendWsMessage = (type, data = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }));
      return true;
    }
    return false;
  };

  // Function to refresh token
  const refreshAccessToken = async () => {
    const storedRefreshToken = localStorage.getItem('refresh_token');
    if (!storedRefreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: storedRefreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        setAccessToken(data.access_token);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    return false;
  };

  // Function to make authenticated API calls
  const authenticatedFetch = async (url, options = {}) => {
    let token = accessToken || localStorage.getItem('access_token');
    
    const makeRequest = async (currentToken) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          'Authorization': `Bearer ${currentToken}`,
        },
      });

      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          const newToken = localStorage.getItem('access_token');
          return fetch(url, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              ...options.headers,
              'Authorization': `Bearer ${newToken}`,
            },
          });
        } else {
          navigate('/');
          toast.error('Session expired. Please login again.');
          return null;
        }
      }
      return response;
    };

    return makeRequest(token);
  };

  // Enhanced keyboard handling
  useEffect(() => {
    const handleGlobalKeyPress = (e) => {
      // Only handle if not loading and input is not focused (or always handle)
      if (isLoading) return;
      
      // Handle number keys (0-9)
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        if (pin.length < 6) {
          handlePinInput(e.key);
        }
      }
      
      // Handle backspace
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
      
      // Handle enter key
      if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length === 6) {
          handleVerifyPin();
        } else if (pin.length > 0 && pin.length < 6) {
          toast.error(`Please enter ${6 - pin.length} more digit(s)`);
        }
      }
      
      // Handle delete key
      if (e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyPress);
    return () => window.removeEventListener('keydown', handleGlobalKeyPress);
  }, [pin, isLoading]);

  const handlePinInput = (value) => {
    if (pin.length < 6) {
      const newPin = pin + value;
      setPin(newPin);
      const input = document.querySelector('.pin-field');
      if (input) {
        input.classList.add('pulse');
        setTimeout(() => input.classList.remove('pulse'), 300);
      }
      
      // Auto-submit when 6 digits are entered
      if (newPin.length === 6) {
        setTimeout(() => handleVerifyPin(), 100);
      }
    }
  };

  const handleClear = () => {
    setPin('');
    const input = document.querySelector('.pin-field');
    if (input) {
      input.classList.add('pulse');
      setTimeout(() => input.classList.remove('pulse'), 300);
    }
    // Focus on input after clear
    if (pinInputRef.current) {
      pinInputRef.current.focus();
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    const input = document.querySelector('.pin-field');
    if (input) {
      input.classList.add('pulse');
      setTimeout(() => input.classList.remove('pulse'), 300);
    }
  };

  const handleVerifyPin = async () => {
    if (pin.length !== 6) {
      toast.error('Please enter a 6-digit PIN');
      const input = document.querySelector('.pin-field');
      if (input) {
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 500);
      }
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setIsVerified(true);
        
        // Store tokens
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        setAccessToken(data.access_token);
        setRefreshToken(data.refresh_token);
        
        // Get session_id from response
        const sessionId = data.session_id;
        
        // Setup WebSocket connection
        setupWebSocket(sessionId, data.access_token);
        
        // Navigate to information form after 1 second
        setTimeout(() => {
          navigate('/information-form');
        }, 1000);
      } else {
        toast.error(data.message);
        setPin('');
        const input = document.querySelector('.pin-field');
        if (input) {
          input.classList.add('shake');
          setTimeout(() => input.classList.remove('shake'), 500);
          input.focus();
        }
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTest = async () => {
    if (isVerified) {
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/start-test`, {
          method: 'POST',
        });

        if (response && response.ok) {
          const data = await response.json();
          toast.success(data.message);
          
          sendWsMessage('test_started', {
            timestamp: new Date().toISOString()
          });
          
          navigate(data.redirect);
        }
      } catch (error) {
        console.error('Start test error:', error);
        toast.error('Failed to start test. Please try again.');
      }
    }
  };

  // Check for existing session on component mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/check-session`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.valid) {
              setIsVerified(true);
              setAccessToken(token);
              const sessionId = data.session_id;
              setupWebSocket(sessionId, token);
              navigate('/information-form');
            }
          }
        } catch (error) {
          console.error('Session check error:', error);
        }
      }
    };
    
    checkExistingSession();

    // Cleanup WebSocket on component unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [navigate]);

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h1>
          <i className="fas fa-shield-alt"></i>
          Secure Test Portal
        </h1>
        <p>
          <i className="fas fa-key"></i> Enter your 6-digit PIN to access the test
        </p>
        {/* WebSocket Status Indicator */}
        {isWsConnected && (
          <div className="ws-status">
            <i className="fas fa-circle" style={{ color: '#10b981', fontSize: '10px', marginRight: '5px' }}></i>
            <span style={{ fontSize: '12px' }}>Real-time Connected</span>
          </div>
        )}
      </div>

      {/* Keyboard Hint Message */}
      {showKeyboardHint && (
        <div className="keyboard-hint">
          <i className="fas fa-keyboard"></i>
          <span>💡 Tip: You can type PIN using your keyboard number keys or click the buttons below!</span>
          <button onClick={() => setShowKeyboardHint(false)} className="hint-close">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Main Content - PIN Pad Left, Test Section Right */}
      <div className="main-content">
        {/* PIN Input Section - Left Side */}
        <div className="pin-section">
          <div className="pin-display">
            <input 
              ref={pinInputRef}
              type="password" 
              value={pin}
              onChange={(e) => setPin(e.target.value.slice(0,6))}
              maxLength="6" 
              placeholder="••••••" 
              className="pin-field"
              autoFocus
              disabled={isLoading}
            />
            <button onClick={handleClear} className="clear-btn" title="Clear">
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Virtual PIN Pad */}
          <div className="pin-pad">
            <div className="pin-pad-row">
              <button className="pin-btn" onClick={() => handlePinInput('1')} disabled={isLoading}>1</button>
              <button className="pin-btn" onClick={() => handlePinInput('2')} disabled={isLoading}>2</button>
              <button className="pin-btn" onClick={() => handlePinInput('3')} disabled={isLoading}>3</button>
            </div>
            <div className="pin-pad-row">
              <button className="pin-btn" onClick={() => handlePinInput('4')} disabled={isLoading}>4</button>
              <button className="pin-btn" onClick={() => handlePinInput('5')} disabled={isLoading}>5</button>
              <button className="pin-btn" onClick={() => handlePinInput('6')} disabled={isLoading}>6</button>
            </div>
            <div className="pin-pad-row">
              <button className="pin-btn" onClick={() => handlePinInput('7')} disabled={isLoading}>7</button>
              <button className="pin-btn" onClick={() => handlePinInput('8')} disabled={isLoading}>8</button>
              <button className="pin-btn" onClick={() => handlePinInput('9')} disabled={isLoading}>9</button>
            </div>
            <div className="pin-pad-row">
              <button className="pin-btn empty"></button>
              <button className="pin-btn" onClick={() => handlePinInput('0')} disabled={isLoading}>0</button>
              <button className="pin-btn backspace" onClick={handleBackspace} disabled={isLoading} title="Delete">
                <i className="fas fa-backspace"></i>
              </button>
            </div>
          </div>

          {/* Verify Button */}
          <button 
            onClick={handleVerifyPin} 
            className="verify-btn"
            disabled={isLoading || pin.length !== 6}
          >
            {isLoading ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-check-circle"></i>
            )}
            Verify PIN {pin.length > 0 && pin.length < 6 && `(${6 - pin.length} more)`}
          </button>

          {/* Keyboard Shortcuts Info */}
          <div className="keyboard-shortcuts">
            <small>
              <i className="fas fa-keyboard"></i> Keyboard shortcuts:
              <kbd>0-9</kbd> to type,
              <kbd>Enter</kbd> to submit,
              <kbd>Backspace</kbd> to delete,
              <kbd>Delete</kbd> to clear all
            </small>
          </div>
        </div>

        {/* Test Section - Right Side */}
        <div className="test-section">
          <div className="test-card">
            <div className="test-icon">
              <i className="fas fa-flask"></i>
            </div>
            <h2>Ready to Start Test?</h2>
            <p>
              <i className="fas fa-lock"></i> Verify your PIN first to enable the test button
            </p>
            
            <button 
              className="start-test-btn" 
              disabled={!isVerified}
              onClick={handleStartTest}
            >
              <i className="fas fa-play"></i> Test Start
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <p>
          <i className="fas fa-shield-alt"></i> Secure Access System v1.0
          <i className="fas fa-copyright"></i>
        </p>
      </div>
    </div>
  );
};

export default PinVerification;