// Backend integration utilities
import { API_CONFIG } from "../api/config";

export class BackendManager {
  constructor() {
    this.isHealthy = true;
    this.lastHealthCheck = 0;
    this.healthCheckInterval = 5 * 60 * 1000; // 5 minutes
  }

  async checkHealth() {
    const now = Date.now();

    // Avoid too frequent health checks
    if (now - this.lastHealthCheck < 30000) {
      // 30 seconds
      return this.isHealthy;
    }

    try {
      const response = await fetch(`${API_CONFIG.backend.baseUrl}/health`, {
        method: "GET",
        timeout: 5000, // 5 second timeout
      });

      this.isHealthy = response.ok;
      this.lastHealthCheck = now;

      if (!this.isHealthy) {
        console.warn("Backend health check failed:", response.status);
      }

      return this.isHealthy;
    } catch (error) {
      console.error("Backend health check error:", error);
      this.isHealthy = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  async makeApiCall(endpoint, options = {}) {
    // Check health before making API calls
    const isHealthy = await this.checkHealth();

    if (!isHealthy) {
      throw new Error("Backend is not available");
    }

    const url = `${API_CONFIG.backend.baseUrl}${endpoint}`;

    const defaultOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000, // 10 second timeout
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, finalOptions);

      if (!response.ok) {
        throw new Error(
          `API call failed: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`Backend API call failed for ${endpoint}:`, error);

      // Mark backend as unhealthy if request fails
      this.isHealthy = false;
      throw error;
    }
  }

  // Retry mechanism for critical operations
  async makeApiCallWithRetry(endpoint, options = {}, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.makeApiCall(endpoint, options);
      } catch (error) {
        lastError = error;
        console.warn(
          `API call attempt ${attempt} failed for ${endpoint}:`,
          error
        );

        if (attempt < maxRetries) {
          // Exponential backoff: wait 1s, 2s, 4s between retries
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  // Get backend status for UI
  getStatus() {
    return {
      isHealthy: this.isHealthy,
      lastCheck: this.lastHealthCheck,
      timeSinceLastCheck: Date.now() - this.lastHealthCheck,
    };
  }
}

// Export singleton instance
export const backendManager = new BackendManager();

// Utility functions
export const isBackendAvailable = () => backendManager.isHealthy;

export const getBackendStatus = () => backendManager.getStatus();

export const makeBackendCall = (endpoint, options) =>
  backendManager.makeApiCall(endpoint, options);

export const makeBackendCallWithRetry = (endpoint, options, maxRetries) =>
  backendManager.makeApiCallWithRetry(endpoint, options, maxRetries);
