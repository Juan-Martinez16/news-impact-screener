// src/api/config.js
// Enhanced configuration with backend integration and rate limiting

// Helper functions
const getToday = () => new Date().toISOString().split("T")[0];
const getLastWeek = () => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split("T")[0];
};

export const API_CONFIG = {
  // Backend Configuration (PRIMARY) - Using Render deployment
  backend: {
    baseUrl:
      process.env.REACT_APP_BACKEND_URL ||
      "https://news-impact-screener-backend.onrender.com",
    endpoints: {
      health: () => "/health",
      quote: (symbol) => `/api/quote/${symbol}`,
      news: (symbol) => `/api/news/${symbol}`,
      technicals: (symbol) => `/api/technicals/${symbol}`,
      options: (symbol) => `/api/options/${symbol}`,
      batchQuotes: () => "/api/batch/quotes",
      screening: () => "/api/screening",
    },
  },

  // Direct API Configuration (FALLBACK ONLY - backend handles keys)
  alphaVantage: {
    key: null, // Backend handles this
    baseUrl: "https://www.alphavantage.co/query",
    endpoints: {
      quote: (symbol) => `function=GLOBAL_QUOTE&symbol=${symbol}`,
      indicators: (symbol) =>
        `function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close`,
    },
  },

  finnhub: {
    key: null, // Backend handles this
    baseUrl: "https://finnhub.io/api/v1",
    endpoints: {
      quote: (symbol) => `/quote?symbol=${symbol}`,
      news: (symbol) =>
        `/company-news?symbol=${symbol}&from=${getLastWeek()}&to=${getToday()}`,
    },
  },

  polygon: {
    key: null, // Backend handles this
    baseUrl: "https://api.polygon.io/v2",
    endpoints: {
      quote: (symbol) => `/aggs/ticker/${symbol}/prev`,
      news: (symbol) => `/reference/news?ticker=${symbol}&limit=10`,
    },
  },

  yahooFinance: {
    headers: {
      "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
      "x-rapidapi-key": null, // Backend handles this
    },
    baseUrl: "https://apidojo-yahoo-finance-v1.p.rapidapi.com",
    endpoints: {
      quote: (symbol) => `/stock/v3/get-summary?symbol=${symbol}&region=US`,
    },
  },
};

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  maxRequestsPerMinute: 150,
  maxConcurrentRequests: 5,
  requestDelay: 200, // ms between requests
  retryDelay: 1000, // Base retry delay
  maxRetries: 3,
};

// Circuit breaker configuration
export const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  timeout: 30000, // 30 seconds
  resetTimeout: 60000, // 1 minute
};

// Enhanced Backend API Client Class with Rate Limiting and Circuit Breaker
class BackendApiClient {
  constructor() {
    this.consecutiveFailures = 0;
    this.isCircuitOpen = false;
    this.lastFailureTime = 0;
    this.activeRequests = 0;
    this.requestQueue = [];
  }

  // Circuit breaker check
  isCircuitBreakerOpen() {
    if (!this.isCircuitOpen) return false;

    const timeSinceFailure = Date.now() - this.lastFailureTime;
    if (timeSinceFailure > CIRCUIT_BREAKER_CONFIG.resetTimeout) {
      this.isCircuitOpen = false;
      this.consecutiveFailures = 0;
      console.log("🔄 Circuit breaker reset - backend available again");
      return false;
    }

    return true;
  }

  // Record successful request
  recordSuccess() {
    this.consecutiveFailures = 0;
    if (this.isCircuitOpen) {
      this.isCircuitOpen = false;
      console.log("✅ Circuit breaker closed - backend recovered");
    }
  }

  // Record failed request
  recordFailure(error) {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    if (this.consecutiveFailures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      this.isCircuitOpen = true;
      console.warn(
        `🚨 Circuit breaker opened - backend temporarily unavailable after ${this.consecutiveFailures} failures`
      );
    }
  }

  // Helper to pause execution
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Main API request method with enhanced error handling
  async makeRequest(endpoint, options = {}) {
    // Check if circuit breaker is open
    if (this.isCircuitBreakerOpen()) {
      throw new Error(
        "Circuit breaker is open - backend temporarily unavailable"
      );
    }

    // Check if we've hit concurrent request limit
    if (this.activeRequests >= RATE_LIMIT_CONFIG.maxConcurrentRequests) {
      console.log(
        "⏳ Max concurrent requests reached, waiting for available slot..."
      );
      await this.waitForAvailableSlot();
    }

    const url = `${API_CONFIG.backend.baseUrl}${endpoint}`;
    let lastError;

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= RATE_LIMIT_CONFIG.maxRetries; attempt++) {
      this.activeRequests++;

      try {
        console.log(
          `🔄 Making API request (attempt ${attempt}/${RATE_LIMIT_CONFIG.maxRetries}): ${endpoint}`
        );

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
          timeout: options.timeout || 15000, // 15 second timeout
          ...options,
        });

