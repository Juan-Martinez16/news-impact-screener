import React from 'react';

function App() {
  return (
    <div style={{
      padding: '40px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f8ff',
      minHeight: '100vh'
    }}>
      <h1 style={{color: 'green', fontSize: '32px'}}>
        🎉 News Impact Screener - WORKING!
      </h1>
      <div style={{fontSize: '18px', marginTop: '20px'}}>
        <p>✅ React is loading successfully</p>
        <p>Backend URL: {process.env.REACT_APP_BACKEND_URL || 'NOT SET'}</p>
        <p>Environment: {process.env.REACT_APP_ENVIRONMENT || 'NOT SET'}</p>
        <p>Version: {process.env.REACT_APP_VERSION || 'NOT SET'}</p>
        <p>Time: {new Date().toLocaleString()}</p>
      </div>
      <button 
        onClick={() => alert('Button works! React is functioning perfectly!')}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        Test Button - Click Me!
      </button>
    </div>
  );
}

export default App;
