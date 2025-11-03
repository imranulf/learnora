# API Content Fetcher Implementation Guide

## 🎯 Overview

The API Content Fetcher automatically discovers and indexes educational content from multiple sources:

1. **YouTube Data API** - Educational videos
2. **Medium RSS** - Technical articles  
3. **DuckDuckGo Search** - Web content (tutorials, documentation)
4. **GitHub Search** - Repositories and code examples
5. **Perplexity AI** - Content analysis and metadata extraction

## 🚀 Quick Start

### 1. Get API Keys (5 minutes)

#### YouTube Data API (Optional but Recommended)
```bash
1. Go to: https://console.cloud.google.com/apis/credentials
2. Create a new project or select existing
3. Enable "YouTube Data API v3"
4. Create credentials → API Key
5. Copy your API key

Free tier: 10,000 units/day (≈100 searches/day)
```

#### Perplexity API (Optional but Recommended)
```bash
1. Go to: https://www.perplexity.ai/settings/api
2. Click "Generate API Key"
3. Copy your API key

Free tier: 5 requests/day
Paid tier: $0.001/request (very affordable!)
```

#### DuckDuckGo & Medium (No API Key Needed!)
- DuckDuckGo: Completely free, unlimited
- Medium RSS: Completely free, unlimited

### 2. Configure API Keys

**Option A: Using .env file (Recommended)**
```bash
cd core-service
cp .env.example .env
# Edit .env and add:
YOUTUBE_API_KEY=your_actual_youtube_key
PERPLEXITY_API_KEY=your_actual_perplexity_key
LANGSMITH_API_KEY=your_actual_langsmith_key  # Optional for tracing
```

**Option B: Using environment variables**
```powershell
# Windows PowerShell
$env:YOUTUBE_API_KEY="your_actual_youtube_key"
$env:PERPLEXITY_API_KEY="your_actual_perplexity_key"
$env:LANGSMITH_API_KEY="your_actual_langsmith_key"
```

### 3. Test the API Fetcher

**Test without API keys (DuckDuckGo only):**
```python
from app.features.content_discovery.api_fetcher import APIContentFetcher

# Create fetcher (works without API keys!)
fetcher = APIContentFetcher()

# Search web content using DuckDuckGo
results = fetcher.fetch_coursera_content("python tutorial", max_results=5)
print(f"Found {len(results)} results")
for content in results:
    print(f"- {content.title} ({content.content_type})")
```

**Test with full API keys:**
```python
# Create fetcher with API keys
fetcher = APIContentFetcher({
    'youtube': 'your_youtube_key',
    'perplexity': 'your_perplexity_key'
})

# Search YouTube videos
videos = fetcher.fetch_youtube_content("machine learning basics", max_results=5)
print(f"\n📹 YouTube Videos: {len(videos)}")

# Search Medium articles
articles = fetcher.fetch_medium_content("react hooks", max_results=5)
print(f"\n📝 Medium Articles: {len(articles)}")

# Search GitHub repos
repos = fetcher.fetch_github_content("python tutorial", max_results=5)
print(f"\n💻 GitHub Resources: {len(repos)}")

# General web search with DuckDuckGo
web_content = fetcher.fetch_coursera_content("data structures", max_results=10)
print(f"\n🌐 Web Content: {len(web_content)}")
```

## 🔧 Features

### 1. Multi-Source Content Discovery

#### YouTube Videos (with API key)
- Searches educational videos (category 27)
- Extracts: title, description, duration, channel, thumbnail
- Relevance-based ranking
- Duration parsing (PT15M30S → 15 minutes)

#### Medium Articles (no API key)
- Searches via RSS feeds by tag/topic
- Extracts: title, author, published date
- Clean HTML from descriptions
- Reading time estimation (200 words/min)

#### GitHub Resources (no API key)
- Searches via DuckDuckGo for GitHub repos
- Focuses on: tutorials, documentation, guides
- Filters for actual repo URLs
- Extracts README content when available

#### Web Content (no API key)
- Searches educational domains:
  - FreeCodeCamp, Real Python, GeeksForGeeks
  - MDN, W3Schools, Tutorialspoint
  - Dev.to, Stack Overflow
- Prioritizes educational quality
- Content type classification

### 2. Perplexity AI Content Analysis (with API key)

