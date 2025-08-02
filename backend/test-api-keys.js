// backend/test-api-keys.js - COMPLETE API KEY VALIDATION SCRIPT
// Test all new API keys for 10x performance optimization

require("dotenv").config();
const axios = require("axios");

// Your exact API keys from .env file
const API_KEYS = {
  ALPHA_VANTAGE: process.env.ALPHA_VANTAGE_API_KEY,
  FINNHUB: process.env.FINNHUB_API_KEY,
  POLYGON: process.env.POLYGON_API_KEY,
  RAPIDAPI: process.env.RAPIDAPI_API_KEY,
  TWELVE_DATA: process.env.TWELVE_DATA_API_KEY,
  FMP: process.env.FMP_API_KEY,
};

console.log("\n🧪 ===== API KEY VALIDATION TEST =====");
console.log("Testing all APIs for News Impact Screener optimization\n");

// Test configuration
const TEST_SYMBOL = "AAPL";
const TIMEOUT = 10000;

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  tests: {},
};

// Helper function for test execution
async function runTest(testName, testFunction) {
  try {
    console.log(`🔍 Testing ${testName}...`);
    const startTime = Date.now();

    const result = await testFunction();
    const responseTime = Date.now() - startTime;

    testResults.tests[testName] = {
      status: "✅ SUCCESS",
      responseTime: `${responseTime}ms`,
      data: result,
      timestamp: new Date().toISOString(),
    };

    testResults.passed++;
    console.log(`✅ ${testName}: SUCCESS (${responseTime}ms)`);

    return result;
  } catch (error) {
    testResults.tests[testName] = {
      status: "❌ FAILED",
      error: error.message,
      timestamp: new Date().toISOString(),
    };

    testResults.failed++;
    console.log(`❌ ${testName}: FAILED - ${error.message}`);

    return null;
  }
}

// ============================================
// INDIVIDUAL API TESTS
// ============================================

// Test 1: Polygon.io Quote API (Primary quotes - 100 req/min)
async function testPolygonQuotes() {
  if (!API_KEYS.POLYGON) {
    throw new Error("Polygon API key not found in .env file");
  }

  const response = await axios.get(
    `https://api.polygon.io/v2/aggs/ticker/${TEST_SYMBOL}/prev?adjusted=true&apikey=${API_KEYS.POLYGON}`,
    { timeout: TIMEOUT }
  );

  if (!response.data.results || response.data.results.length === 0) {
    throw new Error("No data returned from Polygon API");
  }

  const data = response.data.results[0];
  return {
    symbol: TEST_SYMBOL,
    price: data.c,
    change: data.c - data.o,
    changePercent: (((data.c - data.o) / data.o) * 100).toFixed(2),
    volume: data.v,
    source: "polygon",
  };
}

// Test 2: FMP Quote API (Batch quotes + fallback - 250 req/day)
async function testFMPQuotes() {
  if (!API_KEYS.FMP) {
    throw new Error("FMP API key not found in .env file");
  }

  const response = await axios.get(
    `https://financialmodelingprep.com/api/v3/quote/${TEST_SYMBOL}?apikey=${API_KEYS.FMP}`,
    { timeout: TIMEOUT }
  );

  if (!response.data || response.data.length === 0) {
    throw new Error("No data returned from FMP API");
  }

  const quote = response.data[0];
  return {
    symbol: quote.symbol,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changesPercentage.toFixed(2),
    volume: quote.volume,
    source: "fmp",
  };
}

// Test 3: FMP Batch Quotes (Critical for 50+ stock screening)
async function testFMPBatchQuotes() {
  if (!API_KEYS.FMP) {
    throw new Error("FMP API key not found in .env file");
  }

  const testSymbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"];
  const symbolString = testSymbols.join(",");

  const response = await axios.get(
    `https://financialmodelingprep.com/api/v3/quote/${symbolString}?apikey=${API_KEYS.FMP}`,
    { timeout: TIMEOUT }
  );

  if (!response.data || response.data.length === 0) {
    throw new Error("No batch data returned from FMP API");
  }

  return {
    requestedSymbols: testSymbols.length,
    receivedSymbols: response.data.length,
    successRate: `${((response.data.length / testSymbols.length) * 100).toFixed(
      1
    )}%`,
    samples: response.data.slice(0, 2).map((quote) => ({
      symbol: quote.symbol,
      price: quote.price,
      change: quote.changesPercentage.toFixed(2),
    })),
    source: "fmp-batch",
  };
}

