// backend/server.js - CORS SECTION FIX
// Replace the CORS configuration section in your backend/server.js with this:

app.use(helmet());

// SIMPLIFIED CORS CONFIGURATION - ALLOWS ALL ORIGINS IN DEVELOPMENT
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      console.log(`🔍 CORS request from origin: ${origin}`);

      const allowedOrigins =
        process.env.NODE_ENV === "production"
          ? [
              "https://news-impact-screener.vercel.app",
              "https://news-impact-screener-backend.onrender.com",
            ]
          : [
              "http://localhost:3000",
              "http://localhost:3001",
              "http://127.0.0.1:3000",
              "http://127.0.0.1:3001",
              "https://news-impact-screener.vercel.app", // Also allow production in dev
            ];

      console.log(`✅ Allowed origins:`, allowedOrigins);

      if (allowedOrigins.indexOf(origin) !== -1) {
        console.log(`✅ CORS allowed for origin: ${origin}`);
        callback(null, true);
      } else {
        console.log(`⚠️ CORS origin not in allowlist: ${origin}`);
        // TEMPORARILY ALLOW ALL ORIGINS FOR DEBUGGING
        callback(null, true); // Change this to callback(new Error('Not allowed by CORS')) later
      }
    },
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "X-Request-ID",
      "X-Client-Version",
      "Cache-Control",
    ],
    optionsSuccessStatus: 200,
  })
);
