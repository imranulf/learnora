# Quick Test - Add Content to Search

## Problem
Search returns no results because there's **no content in the database yet**.

## Solution
Add content via browser console or backend directly.

---

## Option 1: Browser Console (Easy)

1. Open http://localhost:5175/content-discovery
2. Open browser console (F12)
3. Get your token:
```javascript
const token = localStorage.getItem('auth_token');
console.log('Token:', token);
```

4. Crawl some URLs:
```javascript
// Crawl Python documentation
await fetch('http://localhost:8000/api/v1/content-discovery/crawl', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        urls: [
            'https://docs.python.org/3/tutorial/introduction.html',
            'https://react.dev/learn',
            'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Introduction'
        ],
        custom_keywords: ['python', 'javascript', 'react', 'programming']
    })
}).then(r => r.json()).then(console.log);
```

5. Now search for "Python" or "React" - you should see results!

---

## Option 2: Backend Script (Alternative)

Create a test file:

```python
# test_add_content.py
import requests

# Your token (get from browser localStorage)
TOKEN = "your_token_here"

# Crawl URLs
response = requests.post(
    'http://localhost:8000/api/v1/content-discovery/crawl',
    headers={
        'Authorization': f'Bearer {TOKEN}',
        'Content-Type': 'application/json'
    },
    json={
        'urls': [
            'https://docs.python.org/3/tutorial/introduction.html',
            'https://react.dev/learn',
        ],
        'custom_keywords': ['python', 'react', 'tutorial']
    }
)

print(response.json())
```

Run: `python test_add_content.py`

---

## Option 3: Manual Content Indexing

If crawling doesn't work, manually index content:

```javascript
await fetch('http://localhost:8000/api/v1/content-discovery/index', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        items: [
            {
                title: "Python Tutorial",
                description: "Learn Python programming basics",
                content_type: "tutorial",
                url: "https://docs.python.org/3/tutorial/",
                difficulty: "beginner",
                duration_minutes: 60,
                tags: ["python", "programming", "tutorial"],
                source: "Python.org"
            },
            {
                title: "React Documentation",
                description: "Official React library documentation",
                content_type: "documentation",
                url: "https://react.dev/",
                difficulty: "intermediate",
                duration_minutes: 45,
                tags: ["react", "javascript", "frontend"],
                source: "React.dev"
            }
        ]
    })
}).then(r => r.json()).then(console.log);
```

---

## Verify Content

Check if content was added:

```javascript
await fetch('http://localhost:8000/api/v1/content-discovery/stats', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

Should show: `{ total_indexed: 2 }` (or more)

---

## Then Test Search

```javascript
await fetch('http://localhost:8000/api/v1/content-discovery/search', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        query: 'Python tutorial',
        strategy: 'hybrid',
        top_k: 10,
        use_nlp: true
    })
}).then(r => r.json()).then(console.log);
```

You should see results! 🎉
