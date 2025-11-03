# Content Discovery - Quick API Reference

**Quick copy-paste commands for testing Content Discovery**

---

## 🔑 Get Auth Token (Run First)

```javascript
const token = localStorage.getItem('auth_token');
```

---

## 📊 Get Stats

```javascript
fetch('http://localhost:8000/api/v1/content-discovery/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

---

## 🕷️ Crawl URLs (AI Feature)

```javascript
fetch('http://localhost:8000/api/v1/content-discovery/crawl', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        urls: [
            'https://docs.python.org/3/tutorial/introduction.html',
            'https://docs.python.org/3/tutorial/controlflow.html'
        ],
        custom_keywords: ['python', 'tutorial', 'programming', 'functions', 'classes']
    })
}).then(r => r.json()).then(console.log);
```

---

## 🔍 Search Content (AI + NLP)

```javascript
fetch('http://localhost:8000/api/v1/content-discovery/search', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        query: 'Python functions tutorial for beginners',
        strategy: 'hybrid',  // 'bm25' | 'dense' | 'hybrid'
        top_k: 5,
        use_nlp: true
    })
}).then(r => r.json()).then(console.log);
```

---

## 📚 List All Content

```javascript
fetch('http://localhost:8000/api/v1/content-discovery/contents?skip=0&limit=10', {
    headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

---

## 🏷️ Set Custom Keywords

```javascript
fetch('http://localhost:8000/api/v1/content-discovery/set-keywords', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        keywords: ['python', 'react', 'javascript', 'typescript', 'django', 'flask']
    })
}).then(r => r.json()).then(console.log);
```

---

## 🎯 Complete Test Workflow

```javascript
// 1. Set keywords
await fetch('http://localhost:8000/api/v1/content-discovery/set-keywords', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        keywords: ['python', 'programming', 'tutorial']
    })
}).then(r => r.json()).then(d => console.log('✅ Keywords set:', d));

// 2. Crawl content
await fetch('http://localhost:8000/api/v1/content-discovery/crawl', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        urls: ['https://docs.python.org/3/tutorial/introduction.html'],
        custom_keywords: ['python', 'tutorial']
    })
}).then(r => r.json()).then(d => console.log('🕷️ Crawled:', d));

// 3. Search
await fetch('http://localhost:8000/api/v1/content-discovery/search', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        query: 'Python basics',
        strategy: 'hybrid',
        top_k: 5,
        use_nlp: true
    })
}).then(r => r.json()).then(d => {
    console.log('🔍 Search Results:', d);
    d.results.forEach((r, i) => {
        console.log(`  ${i+1}. ${r.title} (${r.score.toFixed(3)})`);
    });
});

// 4. Check stats
await fetch('http://localhost:8000/api/v1/content-discovery/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(d => console.log('📊 Stats:', d));
```

---

## 🌐 Good Test URLs

### Python
- `https://docs.python.org/3/tutorial/introduction.html`
- `https://docs.python.org/3/tutorial/controlflow.html`
- `https://docs.python.org/3/tutorial/datastructures.html`

### React
- `https://react.dev/learn`
- `https://react.dev/learn/thinking-in-react`

### JavaScript
- `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Introduction`

### General
- `https://www.w3schools.com/python/`
- `https://www.w3schools.com/js/`

---

## ✅ Quick Checks

**Did crawling work?**
```javascript
fetch('http://localhost:8000/api/v1/content-discovery/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(d => console.log('Total indexed:', d.total_indexed));
```

**View crawled content:**
```javascript
fetch('http://localhost:8000/api/v1/content-discovery/contents', {
    headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(items => items.forEach(item => 
    console.log(`- ${item.title}\n  Tags: ${item.tags.join(', ')}`)
));
```

---

## 🎨 Frontend UI Testing

1. Go to: `http://localhost:5173/content-discovery`
2. Enter search query: `"Python tutorial"`
3. Select strategy: `Hybrid`
4. Click **Search**
5. View results (must have crawled content first!)

---

## 🐛 Quick Troubleshooting

**No results?**
- Check if content was crawled (run stats check)
- Try simpler query
- Verify backend is running

**Crawl failed?**
- Check URL is accessible
- Ensure it's HTML (not PDF/video)
- Try a different URL

**Token expired?**
- Re-sign in to app
- Get new token from localStorage

---

**Copy, paste, test! 🚀**
