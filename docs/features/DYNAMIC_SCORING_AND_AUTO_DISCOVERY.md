# Dynamic Scoring & Auto-Discovery Guide

**Understanding how Learnora's AI-powered content discovery works**

---

## 🎯 **Is Scoring Fixed or Dynamic?**

### **Answer: FULLY DYNAMIC! ✅**

The scoring system is **highly dynamic** with multiple adaptive layers:

---

## 📊 **Scoring System Architecture**

### **Layer 1: Base Vector Search (Dynamic)**

#### **BM25 Scoring (Keyword-Based)**
```python
# Formula (simplified):
score = IDF(term) × (TF(term) × (k1 + 1)) / (TF(term) + k1 × (1 - b + b × doc_length/avg_doc_length))

# Where:
- IDF = log((total_docs - doc_freq + 0.5) / (doc_freq + 0.5))
- TF = term frequency in document
- k1 = 1.6 (term saturation parameter)
- b = 0.75 (length normalization)
```

**Dynamic Elements:**
- ✅ `total_docs` - Updates with every crawl
- ✅ `doc_freq` - Recalculated when new content indexed
- ✅ `avg_doc_length` - Recomputed on index rebuild
- ✅ Term frequencies - Unique per document

**Result:** Scores change every time you add new content!

---

#### **Dense Scoring (Semantic/TF-IDF)**
```python
# Formula:
score = cosine_similarity(query_vector, document_vector)
     = dot(query, doc) / (||query|| × ||doc||)

# TF-IDF calculation:
tf = 1 + log(term_count)
idf = log((total_docs + 1) / (doc_freq + 1)) + 1
tfidf = tf × idf
```

**Dynamic Elements:**
- ✅ Document vectors - Rebuilt on every index update
- ✅ IDF scores - Change with corpus size
- ✅ Vector norms - Recalculated per document
- ✅ Query vector - Generated fresh each search

**Result:** Semantic relationships evolve as content grows!

---

#### **Hybrid Scoring (Best of Both Worlds)**
```python
# Formula:
hybrid_score = (dense_weight × dense_score) + ((1 - dense_weight) × bm25_score)

# Default configuration:
dense_weight = 0.65  # 65% semantic, 35% keyword
```

**Dynamic Elements:**
- ✅ Combines both BM25 and Dense scores
- ✅ Balances exact matching with semantic understanding
- ✅ Adjusts based on query type (NLP can modify weights)

---

### **Layer 2: NLP Enhancement (Adaptive)**

#### **Query Processing**
```python
# Original query
"Python functions for beginners"

# After NLP processing:
processed_query = "Python functions for beginners tutorial guide walkthrough " \
                  "novice starter introductory basic learn study understand"

# NLP extracts:
intent: "learning" (vs tutorial, reference, project)
entities: {
    topics: ["python"],
    difficulty: ["beginner"],
    formats: []
}
key_terms: ["python", "functions", "beginners"]
```

**Dynamic Elements:**
- ✅ Synonym expansion - Increases recall
- ✅ Intent detection - Filters content type
- ✅ Entity extraction - Boosts relevant results
- ✅ Difficulty matching - Smart filtering

---

### **Layer 3: Personalization Boosts (User-Adaptive)**

```python
# Base search score: 0.85

# Apply boosts:
if content.content_type in user.preferred_formats:
    score *= 1.1  # +10% boost

if content.duration_minutes <= user.available_time_daily:
    score *= 1.05  # +5% boost

if content.difficulty == detected_difficulty_from_query:
    score *= 1.2  # +20% boost (applied in NLP filtering)

# Final score: 0.85 × 1.1 × 1.05 × 1.2 = 1.18
```

**Dynamic Elements:**
- ✅ User preferences - Updated per user
- ✅ Time availability - Changes daily
- ✅ Learning history - Evolves with usage
- ✅ Difficulty preference - Adapts to progress

---

### **Layer 4: Content Freshness (Time-Based)**

```python
# Future enhancement (not yet implemented):
recency_boost = 1.0 + (0.1 * days_since_publication / 365)
```

**Potential for:**
- ✅ Boost newer content
- ✅ Decay old content
- ✅ Trending topics
- ✅ Seasonal relevance

---