        // Handle successful response
        if (response.ok) {
          const data = await response.json();
          this.recordSuccess();
          console.log(`✅ API request successful: ${endpoint}`);
          return data;
        }
        // Handle rate limiting specifically
        else if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after") || 60;
          console.warn(
            `🚫 Rate limit hit (429) for ${endpoint}, waiting ${retryAfter} seconds`
          );

          // If we have more attempts, wait and retry
          if (attempt < RATE_LIMIT_CONFIG.maxRetries) {
            await this.sleep(retryAfter * 1000);
            continue;
          } else {
            throw new Error(
              `Rate limit exceeded after ${RATE_LIMIT_CONFIG.maxRetries} attempts: 429 ${response.statusText}`
            );
          }
        }
        // Handle other HTTP errors
        else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        lastError = error;
        console.warn(
          `❌ Attempt ${attempt} failed for ${endpoint}:`,
          error.message
        );

        // Record the failure for circuit breaker
        this.recordFailure(error);

        // Don't retry on final attempt
        if (attempt === RATE_LIMIT_CONFIG.maxRetries) break;

        // Calculate exponential backoff delay
        const backoffDelay =
          RATE_LIMIT_CONFIG.retryDelay * Math.pow(2, attempt - 1);
        console.log(
          `⏳ Waiting ${backoffDelay}ms before retry attempt ${attempt + 1}...`
        );
        await this.sleep(backoffDelay);
      } finally {
        // Always decrement active requests counter
        this.activeRequests = Math.max(0, this.activeRequests - 1);
      }
    }

    // If we get here, all attempts failed
    throw (
      lastError ||
      new Error(
        `All ${RATE_LIMIT_CONFIG.maxRetries} attempts failed for ${endpoint}`
      )
    );
  }

  // Wait for an available request slot
  async waitForAvailableSlot() {
    let waitCount = 0;
    while (this.activeRequests >= RATE_LIMIT_CONFIG.maxConcurrentRequests) {
      await this.sleep(100); // Check every 100ms
      waitCount++;

      // Log waiting status every 5 seconds
      if (waitCount % 50 === 0) {
        console.log(
          `⏳ Still waiting for available request slot... (${this.activeRequests}/${RATE_LIMIT_CONFIG.maxConcurrentRequests} active)`
        );
      }
    }
  }

  // Get current status for debugging
  getStatus() {
    return {
      isCircuitOpen: this.isCircuitBreakerOpen(),
      consecutiveFailures: this.consecutiveFailures,
      activeRequests: this.activeRequests,
      lastFailureTime: this.lastFailureTime,
      queueLength: this.requestQueue.length,
    };
  }
}

// Create singleton instance
const backendClient = new BackendApiClient();

// Main export function - Enhanced with rate limiting and circuit breaker
export const makeBackendApiCall = async (endpoint, options = {}) => {
  try {
    console.log(`📡 Initiating backend API call to: ${endpoint}`);
    const result = await backendClient.makeRequest(endpoint, options);
    return result;
  } catch (error) {
    console.error(
      `🚨 Backend API call completely failed for ${endpoint}:`,
      error.message
    );

    // Create enhanced error with more context
    const enhancedError = new Error(
      `Backend API call failed: ${error.message}`
    );
    enhancedError.originalError = error;
    enhancedError.endpoint = endpoint;
    enhancedError.timestamp = new Date().toISOString();
    enhancedError.backendStatus = backendClient.getStatus();

    throw enhancedError;
  }
};

// Health check helper - keep your existing functionality
export const checkBackendHealth = async () => {
  try {
    console.log("🏥 Checking backend health...");
    const response = await fetch(`${API_CONFIG.backend.baseUrl}/health`, {
      method: "GET",
      timeout: 5000,
    });

    const isHealthy = response.ok;
    console.log(
      `🏥 Backend health check result: ${
        isHealthy ? "✅ Healthy" : "❌ Unhealthy"
      } (${response.status})`
    );
    return isHealthy;
  } catch (error) {
    console.error("❌ Backend health check failed:", error.message);
    return false;
  }
};

// Debug helper to monitor backend client status
export const getBackendStatus = () => {
  const status = backendClient.getStatus();
  console.log("📊 Backend Client Status:", status);
  return status;
};

// Helper to manually reset circuit breaker (for debugging)
export const resetCircuitBreaker = () => {
  backendClient.consecutiveFailures = 0;
  backendClient.isCircuitOpen = false;
  backendClient.lastFailureTime = 0;
  console.log("🔄 Circuit breaker manually reset");
};

// Helper to get configuration for debugging
export const getApiConfig = () => {
  return {
    backendUrl: API_CONFIG.backend.baseUrl,
    rateLimit: RATE_LIMIT_CONFIG,
    circuitBreaker: CIRCUIT_BREAKER_CONFIG,
    currentStatus: backendClient.getStatus(),
  };
};
