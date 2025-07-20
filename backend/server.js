const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-frontend-domain.vercel.app', // Replace with your actual frontend URL
    /\.vercel\.app$/,
    /\.netlify\.app$/,
    /\.render\.com$/
  ],
  credentials: true
}));
app.use(express.json());

// API Keys from environment variables
const FINNHUB_KEY = process.env.FINNHUB_KEY;
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY;
const POLYGON_KEY = process.env.POLYGON_KEY;

console.log('🚀 Starting News Impact Screener Backend...');
console.log('📊 API Keys Status:');
console.log(`   Finnhub: ${FINNHUB_KEY ? '✅ Present' : '❌ Missing'}`);
console.log(`   Alpha Vantage: ${ALPHA_VANTAGE_KEY ? '✅ Present' : '❌ Missing'}`);
console.log(`   Polygon: ${POLYGON_KEY ? '✅ Present' : '❌ Missing'}`);

// Rate limiting helper
const rateLimiter = new Map();
const RATE_LIMIT_PER_MINUTE = 50; // Adjust based on your API plan

function checkRateLimit(key) {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  if (!rateLimiter.has(key)) {
    rateLimiter.set(key, []);
  }
  
  const requests = rateLimiter.get(key);
  
  // Remove old requests
  while (requests.length > 0 && requests[0] < windowStart) {
    requests.shift();
  }
  
  if (requests.length >= RATE_LIMIT_PER_MINUTE) {
    return false;
  }
  
  requests.push(now);
  return true;
}

// Enhanced quote endpoint with better error handling
app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // Rate limiting check
    if (!checkRateLimit(`quote_${clientIp}`)) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: 60
      });
    }
    
    console.log(`📊 Fetching quote for ${symbol}`);
    
    if (!FINNHUB_KEY) {
      return res.status(500).json({ error: 'Finnhub API key not configured' });
    }
    
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`,
      {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'NewsImpactScreener/1.0'
        }
      }
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ 
          error: 'API rate limit exceeded',
          retryAfter: 60
        });
      }
      throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data && typeof data.c === 'number' && data.c > 0) {
      // Enhanced quote with additional calculated fields
      const quote = {
        symbol: symbol,
        price: Number(data.c.toFixed(2)),
        changePercent: Number((((data.c - data.pc) / data.pc) * 100).toFixed(2)),
        volume: data.v || 0,
        high: Number(data.h?.toFixed(2) || data.c.toFixed(2)),
        low: Number(data.l?.toFixed(2) || data.c.toFixed(2)),
        open: Number(data.o?.toFixed(2) || data.c.toFixed(2)),
        previousClose: Number(data.pc?.toFixed(2) || data.c.toFixed(2)),
        timestamp: new Date().toISOString(),
        
        // Estimated additional fields (in production, get from additional APIs)
        avgVolume: Math.floor((data.v || 1000000) * (0.8 + Math.random() * 0.4)),
        high52Week: Number((data.c * (1.2 + Math.random() * 0.8)).toFixed(2)),
        low52Week: Number((data.c * (0.4 + Math.random() * 0.4)).toFixed(2)),
        marketCap: estimateMarketCap(symbol, data.c)
      };
      
      console.log(`✅ Quote for ${symbol}: $${quote.price} (${quote.changePercent > 0 ? '+' : ''}${quote.changePercent}%)`);
      res.json(quote);
    } else {
      console.log(`❌ Invalid data for ${symbol}:`, data);
      res.status(404).json({ 
        error: 'No valid quote data found',
        symbol: symbol,
        receivedData: data
      });
    }
  } catch (error) {
    console.error(`❌ Error fetching quote for ${req.params.symbol}:`, error.message);
    res.status(500).json({ 
      error: 'Failed to fetch quote',
      details: error.message,
      symbol: req.params.symbol
    });
  }
});

// Enhanced news endpoint
app.get('/api/news/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // Rate limiting check
    if (!checkRateLimit(`news_${clientIp}`)) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: 60
      });
    }
    
    console.log(`📰 Fetching news for ${symbol}`);
    
    if (!FINNHUB_KEY) {
      return res.status(500).json({ error: 'Finnhub API key not configured' });
    }
    
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
      .toISOString().split('T')[0];
    
    const response = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${FINNHUB_KEY}`,
      {
        timeout: 15000, // 15 second timeout
        headers: {
          'User-Agent': 'NewsImpactScreener/1.0'
        }
      }
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ 
          error: 'API rate limit exceeded',
          retryAfter: 60
        });
      }
      throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
    }
    
    const news = await response.json();
    
    if (Array.isArray(news)) {
      // Filter and enhance news
      const filteredNews = news
        .filter(article => article.headline && article.headline.length > 10)
        .slice(0, 20) // Limit to 20 most recent
        .map(article => ({
          ...article,
          // Add sentiment placeholder (to be calculated on frontend)
          sentiment: 0,
          category: categorizeNews(article.headline),
          relevanceScore: calculateRelevance(article.headline, symbol)
        }));
      
      console.log(`✅ Found ${filteredNews.length} news articles for ${symbol}`);
      res.json(filteredNews);
    } else {
      console.log(`❌ Invalid news data for ${symbol}:`, news);
      res.json([]); // Return empty array instead of error
    }
  } catch (error) {
    console.error(`❌ Error fetching news for ${req.params.symbol}:`, error.message);
    res.status(500).json({ 
      error: 'Failed to fetch news',
      details: error.message,
      symbol: req.params.symbol
    });
  }
});