## 🚀 **Auto-Discovery: Dynamic Crawling on Search**

### **How It Works**

```python
# Backend logic (service.py):
def discover_and_personalize(query, auto_discover=True):
    # 1. Process query with NLP
    nlp_results = nlp.process_query(query)
    
    # 2. Auto-discover new content if enabled
    if auto_discover and api_fetcher:
        new_count = fetch_and_index_from_apis(query)
        if new_count > 0:
            refresh_content = True  # Force cache bypass
    
    # 3. Search with updated index
    ranked = vector_db.search(processed_query)
    
    # 4. Personalize results
    return personalize_results(ranked, user_profile)
```

---

### **Best Implementation: Search Button Auto-Discovery**

**✅ ALREADY IMPLEMENTED! (Just updated)**

```typescript
// Frontend - ContentDiscovery.tsx
const response = await searchContent({
    query: query.trim(),
    strategy: searchStrategy,
    top_k: 20,
    use_nlp: true,
    auto_discover: true,  // ✨ Enables automatic crawling
    discovery_sources: ['youtube', 'medium', 'github']
}, session.access_token);
```

**What Happens:**
1. User enters: `"React hooks tutorial"`
2. Backend searches existing content
3. **If few results:** Automatically fetches from YouTube/Medium/GitHub APIs
4. Indexes new content
5. Re-runs search with expanded corpus
6. Returns enriched results

---

## 🎨 **User Experience Flow**

### **Scenario 1: Fresh Database (No Content)**

```
User: Search "Python async await"
  ↓
System: No results in index
  ↓
Auto-Discovery: Fetches from YouTube, Medium, GitHub
  ↓
Indexing: 15 new articles/videos indexed
  ↓
Re-Search: Returns 15 relevant results
  ↓
User: Sees results immediately! 🎉
```

---

### **Scenario 2: Existing Content (Partial Match)**

```
User: Search "Advanced React patterns"
  ↓
System: Found 3 results (beginner content only)
  ↓
Auto-Discovery: Detects "advanced" difficulty gap
  ↓
Fetches: Advanced React content from APIs
  ↓
Indexing: 8 new advanced articles added
  ↓
Re-Search: Returns 11 results (3 old + 8 new)
  ↓
User: Gets exactly what they need! 🎯
```

---

### **Scenario 3: Rich Database (Good Coverage)**

```
User: Search "JavaScript promises"
  ↓
System: Found 20+ results
  ↓
Auto-Discovery: Skipped (sufficient results)
  ↓
Returns: Ranked results immediately
  ↓
User: Fast results! ⚡
```

---

## 🔧 **Configuration Options**

### **Enable/Disable Auto-Discovery**

**Per Search (Frontend):**
```typescript
await searchContent({
    query: "my query",
    auto_discover: true,  // Enable
    // OR
    auto_discover: false, // Disable
    discovery_sources: ['youtube', 'medium']  // Choose sources
}, token);
```

**Globally (API Call):**
```javascript
// Enable for all searches
await fetch('http://localhost:8000/api/v1/content-discovery/enable-auto-discovery?enabled=true', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
});
```

---

### **Search Strategy Selection**

```typescript
// BM25 - Best for exact keyword matching
strategy: 'bm25'  // Fast, keyword-focused

// Dense - Best for semantic understanding
strategy: 'dense'  // Slower, meaning-focused

// Hybrid - Best overall (DEFAULT)
strategy: 'hybrid'  // Balanced, recommended
```

---

## 📈 **Scoring Examples**

### **Example 1: "Python tutorial for beginners"**

**Without NLP:**
```
Query: "python tutorial beginners"
Results:
  1. "Python Basics" - Score: 0.82 (exact match)
  2. "Learn Python" - Score: 0.65 (partial match)
```

**With NLP:**
```
Query: "python tutorial beginners" 
Expanded: "python tutorial beginners guide walkthrough novice starter basic introduction"
Results:
  1. "Python Basics" - Score: 0.95 (exact + synonyms)
  2. "Introduction to Python" - Score: 0.88 (synonym match)
  3. "Learn Python" - Score: 0.82 (partial + boost)
```

---

### **Example 2: "Advanced React hooks"**

