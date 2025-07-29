// src/api/config.js - ENHANCED VERSION
// Enhanced configuration building on your existing structure

// Helper functions for date calculations
const getToday = () => new Date().toISOString().split("T")[0];
const getLastWeek = () => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split("T")[0];
};

// Enhanced API configuration
export const API_CONFIG = {
  // Backend Configuration (PRIMARY) - Your existing setup enhanced
  backend: {
    baseUrl:
      process.env.REACT_APP_BACKEND_URL ||
      (process.env.NODE_ENV === "development"
        ? "http://localhost:3001"
        : "https://news-impact-screener-backend.onrender.com"),
    timeout: 15000, // 15 seconds for institutional data
    endpoints: {
      health: () => "/health",
      quote: (symbol) => `/api/quote/${symbol}`,
      news: (symbol) => `/api/news/${symbol}`,
      technicals: (symbol) => `/api/technicals/${symbol}`,
      options: (symbol) => `/api/options/${symbol}`,
      batchQuotes: () => "/api/batch/quotes",
      screening: () => "/api/screening",
      universe: () => "/api/universe",
    },
  },

  // Rate limiting configuration (matches backend)
  rateLimiting: {
    maxRequestsPerMinute: 80,
    backoffMultiplier: 2,
    maxBackoffTime: 30000, // 30 seconds
    retryAttempts: 3,
  },

  // Caching configuration
  cache: {
    quoteTTL: 30000, // 30 seconds for quotes
    newsTTL: 300000, // 5 minutes for news
    technicalsTTL: 600000, // 10 minutes for technicals
    universeTTL: 3600000, // 1 hour for universe data
  },

  // Circuit breaker configuration
  circuitBreaker: {
    failureThreshold: 5,
    timeoutThreshold: 30000, // 30 seconds
    resetTimeout: 300000, // 5 minutes
  },
};

// Enhanced backend API call manager
class BackendAPIManager {
  constructor() {
    this.requestQueue = [];
    this.activeRequests = 0;
    this.maxConcurrentRequests = 8; // Increased for institutional usage
    this.requestHistory = [];
    this.circuitBreakers = new Map();
    this.cache = new Map();

    // Rate limiting tracking
    this.lastWindowReset = Date.now();
    this.requestsInWindow = 0;
    this.windowSize = 60000; // 1 minute
  }

  // Enhanced rate limiting check
  checkRateLimit() {
    const now = Date.now();

    // Reset window if needed
    if (now - this.lastWindowReset > this.windowSize) {
      this.requestsInWindow = 0;
      this.lastWindowReset = now;
    }

    // Check if we're at the limit
    if (this.requestsInWindow >= API_CONFIG.rateLimiting.maxRequestsPerMinute) {
      const waitTime = this.windowSize - (now - this.lastWindowReset);
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(
          waitTime / 1000
        )} seconds.`
      );
    }

    return true;
  }

  // Circuit breaker check
  isCircuitOpen(endpoint) {
    const breaker = this.circuitBreakers.get(endpoint);
    if (!breaker) return false;

    // Reset circuit if timeout has passed
    if (
      Date.now() - breaker.lastFailure >
      API_CONFIG.circuitBreaker.resetTimeout
    ) {
      this.circuitBreakers.delete(endpoint);
      return false;
    }

    return breaker.failures >= API_CONFIG.circuitBreaker.failureThreshold;
  }

  // Record circuit breaker failure
  recordFailure(endpoint) {
    const breaker = this.circuitBreakers.get(endpoint) || {
      failures: 0,
      lastFailure: 0,
    };
    breaker.failures++;
    breaker.lastFailure = Date.now();
    this.circuitBreakers.set(endpoint, breaker);

    if (breaker.failures >= API_CONFIG.circuitBreaker.failureThreshold) {
      console.warn(`🔥 Circuit breaker opened for ${endpoint}`);
    }
  }

  // Enhanced cache management
  getCached(key, ttl) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      console.log(`📋 Cache hit for ${key}`);
      return cached.data;
    }

    if (cached) {
      this.cache.delete(key); // Remove expired cache
    }

    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Prevent memory leaks - limit cache size
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  // Main API call method
  async makeRequest(endpoint, options = {}) {
    const fullUrl = `${API_CONFIG.backend.baseUrl}${endpoint}`;
    const cacheKey = `${endpoint}_${JSON.stringify(options)}`;

    // Check circuit breaker
    if (this.isCircuitOpen(endpoint)) {
      throw new Error(`Circuit breaker open for ${endpoint}`);
    }

    // Check rate limit
    this.checkRateLimit();

    // Check cache first
    const ttl = this.getCacheTTL(endpoint);
    const cached = this.getCached(cacheKey, ttl);
    if (cached) {
      return cached;
    }

    // Wait for available slot
    while (this.activeRequests >= this.maxConcurrentRequests) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    this.activeRequests++;
    this.requestsInWindow++;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      API_CONFIG.backend.timeout
    );

    try {
      console.log(`🌐 API request to ${endpoint}`);

      const response = await fetch(fullUrl, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache successful response
      this.setCache(cacheKey, data);

      console.log(`✅ API request successful for ${endpoint}`);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      // Record failure for circuit breaker
      this.recordFailure(endpoint);

      if (error.name === "AbortError") {
        throw new Error(`Request timeout for ${endpoint}`);
      }

      console.error(`❌ API request failed for ${endpoint}:`, error.message);
      throw error;
    } finally {
      this.activeRequests--;
    }
  }

  // Get appropriate cache TTL based on endpoint
  getCacheTTL(endpoint) {
    if (endpoint.includes("/quote/")) return API_CONFIG.cache.quoteTTL;
    if (endpoint.includes("/news/")) return API_CONFIG.cache.newsTTL;
    if (endpoint.includes("/technicals/"))
      return API_CONFIG.cache.technicalsTTL;
    if (endpoint.includes("/universe")) return API_CONFIG.cache.universeTTL;
    return 60000; // Default 1 minute
  }

  // Retry logic with exponential backoff
  async makeRequestWithRetry(
    endpoint,
    options = {},
    maxRetries = API_CONFIG.rateLimiting.retryAttempts
  ) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.makeRequest(endpoint, options);
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const backoffTime = Math.min(
            API_CONFIG.rateLimiting.backoffMultiplier ** attempt * 1000,
            API_CONFIG.rateLimiting.maxBackoffTime
          );

          console.log(
            `⏳ Retrying ${endpoint} in ${backoffTime}ms (attempt ${attempt}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, backoffTime));
        }
      }
    }

    throw lastError;
  }

  // Get manager status for debugging
  getStatus() {
    return {
      activeRequests: this.activeRequests,
      requestsInWindow: this.requestsInWindow,
      windowTimeLeft: this.windowSize - (Date.now() - this.lastWindowReset),
      cacheSize: this.cache.size,
      circuitBreakers: Array.from(this.circuitBreakers.entries()),
      queueLength: this.requestQueue.length,
    };
  }

  // Clear all caches (useful for manual refresh)
  clearCache() {
    this.cache.clear();
    console.log("🗑️ All caches cleared");
  }
}