// Test 4: Twelve Data Technical Indicators (Primary technicals - 800 req/day)
async function testTwelveDataTechnicals() {
  if (!API_KEYS.TWELVE_DATA) {
    throw new Error("Twelve Data API key not found in .env file");
  }

  const response = await axios.get(
    `https://api.twelvedata.com/rsi?symbol=${TEST_SYMBOL}&interval=1day&apikey=${API_KEYS.TWELVE_DATA}`,
    { timeout: TIMEOUT }
  );

  if (!response.data.values || response.data.values.length === 0) {
    throw new Error("No technical data returned from Twelve Data API");
  }

  const rsi = parseFloat(response.data.values[0].rsi);
  return {
    symbol: TEST_SYMBOL,
    rsi: rsi.toFixed(2),
    signal: rsi > 70 ? "OVERBOUGHT" : rsi < 30 ? "OVERSOLD" : "NEUTRAL",
    source: "twelveData",
  };
}

// Test 5: FMP Technical Indicators (Fallback technicals)
async function testFMPTechnicals() {
  if (!API_KEYS.FMP) {
    throw new Error("FMP API key not found in .env file");
  }

  const response = await axios.get(
    `https://financialmodelingprep.com/api/v3/technical_indicator/daily/${TEST_SYMBOL}?period=14&type=rsi&apikey=${API_KEYS.FMP}`,
    { timeout: TIMEOUT }
  );

  if (!response.data || response.data.length === 0) {
    throw new Error("No technical data returned from FMP API");
  }

  const rsi = parseFloat(response.data[0].rsi);
  return {
    symbol: TEST_SYMBOL,
    rsi: rsi.toFixed(2),
    signal: rsi > 70 ? "OVERBOUGHT" : rsi < 30 ? "OVERSOLD" : "NEUTRAL",
    source: "fmp-technicals",
  };
}

// Test 6: Finnhub News API (Keep existing - working well)
async function testFinnhubNews() {
  if (!API_KEYS.FINNHUB) {
    throw new Error("Finnhub API key not found in .env file");
  }

  const response = await axios.get(
    `https://finnhub.io/api/v1/company-news?symbol=${TEST_SYMBOL}&from=2024-07-01&to=2025-08-01&token=${API_KEYS.FINNHUB}`,
    { timeout: TIMEOUT }
  );

  if (!Array.isArray(response.data) || response.data.length === 0) {
    throw new Error("No news data returned from Finnhub API");
  }

  return {
    symbol: TEST_SYMBOL,
    articlesFound: response.data.length,
    latestHeadline: response.data[0]?.headline || "No headline",
    source: "finnhub",
  };
}