Automatically enhances content with:
- **Accurate difficulty level** (beginner/intermediate/advanced/expert)
- **Relevant tags** (5-8 keywords extracted)
- **Quality score** (1-10 based on content quality)
- **Learning outcomes** (3 bullet points of what you'll learn)

Example:
```json
{
  "title": "Python Lists Tutorial",
  "difficulty": "beginner",  // ← Perplexity analyzed
  "tags": ["python", "lists", "data structures", "tutorial"],  // ← Perplexity extracted
  "metadata": {
    "quality_score": 9,  // ← Perplexity rated
    "learning_outcomes": [  // ← Perplexity generated
      "Understand list operations and methods",
      "Master list comprehensions and iteration",
      "Learn common list patterns and best practices"
    ],
    "ai_analyzed": true
  }
}
```

### 3. Intelligent Metadata Extraction

#### Automatic Difficulty Detection
```python
# Scans title + description for keywords:
"beginner", "intro", "basics" → beginner
"intermediate", "beyond basics" → intermediate  
"advanced", "expert", "deep dive" → advanced
```

#### Smart Tag Extraction
```python
# Combines:
1. Tech keywords (python, react, api, etc.)
2. Frequent words (word frequency analysis)
3. Gemini AI suggestions (if enabled)

# Result: 5-10 relevant, unique tags
```

#### Content Type Classification
```python
youtube.com → "video"
github.com → "documentation"
"tutorial" in title → "tutorial"
blog/article domains → "article"
course platforms → "course"
```

#### Reading Time Estimation
```python
# 200 words/minute average
words = len(description.split())
minutes = max(1, words // 200)
```

## 📊 API Costs & Limits

| Service | Cost | Free Tier | Rate Limit |
|---------|------|-----------|------------|
| **DuckDuckGo** | FREE | Unlimited | ~100/min |
| **Medium RSS** | FREE | Unlimited | No limit |
| **YouTube API** | FREE then $0.001/search | 10K units/day | 100 searches |
| **Perplexity API** | FREE then $0.001/request | 5 req/day | Varies |

**Daily Cost Estimate (after free tier):**
- 100 searches/day with YouTube + Perplexity: **$0.15/day** (~$4.50/month)
- Using only free sources (DuckDuckGo + Medium): **$0/day** 🎉

## 🔄 Integration with Content Discovery

The API Fetcher is already integrated into the content discovery system:

```python
# In content_discovery/service.py
from .api_fetcher import APIContentFetcher

class ContentDiscoveryService:
    def __init__(self, db: Session):
        self.fetcher = APIContentFetcher()  # Auto-loads from env
    
    async def auto_discover_content(self, query: str):
        """Automatically fetch from all sources."""
        
        # Fetch from all sources in parallel
        results = []
        results.extend(self.fetcher.fetch_youtube_content(query, max_results=5))
        results.extend(self.fetcher.fetch_medium_content(query, max_results=5))
        results.extend(self.fetcher.fetch_github_content(query, max_results=5))
        results.extend(self.fetcher.fetch_coursera_content(query, max_results=10))
        
        # Index all results
        for content in results:
            self.index_content(content)
        
        return results
```

## 🎯 Usage Examples

### Example 1: Search for Python Tutorials

```python
fetcher = APIContentFetcher()

# Returns 25 results from all sources
results = fetcher.fetch_youtube_content("python tutorial", 5) + \
          fetcher.fetch_medium_content("python tutorial", 5) + \
          fetcher.fetch_github_content("python tutorial", 5) + \
          fetcher.fetch_coursera_content("python tutorial", 10)

print(f"Total: {len(results)} resources")

# Sample output:
# ✅ Fetched 5 YouTube videos
# ✅ Fetched 5 Medium articles  
# ✅ Fetched 5 GitHub resources
# ✅ Fetched 10 web resources
# Total: 25 resources
```

### Example 2: With Perplexity Enhancement

```python
# With Perplexity API key configured
fetcher = APIContentFetcher()

results = fetcher.fetch_youtube_content("react hooks tutorial", 3)

for content in results:
    print(f"\nTitle: {content.title}")
    print(f"Difficulty: {content.difficulty}")  # Perplexity analyzed
    print(f"Quality: {content.metadata['quality_score']}/10")  # Perplexity rated
    print(f"Tags: {', '.join(content.tags)}")  # Perplexity enhanced
    print(f"Outcomes:")
    for outcome in content.metadata.get('learning_outcomes', []):
        print(f"  - {outcome}")
```

### Example 3: Custom Search Strategy

```python
def search_learning_path(topic: str):
    """Create a learning path from multiple sources."""
    fetcher = APIContentFetcher()
    
    # 1. Start with YouTube intro videos (beginner)
    videos = fetcher.fetch_youtube_content(f"{topic} beginner tutorial", 3)
    
    # 2. Get Medium articles (intermediate)
    articles = fetcher.fetch_medium_content(f"{topic} guide", 5)
    
    # 3. Find GitHub examples (advanced)
    repos = fetcher.fetch_github_content(f"{topic} examples", 3)
    
    # 4. Get comprehensive tutorials (all levels)
    tutorials = fetcher.fetch_coursera_content(f"{topic} complete guide", 10)
    
    return {
        'beginner': videos,
        'intermediate': articles,
        'advanced': repos,
        'comprehensive': tutorials
    }

# Example: Create Python learning path
path = search_learning_path("python")
```

## 🐛 Troubleshooting

### Issue: "YouTube API key not configured"
**Solution:** Add YOUTUBE_API_KEY to .env file or use DuckDuckGo alternative

### Issue: "Perplexity analysis skipped"
**Solution:** Add PERPLEXITY_API_KEY to .env file. Content still works without Perplexity - it just won't have AI-enhanced metadata.

### Issue: "No results found"
**Possible causes:**
1. Query too specific (try broader terms)
2. Network connectivity issues
3. API rate limits reached (wait and retry)

**Solution:**
```python
# Fallback strategy
results = fetcher.fetch_coursera_content(query)  # DuckDuckGo always works
if not results:
    results = fetcher.fetch_medium_content(query)  # Try Medium RSS
```

### Issue: Rate limit exceeded
**YouTube:** 10,000 units/day limit
- Each search = 100 units
- Limit: 100 searches/day
- **Solution:** Cache results, use DuckDuckGo as fallback

**Gemini:** 1,500 requests/day limit
- **Solution:** Disable Gemini for bulk imports, enable for user searches

## 🔒 Security Best Practices

### 1. Never Commit API Keys
```bash
# .gitignore should include:
.env
*.env
.env.local
```

### 2. Use Environment Variables
```python
# ✅ GOOD
api_key = os.getenv('YOUTUBE_API_KEY')

# ❌ BAD
api_key = "AIzaSy..."  # Never hardcode!
```

### 3. Rotate Keys Regularly
- YouTube: Regenerate every 90 days
- Gemini: Regenerate every 90 days

### 4. Restrict API Keys
```bash
# In Google Cloud Console:
1. Set "Application restrictions" → HTTP referrers
2. Add allowed domains: localhost, your-domain.com
3. Set "API restrictions" → YouTube Data API v3 only
```

## 📈 Performance Tips

### 1. Parallel Fetching
```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

async def fetch_all_parallel(query: str):
    with ThreadPoolExecutor(max_workers=4) as executor:
        loop = asyncio.get_event_loop()
        
        youtube = loop.run_in_executor(executor, fetcher.fetch_youtube_content, query, 5)
        medium = loop.run_in_executor(executor, fetcher.fetch_medium_content, query, 5)
        github = loop.run_in_executor(executor, fetcher.fetch_github_content, query, 5)
        web = loop.run_in_executor(executor, fetcher.fetch_coursera_content, query, 10)
        
        results = await asyncio.gather(youtube, medium, github, web)
        return [item for sublist in results for item in sublist]
```

### 2. Caching Strategy
```python
from functools import lru_cache
from datetime import datetime, timedelta

# Cache for 1 hour
cache = {}
CACHE_TTL = timedelta(hours=1)

def fetch_with_cache(query: str):
    if query in cache:
        result, timestamp = cache[query]
        if datetime.now() - timestamp < CACHE_TTL:
            return result
    
    result = fetcher.fetch_youtube_content(query)
    cache[query] = (result, datetime.now())
    return result
```

### 3. Batch Processing
```python
# Process multiple queries efficiently
queries = ["python", "javascript", "react", "node"]

for query in queries:
    results = fetcher.fetch_coursera_content(query, max_results=5)
    # Index immediately
    for content in results:
        service.index_content(content)
    
    # Rate limiting (avoid hitting API limits)
    time.sleep(1)  # 1 second between queries
```

## 🎓 Learning Resources

### Get Your API Keys
1. **YouTube Data API:** https://console.cloud.google.com/apis/credentials
2. **Perplexity API:** https://www.perplexity.ai/settings/api

### API Documentation
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Perplexity API](https://docs.perplexity.ai/)
- [DuckDuckGo Search](https://github.com/deedy5/ddgs)
- [feedparser (Medium)](https://feedparser.readthedocs.io/)

## 🚀 Next Steps

1. **Get API keys** (5 minutes)
2. **Configure .env** (1 minute)
3. **Test in browser console** (see below)
4. **Enable auto-discovery** in content discovery settings

### Test in Browser Console

```javascript
// 1. Open http://localhost:5175/content-discovery
// 2. Open browser console (F12)
// 3. Run:

const token = localStorage.getItem('auth_token');

// Trigger auto-discovery (fetches from all sources!)
const response = await fetch('http://localhost:8000/api/v1/content-discovery/auto-discover', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        query: "python tutorial"
    })
});

const data = await response.json();
console.log(`✅ Discovered ${data.items_discovered} items!`);

// Now search should return real results!
```

## 🎉 Success Indicators

✅ **Working correctly if you see:**
```
✅ Perplexity AI initialized for content analysis
✅ Fetched 5 YouTube videos for 'python tutorial'
✅ Fetched 5 Medium articles for 'python tutorial'
✅ Fetched 5 GitHub resources for 'python tutorial'
✅ Fetched 5 web resources for 'python tutorial'
```

⚠️ **Still works without API keys:**
```
⚠️ YouTube API key not configured - skipping YouTube search
⚠️ Perplexity API not configured - basic analysis only
✅ Fetched 5 Medium articles for 'python tutorial'
✅ Fetched 10 web resources for 'python tutorial'
```

🎯 **Full feature set requires:**
- YOUTUBE_API_KEY (videos)
- PERPLEXITY_API_KEY (enhanced analysis)
- DuckDuckGo (always free, no setup)
- Medium RSS (always free, no setup)

---

**Your API Fetcher is now ready to discover content from across the web! 🚀**