// Create singleton instance
const apiManager = new BackendAPIManager();

// Main export function - Enhanced with comprehensive error handling
export const makeBackendApiCall = async (endpoint, options = {}) => {
  try {
    console.log(`📡 Making backend API call to: ${endpoint}`);
    const result = await apiManager.makeRequestWithRetry(endpoint, options);
    return result;
  } catch (error) {
    console.error(`🚨 Backend API call failed for ${endpoint}:`, error.message);

    // Create enhanced error with context
    const enhancedError = new Error(
      `Backend API call failed: ${error.message}`
    );
    enhancedError.originalError = error;
    enhancedError.endpoint = endpoint;
    enhancedError.timestamp = new Date().toISOString();
    enhancedError.managerStatus = apiManager.getStatus();

    throw enhancedError;
  }
};

// Health check helper
export const checkBackendHealth = async () => {
  try {
    console.log("🏥 Checking backend health...");
    const response = await fetch(`${API_CONFIG.backend.baseUrl}/health`, {
      method: "GET",
      timeout: 5000,
    });

    const isHealthy = response.ok;
    console.log(
      `🏥 Backend health: ${isHealthy ? "✅ Healthy" : "❌ Unhealthy"} (${
        response.status
      })`
    );
    return isHealthy;
  } catch (error) {
    console.error("❌ Backend health check failed:", error.message);
    return false;
  }
};

// Utility functions for debugging and monitoring
export const getBackendStatus = () => {
  const status = apiManager.getStatus();
  console.log("📊 Backend API Manager Status:", status);
  return status;
};

export const clearBackendCache = () => {
  apiManager.clearCache();
};

export const getApiConfig = () => {
  return {
    backendUrl: API_CONFIG.backend.baseUrl,
    rateLimiting: API_CONFIG.rateLimiting,
    cache: API_CONFIG.cache,
    circuitBreaker: API_CONFIG.circuitBreaker,
    managerStatus: apiManager.getStatus(),
  };
};

// Batch request helper for institutional screening
export const makeBatchBackendCall = async (requests) => {
  const results = [];
  const errors = [];

  // Process requests in chunks to respect rate limits
  const chunkSize = 5;
  for (let i = 0; i < requests.length; i += chunkSize) {
    const chunk = requests.slice(i, i + chunkSize);

    const chunkPromises = chunk.map(async (request) => {
      try {
        const result = await makeBackendApiCall(
          request.endpoint,
          request.options
        );
        return { ...request, result, success: true };
      } catch (error) {
        errors.push({ ...request, error: error.message });
        return { ...request, error, success: false };
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);

    // Rate limiting between chunks
    if (i + chunkSize < requests.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return { results, errors };
};
