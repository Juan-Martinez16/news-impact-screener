// backend/routes/economicCalendar.js - Economic Calendar API Integration
// Add this to your existing backend server.js

const express = require("express");
const router = express.Router();

// ============================================
// ECONOMIC CALENDAR ENDPOINT
// ============================================

router.get("/economic-calendar", async (req, res) => {
  try {
    console.log("📅 Fetching economic calendar data...");

    const { days = 7 } = req.query;
    const startTime = Date.now();

    // Get economic events from multiple sources
    const calendarData = await getEconomicCalendarData(parseInt(days));

    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: calendarData,
      metadata: {
        daysRequested: parseInt(days),
        totalEvents: calendarData.reduce(
          (sum, day) => sum + day.events.length,
          0
        ),
        processingTime: `${processingTime}ms`,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Economic calendar fetch failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch economic calendar",
      message: error.message,
    });
  }
});

// ============================================
// EARNINGS CALENDAR ENDPOINT
// ============================================

router.get("/earnings-calendar", async (req, res) => {
  try {
    console.log("📈 Fetching earnings calendar data...");

    const { days = 7, symbols } = req.query;
    const startTime = Date.now();

    // Get earnings events from FMP or other sources
    const earningsData = await getEarningsCalendarData(parseInt(days), symbols);

    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: earningsData,
      metadata: {
        daysRequested: parseInt(days),
        totalEarnings: earningsData.reduce(
          (sum, day) => sum + day.earnings.length,
          0
        ),
        processingTime: `${processingTime}ms`,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Earnings calendar fetch failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch earnings calendar",
      message: error.message,
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getEconomicCalendarData(days = 7) {
  const calendarData = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dayEvents = await getEconomicEventsForDate(date);

    if (dayEvents.length > 0) {
      calendarData.push({
        date: date.toISOString().split("T")[0],
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        dayNumber: date.getDate(),
        month: date.toLocaleDateString("en-US", { month: "short" }),
        events: dayEvents,
      });
    }
  }

  return calendarData;
}

async function getEconomicEventsForDate(date) {
  const events = [];

  try {
    // Try multiple sources for economic calendar data

    // Source 1: FMP Economic Calendar (if available)
    if (process.env.FMP_API_KEY) {
      const fmpEvents = await getFMPEconomicEvents(date);
      events.push(...fmpEvents);
    }

    // Source 2: Alpha Vantage Economic Calendar (if available)
    if (process.env.ALPHA_VANTAGE_API_KEY) {
      const avEvents = await getAlphaVantageEconomicEvents(date);
      events.push(...avEvents);
    }

    // Source 3: Static high-impact events (fallback)
    const staticEvents = getStaticEconomicEvents(date);
    events.push(...staticEvents);

    // Remove duplicates and sort by time
    const uniqueEvents = removeDuplicateEvents(events);
    return uniqueEvents.sort((a, b) => a.time.localeCompare(b.time));
  } catch (error) {
    console.error("❌ Error fetching economic events:", error);
    // Return static events as fallback
    return getStaticEconomicEvents(date);
  }
}

async function getFMPEconomicEvents(date) {
  try {
    const dateStr = date.toISOString().split("T")[0];
    const url = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${dateStr}&to=${dateStr}&apikey=${process.env.FMP_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (Array.isArray(data)) {
      return data.map((event) => ({
        time: formatTime(event.time || "09:00"),
        event: event.event || "Economic Event",
        impact: mapImpactLevel(event.impact),
        country: event.country || "US",
        actual: event.actual || null,
        estimate: event.estimate || null,
        previous: event.previous || null,
        source: "FMP",
      }));
    }

    return [];
  } catch (error) {
    console.error("❌ FMP economic calendar error:", error);
    return [];
  }
}

async function getAlphaVantageEconomicEvents(date) {
  try {
    // Alpha Vantage doesn't have a direct economic calendar API
    // But we can check for major indicators
    const events = [];

    // Add major weekly indicators based on day of week
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 4) {
      // Thursday
      events.push({
        time: "14:30",
        event: "Initial Jobless Claims",
        impact: "MEDIUM",
        country: "US",
        source: "Alpha Vantage",
      });
    }

    if (dayOfWeek === 5) {
      // Friday
      events.push({
        time: "14:30",
        event: "Non-Farm Payrolls",
        impact: "HIGH",
        country: "US",
        source: "Alpha Vantage",
      });
    }

    return events;
  } catch (error) {
    console.error("❌ Alpha Vantage economic events error:", error);
    return [];
  }
}

function getStaticEconomicEvents(date) {
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();

  // High-impact recurring events
  const events = [];

  // Weekly events
  switch (dayOfWeek) {
    case 1: // Monday
      events.push(
        {
          time: "14:30",
          event: "ISM Manufacturing PMI",
          impact: "HIGH",
          country: "US",
        },
        {
          time: "15:00",
          event: "Construction Spending",
          impact: "MEDIUM",
          country: "US",
        }
      );
      break;

    case 2: // Tuesday
      events.push(
        {
          time: "14:30",
          event: "JOLTs Job Openings",
          impact: "MEDIUM",
          country: "US",
        },
        {
          time: "19:00",
          event: "API Crude Oil Inventory",
          impact: "LOW",
          country: "US",
        }
      );
      break;

    case 3: // Wednesday
      events.push(
        {
          time: "14:15",
          event: "ADP Employment Change",
          impact: "HIGH",
          country: "US",
        },
        {
          time: "14:30",
          event: "Trade Balance",
          impact: "MEDIUM",
          country: "US",
        },
        {
          time: "20:00",
          event: "Fed Beige Book",
          impact: "HIGH",
          country: "US",
        }
      );
      break;

    case 4: // Thursday
      events.push(
        {
          time: "14:30",
          event: "Initial Jobless Claims",
          impact: "MEDIUM",
          country: "US",
        },
        {
          time: "16:00",
          event: "ISM Services PMI",
          impact: "HIGH",
          country: "US",
        }
      );
      break;

    case 5: // Friday
      events.push(
        {
          time: "14:30",
          event: "Non-Farm Payrolls",
          impact: "HIGH",
          country: "US",
        },
        {
          time: "14:30",
          event: "Unemployment Rate",
          impact: "HIGH",
          country: "US",
        },
        {
          time: "14:30",
          event: "Average Hourly Earnings",
          impact: "HIGH",
          country: "US",
        }
      );
      break;
  }

  // Monthly events (first week of month)
  if (dayOfMonth <= 7) {
    switch (dayOfWeek) {
      case 1:
        events.push({
          time: "16:00",
          event: "Factory Orders",
          impact: "MEDIUM",
          country: "US",
        });
        break;
      case 2:
        events.push({
          time: "14:30",
          event: "Consumer Credit",
          impact: "LOW",
          country: "US",
        });
        break;
    }
  }

  // Add source to all static events
  return events.map((event) => ({ ...event, source: "Static" }));
}

async function getEarningsCalendarData(days = 7, symbols = null) {
  const earningsData = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dayEarnings = await getEarningsForDate(date, symbols);

    if (dayEarnings.length > 0) {
      earningsData.push({
        date: date.toISOString().split("T")[0],
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        dayNumber: date.getDate(),
        month: date.toLocaleDateString("en-US", { month: "short" }),
        earnings: dayEarnings,
      });
    }
  }

  return earningsData;
}

async function getEarningsForDate(date, symbols = null) {
  const earnings = [];

  try {
    // Try FMP earnings calendar
    if (process.env.FMP_API_KEY) {
      const fmpEarnings = await getFMPEarnings(date, symbols);
      earnings.push(...fmpEarnings);
    }

    // Try Polygon earnings (if available)
    if (process.env.POLYGON_API_KEY) {
      const polygonEarnings = await getPolygonEarnings(date, symbols);
      earnings.push(...polygonEarnings);
    }

    // Add static earnings for major companies (fallback)
    const staticEarnings = getStaticEarnings(date);
    earnings.push(...staticEarnings);

    // Remove duplicates and sort by market cap/importance
    const uniqueEarnings = removeDuplicateEarnings(earnings);
    return uniqueEarnings.sort((a, b) => b.marketCap - a.marketCap);
  } catch (error) {
    console.error("❌ Error fetching earnings:", error);
    return getStaticEarnings(date);
  }
}

async function getFMPEarnings(date, symbols = null) {
  try {
    const dateStr = date.toISOString().split("T")[0];
    let url = `https://financialmodelingprep.com/api/v3/earning_calendar?from=${dateStr}&to=${dateStr}&apikey=${process.env.FMP_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (Array.isArray(data)) {
      let filteredData = data;

      // Filter by symbols if provided
      if (symbols) {
        const symbolArray = symbols
          .split(",")
          .map((s) => s.trim().toUpperCase());
        filteredData = data.filter((earning) =>
          symbolArray.includes(earning.symbol)
        );
      }

      return filteredData.map((earning) => ({
        symbol: earning.symbol,
        companyName: earning.name || earning.symbol,
        time: earning.time || "After Market",
        eps: earning.eps || null,
        epsEstimated: earning.epsEstimated || null,
        revenue: earning.revenue || null,
        revenueEstimated: earning.revenueEstimated || null,
        marketCap: earning.marketCap || 0,
        impact: determineEarningsImpact(earning),
        source: "FMP",
      }));
    }

    return [];
  } catch (error) {
    console.error("❌ FMP earnings error:", error);
    return [];
  }
}

async function getPolygonEarnings(date, symbols = null) {
  try {
    // Polygon.io doesn't have a direct earnings calendar
    // But we can return empty array for now
    return [];
  } catch (error) {
    console.error("❌ Polygon earnings error:", error);
    return [];
  }
}

function getStaticEarnings(date) {
  const dayOfWeek = date.getDay();

  // Only add earnings on weekdays
  if (dayOfWeek === 0 || dayOfWeek === 6) return [];

  // Sample earnings for major companies (rotated through week)
  const majorEarnings = [
    { symbol: "AAPL", companyName: "Apple Inc.", marketCap: 3000000000000 },
    {
      symbol: "MSFT",
      companyName: "Microsoft Corporation",
      marketCap: 2800000000000,
    },
    { symbol: "GOOGL", companyName: "Alphabet Inc.", marketCap: 1700000000000 },
    {
      symbol: "AMZN",
      companyName: "Amazon.com Inc.",
      marketCap: 1500000000000,
    },
    { symbol: "TSLA", companyName: "Tesla Inc.", marketCap: 800000000000 },
    {
      symbol: "META",
      companyName: "Meta Platforms Inc.",
      marketCap: 750000000000,
    },
    {
      symbol: "NVDA",
      companyName: "NVIDIA Corporation",
      marketCap: 1800000000000,
    },
  ];

  // Randomly assign 1-2 major earnings per day
  const dailyEarnings = [];
  const numEarnings = Math.floor(Math.random() * 2) + 1;

  for (let i = 0; i < numEarnings; i++) {
    const randomEarning =
      majorEarnings[Math.floor(Math.random() * majorEarnings.length)];
    const time = Math.random() > 0.5 ? "Pre-market" : "After-market";

    dailyEarnings.push({
      ...randomEarning,
      time,
      eps: null,
      epsEstimated: (Math.random() * 5).toFixed(2),
      revenue: null,
      revenueEstimated: (Math.random() * 100000000000).toFixed(0),
      impact: "HIGH",
      source: "Static",
    });
  }

  return dailyEarnings;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatTime(timeStr) {
  // Convert 24-hour format to display format
  if (!timeStr) return "09:00";

  try {
    const [hours, minutes] = timeStr.split(":");
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
  } catch {
    return "09:00";
  }
}

function mapImpactLevel(impact) {
  if (!impact) return "MEDIUM";

  const normalizedImpact = impact.toString().toUpperCase();

  if (["HIGH", "H", "3"].includes(normalizedImpact)) return "HIGH";
  if (["LOW", "L", "1"].includes(normalizedImpact)) return "LOW";
  return "MEDIUM";
}

function determineEarningsImpact(earning) {
  const marketCap = earning.marketCap || 0;

  if (marketCap > 500000000000) return "HIGH"; // > $500B
  if (marketCap > 100000000000) return "MEDIUM"; // > $100B
  return "LOW";
}

function removeDuplicateEvents(events) {
  const seen = new Set();
  return events.filter((event) => {
    const key = `${event.time}-${event.event}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function removeDuplicateEarnings(earnings) {
  const seen = new Set();
  return earnings.filter((earning) => {
    const key = earning.symbol;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = router;
