// Temporary debug file - DELETE after fixing
console.log("🔍 Environment Debug:");
console.log("REACT_APP_BACKEND_URL:", process.env.REACT_APP_BACKEND_URL);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log(
  "All REACT_APP vars:",
  Object.keys(process.env).filter((k) => k.startsWith("REACT_APP"))
);

// Export for verification
window.debugEnv = {
  backendUrl: process.env.REACT_APP_BACKEND_URL,
  allVars: Object.keys(process.env).filter((k) => k.startsWith("REACT_APP")),
};