// Batch endpoint for multiple symbols
app.post('/api/batch/quotes', async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'Invalid symbols array' });
    }
    
    if (symbols.length > 50) {
      return res.status(400).json({ error: 'Too many symbols. Maximum 50 allowed.' });
    }
    
    console.log(`📊 Batch fetching quotes for ${symbols.length} symbols`);
    
    // Process in smaller batches to avoid rate limits
    const batchSize = 10;
    const results = {};
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(async (symbol) => {
        try {
          const response = await fetch(`http://localhost:${PORT}/api/quote/${symbol}`);
          if (response.ok) {
            const data = await response.json();
            return { symbol, data, success: true };
          } else {
            return { symbol, error: `HTTP ${response.status}`, success: false };
          }
        } catch (error) {
          return { symbol, error: error.message, success: false };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(result => {
        if (result.success) {
          results[result.symbol] = result.data;
        } else {
          console.log(`❌ Failed to fetch ${result.symbol}: ${result.error}`);
        }
      });
      
      // Add delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`✅ Batch complete: ${Object.keys(results).length}/${symbols.length} successful`);
    res.json(results);
  } catch (error) {
    console.error('❌ Batch quote error:', error);
    res.status(500).json({ error: 'Batch processing failed', details: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    apiKeys: {
      finnhub: !!FINNHUB_KEY,
      alphavantage: !!ALPHA_VANTAGE_KEY,
      polygon: !!POLYGON_KEY
    },
    rateLimit: {
      maxPerMinute: RATE_LIMIT_PER_MINUTE,
      currentConnections: rateLimiter.size
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'News Impact Screener Backend',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      quote: '/api/quote/:symbol',
      news: '/api/news/:symbol',
      batchQuotes: '/api/batch/quotes'
    }
  });
});

// Helper functions
function estimateMarketCap(symbol, price) {
  // Rough estimates based on typical shares outstanding
  const estimates = {
    'AAPL': price * 15.6e9,
    'MSFT': price * 7.4e9,
    'GOOGL': price * 12.9e9,
    'TSLA': price * 3.2e9,
    'NVDA': price * 2.5e9,
    'META': price * 2.7e9,
    'AMZN': price * 10.5e9,
  };
  
  return estimates[symbol] || price * 100e6; // Default estimate
}

function categorizeNews(headline) {
  const lower = headline.toLowerCase();
  if (lower.includes('earnings') || lower.includes('revenue')) return 'earnings';
  if (lower.includes('upgrade') || lower.includes('downgrade')) return 'analyst';
  if (lower.includes('fda') || lower.includes('approval')) return 'regulatory';
  if (lower.includes('acquisition') || lower.includes('merger')) return 'ma';
  if (lower.includes('product') || lower.includes('launch')) return 'product';
  return 'general';
}

function calculateRelevance(headline, symbol) {
  const symbolMentions = (headline.match(new RegExp(symbol, 'gi')) || []).length;
  const headlineLength = headline.length;
  return Math.min(100, (symbolMentions * 50) + (headlineLength > 50 ? 20 : 10));
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 News Impact Screener Backend running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});