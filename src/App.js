import React from 'react';

// Simple test component instead of NewsImpactScreener
function TestComponent() {
  return (
    <div style={{padding: '20px'}}>
      <h1>🚀 News Impact Screener - TEST MODE</h1>
      <p>If you see this, React is working!</p>
      <p>Backend URL: {process.env.REACT_APP_BACKEND_URL || 'NOT SET'}</p>
      <p>Version: {process.env.REACT_APP_VERSION || 'NOT SET'}</p>
      <button onClick={() => alert('Button works!')}>Test Button</button>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <TestComponent />
    </div>
  );
}

export default App;