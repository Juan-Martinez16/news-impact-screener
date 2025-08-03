import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

// Ultra simple test component
function SimpleApp() {
  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>🎉 News Impact Screener - WORKING!</h1>
      <p>Backend URL: {process.env.REACT_APP_BACKEND_URL}</p>
      <p>Environment: {process.env.REACT_APP_ENVIRONMENT}</p>
      <p>Version: {process.env.REACT_APP_VERSION}</p>
      <p>Time: {new Date().toString()}</p>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SimpleApp />);
