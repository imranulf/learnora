# Testing Content Discovery Search via UI

## ✅ System Status

### Backend (Port 8000)
- Status: **RUNNING**
- API Endpoint: `http://localhost:8000/api/v1/content-discovery/search`
- Features Enabled:
  - ✅ Content Crawler
  - ✅ API Fetcher (YouTube, Medium, GitHub, Perplexity AI)
  - ✅ NLP Processing
  - ✅ Auto-Discovery

### Frontend (Port 5173)
- Status: **RUNNING**
- URL: `http://localhost:5173/content-discovery`
- Features:
  - ✅ Search interface
  - ✅ Auto-discovery enabled by default
  - ✅ NLP processing enabled
  - ✅ Filter by content type and difficulty
  - ✅ Multiple search strategies (BM25, Dense, Hybrid)

## 🧪 How to Test Search in UI

### Method 1: Via Web Interface (Recommended)

1. **Open the web app**: Navigate to http://localhost:5173/content-discovery
2. **Sign in** if not already signed in
3. **Enter a search query** (e.g., "python tutorial", "react hooks", "machine learning")
4. **Click Search** or press Enter

**What happens:**
- Frontend sends request to backend with `auto_discover: true` and `discovery_sources: ['youtube', 'medium', 'github']`
- Backend searches existing indexed content
- If no results found, automatically fetches new content from YouTube, Medium, and GitHub
- Uses Perplexity AI to enhance content with tags, difficulty, quality scores
- Returns 16+ results (typically 5 YouTube + 5 Medium + 1-5 GitHub + web results)

### Method 2: Via Browser Console (Advanced Testing)

Open browser console (F12) on http://localhost:5173/content-discovery and run:

```javascript
// Get auth token
const token = localStorage.getItem('auth_token');

// Test search with auto-discovery
const response = await fetch('http://localhost:8000/api/v1/content-discovery/search', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        query: "python tutorial",
        strategy: "hybrid",
        top_k: 20,
        use_nlp: true,
        auto_discover: true,
        discovery_sources: ["youtube", "medium", "github"]
    })
});

const data = await response.json();
console.log(`Found ${data.results.length} results!`);
console.log(`Total indexed: ${data.stats.total_indexed}`);
console.log('Results:', data.results);
```

## 📊 Expected Results

### First Search (Cold Start)
- **Auto-discovery triggers**: Fetches from YouTube, Medium, GitHub APIs
- **Results**: 16+ items discovered
- **AI Enhancement**: ~94% of items enhanced with Perplexity AI
- **Processing time**: 3-5 seconds (due to API calls)

### Subsequent Searches (Cached)
- **Reuses indexed content**: No API calls needed
- **Results**: Instant search from vector database
- **Processing time**: <100ms

## 🎯 Test Queries

Try these queries to test different scenarios:

### Programming Topics
- "python tutorial"
- "react hooks"
- "typescript best practices"
- "node.js api"

### Data Science
- "machine learning basics"
- "data visualization python"
- "pandas tutorial"

### Web Development
- "css grid layout"
- "responsive design"
- "vue.js tutorial"

## 🔍 Search Features

### Search Strategies
1. **BM25**: Keyword-based search (fast, precise)
2. **Dense**: Semantic search (understands context)
3. **Hybrid** (Default): Combines both strategies (best results)

### Filters
- **Content Type**: All, Article, Video, Tutorial, Course, Documentation
- **Difficulty**: All, Beginner, Intermediate, Advanced, Expert

### Auto-Discovery Sources
- **YouTube**: Educational videos (5 per search)
- **Medium**: Technical articles (5 per search)
- **GitHub**: Code repositories (1-5 per search)
- **DuckDuckGo**: Web content (5 per search)

## 🤖 AI Enhancement (Perplexity)

Each discovered item is enhanced with:
- **Difficulty Level**: Auto-detected (beginner/intermediate/advanced/expert)
- **Quality Score**: 1-10 rating
- **Tags**: 5-8 semantic keywords
- **Learning Outcomes**: 3 bullet points

**Success Rate**: 93.75% (15/16 items in testing)

## 🚨 Troubleshooting

### No Results Found
**Cause**: No indexed content yet
**Solution**: Search will auto-discover content from APIs (wait 3-5 seconds)

### "Your session has expired"
**Cause**: Auth token expired or missing
**Solution**: Sign out and sign in again

### Search Taking Too Long
**Cause**: First search triggers API calls
**Solution**: Wait for auto-discovery to complete (normal for first search)

### Empty Results After Filter
**Cause**: No content matches selected filters
**Solution**: Change filters to "All" or try different query

## 📝 Current Configuration

### API Keys (Configured ✅)
- `YOUTUBE_API_KEY`: Configured
- `PERPLEXITY_API_KEY`: Configured
- `LANGSMITH_API_KEY`: Configured (tracing enabled)

### Rate Limits
- **YouTube**: 10,000 units/day (~100 searches) - FREE
- **Medium**: Unlimited - FREE
- **GitHub**: Unlimited - FREE
- **DuckDuckGo**: Unlimited - FREE
- **Perplexity**: 5 requests/day FREE, then $0.001/request

### Daily Usage Estimate
- **Free tier**: 5 AI-enhanced searches/day
- **Light usage**: ~$0.15/day (~$4.50/month)
- **Heavy usage**: ~$0.50/day (~$15/month)

## 🎉 Success Indicators

You'll know it's working when:
1. ✅ Search returns 16+ results for common topics (e.g., "python tutorial")
2. ✅ Results include YouTube videos with thumbnails
3. ✅ Results include Medium articles with authors
4. ✅ Results include GitHub repositories
5. ✅ Each result shows tags, difficulty, quality score
6. ✅ Filters work (content type, difficulty)
7. ✅ Search strategies work (BM25, Dense, Hybrid)

## 📖 Documentation

For more details, see:
- **API_FETCHER_GUIDE.md**: Complete API fetcher documentation
- **API_FETCHER_IMPLEMENTATION_COMPLETE.md**: Implementation details
- **UNIVERSAL_CONTENT_DISCOVERY.md**: Content discovery system overview
- **NLP_DOCUMENTATION.md**: NLP features documentation

---

**Last Updated**: November 2, 2025
**Status**: ✅ All systems operational
**Test Status**: ✅ Verified working (16 items, 15 AI-enhanced)