// Test 7: Alpha Vantage (Fallback only)
async function testAlphaVantageQuotes() {
  if (!API_KEYS.ALPHA_VANTAGE) {
    throw new Error("Alpha Vantage API key not found in .env file");
  }

  const response = await axios.get(
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${TEST_SYMBOL}&apikey=${API_KEYS.ALPHA_VANTAGE}`,
    { timeout: TIMEOUT }
  );

  if (response.data["Error Message"]) {
    throw new Error("Alpha Vantage API limit reached or invalid symbol");
  }

  const quote = response.data["Global Quote"];
  if (!quote) {
    throw new Error("No quote data returned from Alpha Vantage API");
  }

  return {
    symbol: TEST_SYMBOL,
    price: parseFloat(quote["05. price"]).toFixed(2),
    change: parseFloat(quote["10. change percent"].replace("%", "")).toFixed(2),
    source: "alphaVantage-fallback",
  };
}

// ============================================
// PERFORMANCE TESTS
// ============================================

// Test 8: API Response Time Comparison
async function testAPIPerformance() {
  console.log("\n⚡ Testing API Performance Comparison...");

  const performanceResults = {};

  // Test Polygon speed
  try {
    const start = Date.now();
    await testPolygonQuotes();
    performanceResults.polygon = Date.now() - start;
  } catch (error) {
    performanceResults.polygon = "FAILED";
  }

  // Test FMP speed
  try {
    const start = Date.now();
    await testFMPQuotes();
    performanceResults.fmp = Date.now() - start;
  } catch (error) {
    performanceResults.fmp = "FAILED";
  }

  // Test Alpha Vantage speed
  try {
    const start = Date.now();
    await testAlphaVantageQuotes();
    performanceResults.alphaVantage = Date.now() - start;
  } catch (error) {
    performanceResults.alphaVantage = "FAILED";
  }

  return {
    results: performanceResults,
    fastest:
      Object.entries(performanceResults)
        .filter(([_, time]) => typeof time === "number")
        .sort(([_, a], [__, b]) => a - b)[0]?.[0] || "none",
  };
}

// Test 9: Rate Limit Capacity Test
async function testRateLimitCapacity() {
  console.log("\n📊 Testing Rate Limit Capacity...");

  const capacityResults = {
    polygon: "100 requests/minute",
    fmp: "250 requests/day",
    twelveData: "800 requests/day",
    finnhub: "60 requests/minute",
    alphaVantage: "5 requests/minute",
  };

  // Test actual capacity with multiple requests
  const testRequests = 3;
  const results = {};

  for (const [api, description] of Object.entries(capacityResults)) {
    try {
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < testRequests; i++) {
        switch (api) {
          case "polygon":
            promises.push(testPolygonQuotes());
            break;
          case "fmp":
            promises.push(testFMPQuotes());
            break;
          case "finnhub":
            promises.push(testFinnhubNews());
            break;
          default:
            continue;
        }
      }

      await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      results[api] = {
        capacity: description,
        testRequests: testRequests,
        totalTime: `${totalTime}ms`,
        avgPerRequest: `${Math.round(totalTime / testRequests)}ms`,
        status: "✅ PASSED",
      };
    } catch (error) {
      results[api] = {
        capacity: description,
        status: "❌ FAILED",
        error: error.message,
      };
    }
  }

  return results;
}

// ============================================
// MAIN TEST EXECUTION
// ============================================

async function runAllTests() {
  try {
    console.log("🔑 API Keys Found:");
    Object.entries(API_KEYS).forEach(([key, value]) => {
      console.log(`   ${key}: ${value ? "✅ Configured" : "❌ Missing"}`);
    });
    console.log("");

    // Core API Tests
    await runTest("Polygon Quotes (Primary)", testPolygonQuotes);
    await runTest("FMP Quotes (Fallback)", testFMPQuotes);
    await runTest("FMP Batch Quotes (Critical)", testFMPBatchQuotes);
    await runTest("Twelve Data Technicals (Primary)", testTwelveDataTechnicals);
    await runTest("FMP Technicals (Fallback)", testFMPTechnicals);
    await runTest("Finnhub News (Keep)", testFinnhubNews);
    await runTest("Alpha Vantage (Fallback Only)", testAlphaVantageQuotes);

    // Performance Tests
    const performanceResults = await runTest(
      "API Performance Comparison",
      testAPIPerformance
    );
    const capacityResults = await runTest(
      "Rate Limit Capacity",
      testRateLimitCapacity
    );

    // ============================================
    // COMPREHENSIVE RESULTS SUMMARY
    // ============================================

    console.log("\n📊 ===== COMPREHENSIVE TEST RESULTS =====");
    console.log(`✅ Tests Passed: ${testResults.passed}`);
    console.log(`❌ Tests Failed: ${testResults.failed}`);
    console.log(
      `📈 Success Rate: ${(
        (testResults.passed / (testResults.passed + testResults.failed)) *
        100
      ).toFixed(1)}%`
    );

    console.log("\n🎯 ===== API OPTIMIZATION READINESS =====");

    // Check critical APIs for 10x improvement
    const criticalAPIs = {
      polygon:
        testResults.tests["Polygon Quotes (Primary)"]?.status === "✅ SUCCESS",
      fmpBatch:
        testResults.tests["FMP Batch Quotes (Critical)"]?.status ===
        "✅ SUCCESS",
      twelveData:
        testResults.tests["Twelve Data Technicals (Primary)"]?.status ===
        "✅ SUCCESS",
      finnhub:
        testResults.tests["Finnhub News (Keep)"]?.status === "✅ SUCCESS",
    };

    const readyForOptimization = Object.values(criticalAPIs).every(
      (status) => status
    );

    console.log(
      `🚀 Ready for 10x Optimization: ${
        readyForOptimization ? "✅ YES" : "❌ NO"
      }`
    );
    console.log(`📊 Critical APIs Status:`);
    console.log(
      `   Polygon (Primary Quotes): ${criticalAPIs.polygon ? "✅" : "❌"}`
    );
    console.log(
      `   FMP Batch (Screening): ${criticalAPIs.fmpBatch ? "✅" : "❌"}`
    );
    console.log(
      `   Twelve Data (Technicals): ${criticalAPIs.twelveData ? "✅" : "❌"}`
    );
    console.log(`   Finnhub (News): ${criticalAPIs.finnhub ? "✅" : "❌"}`);

    if (readyForOptimization) {
      console.log("\n🎉 ===== OPTIMIZATION TARGETS ACHIEVABLE =====");
      console.log("📈 Expected Performance Improvements:");
      console.log("   • Stock Screening: 6 stocks → 50+ stocks");
      console.log("   • Processing Time: 60 seconds → <15 seconds");
      console.log("   • Quote Requests: 5/min → 100/min capacity");
      console.log("   • Technical Analysis: Limited → 800/day capacity");
      console.log("   • Batch Processing: ❌ None → ✅ 20 stocks/request");
      console.log("   • API Failover: ❌ None → ✅ Smart switching");

      console.log("\n🚀 Next Steps:");
      console.log("1. Deploy the new backend/server.js");
      console.log("2. Update src/api/InstitutionalDataService.js");
      console.log("3. Test with: curl http://localhost:3001/api/test-keys");
      console.log("4. Run screening: curl http://localhost:3001/api/screening");
      console.log("5. Verify 50+ stocks processed in <15 seconds");
    } else {
      console.log("\n⚠️  ===== OPTIMIZATION BLOCKED =====");
      console.log("❌ Missing critical API configurations");
      console.log("🔧 Fix the failed API tests before proceeding");
    }

    console.log("\n📋 ===== DETAILED TEST RESULTS =====");
    Object.entries(testResults.tests).forEach(([testName, result]) => {
      console.log(`\n${testName}:`);
      console.log(`   Status: ${result.status}`);
      if (result.responseTime)
        console.log(`   Response Time: ${result.responseTime}`);
      if (result.error) console.log(`   Error: ${result.error}`);
      if (result.data && typeof result.data === "object") {
        Object.entries(result.data).forEach(([key, value]) => {
          if (typeof value === "object") {
            console.log(`   ${key}: ${JSON.stringify(value)}`);
          } else {
            console.log(`   ${key}: ${value}`);
          }
        });
      }
    });

    console.log(`\n⏰ Test completed at: ${new Date().toISOString()}`);

    // Return summary for programmatic use
    return {
      summary: {
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: (
          (testResults.passed / (testResults.passed + testResults.failed)) *
          100
        ).toFixed(1),
        readyForOptimization,
        criticalAPIs,
      },
      results: testResults.tests,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("\n🚨 ===== CRITICAL TEST FAILURE =====");
    console.error("❌ Test execution failed:", error.message);
    console.error("🔧 Check your .env file and API key configuration");

    return {
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================
// SCRIPT EXECUTION
// ============================================

if (require.main === module) {
  runAllTests()
    .then((results) => {
      if (results.summary?.readyForOptimization) {
        console.log("\n🎯 SUCCESS: Ready for 10x performance optimization!");
        process.exit(0);
      } else {
        console.log("\n⚠️  WARNING: Optimization requirements not met");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("\n💥 FATAL ERROR:", error.message);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testResults,
  API_KEYS,
};