**BM25 Only:**
```
Results ranked by keyword frequency:
  1. "React Hooks API" - 0.78
  2. "Advanced JavaScript" - 0.45
  3. "React Basics" - 0.32
```

**Dense Only:**
```
Results ranked by semantic similarity:
  1. "useState and useEffect Guide" - 0.85
  2. "React Hooks API" - 0.82
  3. "Custom Hooks Tutorial" - 0.79
```

**Hybrid (65% Dense, 35% BM25):**
```
Results ranked by combined score:
  1. "React Hooks API" - 0.80 (best of both)
  2. "useState and useEffect Guide" - 0.77
  3. "Custom Hooks Tutorial" - 0.68
```

---

## 🎯 **Best Practices**

### **For Search Quality:**

1. **✅ Use Hybrid Strategy** (default)
   - Balances keyword precision with semantic understanding
   - Best results for most queries

2. **✅ Enable NLP** (default: true)
   - Query expansion increases recall
   - Intent detection improves precision
   - Difficulty matching ensures relevance

3. **✅ Enable Auto-Discovery** (now enabled by default)
   - Automatically expands content base
   - No manual crawling needed
   - Smart: only fetches if needed

4. **✅ Set Custom Keywords Before Crawling**
   ```javascript
   await setCustomKeywords({
       keywords: ['react', 'hooks', 'typescript', 'nextjs']
   }, token);
   ```
   - Improves tag extraction
   - Better search matching
   - Domain-specific optimization

---

### **For Performance:**

1. **Cache Results**
   - Backend caches search results per query
   - Use `refresh_content: false` for faster searches
   - Set `refresh_content: true` after crawling

2. **Limit top_k**
   - Default: 5-20 results
   - More results = slower personalization
   - Balance relevance vs speed

3. **Choose Discovery Sources**
   ```typescript
   discovery_sources: ['youtube']  // Fast
   discovery_sources: ['youtube', 'medium', 'github']  // Comprehensive
   ```

---

## 🧪 **Testing the Dynamic System**

### **Test 1: Watch Scores Change**

```javascript
const token = localStorage.getItem('auth_token');

// Initial search (empty database)
let response = await fetch('http://localhost:8000/api/v1/content-discovery/search', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        query: 'Python tutorial',
        strategy: 'hybrid',
        top_k: 5
    })
}).then(r => r.json());

console.log('Initial:', response.results);

// Crawl new content
await fetch('http://localhost:8000/api/v1/content-discovery/crawl', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        urls: ['https://docs.python.org/3/tutorial/introduction.html']
    })
}).then(r => r.json());

// Search again - scores will be different!
response = await fetch('http://localhost:8000/api/v1/content-discovery/search', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        query: 'Python tutorial',
        strategy: 'hybrid',
        top_k: 5,
        refresh_content: true
    })
}).then(r => r.json());

console.log('After crawl:', response.results);
// Scores are recalculated based on new corpus!
```

---

### **Test 2: Compare Strategies**

```javascript
const strategies = ['bm25', 'dense', 'hybrid'];

for (const strategy of strategies) {
    const response = await searchContent({
        query: 'React hooks tutorial',
        strategy: strategy,
        top_k: 5
    }, token);
    
    console.log(`\n${strategy.toUpperCase()}:`);
    response.results.forEach((r, i) => {
        console.log(`  ${i+1}. ${r.title} (${r.score.toFixed(4)})`);
    });
}
```

---

## 🎉 **Summary**

### **Scoring is Dynamic:**
✅ Recalculated on every content addition  
✅ Adapts to corpus size and composition  
✅ Personalized per user  
✅ Enhanced by NLP  
✅ Multiple strategies available  

### **Auto-Discovery is Enabled:**
✅ Automatically fetches content when searching  
✅ Integrated into search button  
✅ Smart: only activates if needed  
✅ Configurable sources  
✅ Seamless user experience  

### **Best Configuration (Already Set):**
```typescript
await searchContent({
    query: userInput,
    strategy: 'hybrid',      // ✅ Best balance
    use_nlp: true,           // ✅ Smart processing
    auto_discover: true,     // ✅ Auto-fetch content
    top_k: 20                // ✅ Good result count
}, token);
```

**Your search is now powered by dynamic, adaptive AI! 🚀**
