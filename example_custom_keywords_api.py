"""
Example: Using Custom Keywords for Content Discovery

This example demonstrates how to use custom keywords when crawling URLs
to extract relevant tags for personalized content discovery.
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

# NOTE: You need a valid JWT token to use these endpoints
# Get token by registering and logging in first

def example_1_set_global_keywords(token: str):
    """Set custom keywords globally for the discovery service."""
    print("=" * 70)
    print("Example 1: Set Global Custom Keywords")
    print("=" * 70)
    
    # User is learning modern React ecosystem
    custom_keywords = [
        "react", "nextjs", "remix", "gatsby",
        "typescript", "javascript",
        "tailwindcss", "chakra-ui", "mui",
        "react-query", "zustand", "redux",
        "vite", "turbopack", "webpack"
    ]
    
    response = requests.post(
        f"{BASE_URL}/content-discovery/set-keywords",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={"keywords": custom_keywords}
    )
    
    print(f"\nStatus: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()


def example_2_crawl_with_custom_keywords(token: str):
    """Crawl URLs with custom keywords for tag extraction."""
    print("=" * 70)
    print("Example 2: Crawl URLs with Custom Keywords")
    print("=" * 70)
    
    # Crawl React documentation with specific keywords
    request_data = {
        "urls": [
            "https://react.dev/learn",
            "https://nextjs.org/docs",
        ],
        "custom_keywords": [
            "react", "nextjs", "server components",
            "streaming", "suspense", "app router",
            "typescript", "rsc", "client components"
        ]
    }
    
    print(f"\nCrawling URLs: {request_data['urls']}")
    print(f"Custom Keywords: {request_data['custom_keywords'][:5]}... ({len(request_data['custom_keywords'])} total)")
    
    response = requests.post(
        f"{BASE_URL}/content-discovery/crawl",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json=request_data
    )
    
    print(f"\nStatus: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Discovered: {result['discovered_count']} new content items")
        print(f"Total Indexed: {result['total_indexed']} items")
    else:
        print(f"Error: {response.text}")
    print()


def example_3_search_with_nlp(token: str):
    """Search for content with NLP processing."""
    print("=" * 70)
    print("Example 3: Search Content with NLP")
    print("=" * 70)
    
    # Natural language search query
    search_query = "I want to learn Next.js server components for beginners"
    
    request_data = {
        "query": search_query,
        "strategy": "hybrid",
        "top_k": 5,
        "use_nlp": True
    }
    
    print(f"\nSearch Query: '{search_query}'")
    
    response = requests.post(
        f"{BASE_URL}/content-discovery/search",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json=request_data
    )
    
    print(f"\nStatus: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Processed Query: '{result.get('processed_query', 'N/A')}'")
        print(f"Results Found: {len(result.get('results', []))}")
        
        if 'nlp_analysis' in result:
            nlp = result['nlp_analysis']
            print(f"\nNLP Analysis:")
            print(f"  Intent: {nlp.get('intent', {}).get('primary', 'N/A')}")
            print(f"  Entities: {nlp.get('entities', {})}")
            print(f"  Key Terms: {nlp.get('key_terms', [])[:5]}")
    else:
        print(f"Error: {response.text}")
    print()


def example_4_domain_specific_crawling():
    """Example keyword sets for different domains."""
    print("=" * 70)
    print("Example 4: Domain-Specific Keyword Sets")
    print("=" * 70)
    
    examples = {
        "Frontend Development": [
            "react", "vue", "angular", "svelte",
            "html", "css", "javascript", "typescript",
            "sass", "tailwind", "bootstrap",
            "webpack", "vite", "responsive design"
        ],
        
        "Backend Development": [
            "nodejs", "python", "java", "go",
            "fastapi", "django", "flask", "spring",
            "express", "nestjs", "graphql", "rest",
            "microservices", "api design"
        ],
        
        "Data Science": [
            "python", "r", "pandas", "numpy",
            "jupyter", "scikit-learn", "tensorflow",
            "pytorch", "matplotlib", "seaborn",
            "statistics", "machine learning", "data viz"
        ],
        
        "DevOps": [
            "docker", "kubernetes", "terraform",
            "ansible", "jenkins", "github actions",
            "aws", "azure", "gcp", "monitoring",
            "ci/cd", "infrastructure as code"
        ],
        
        "Mobile Development": [
            "react native", "flutter", "swift",
            "kotlin", "ios", "android", "xamarin",
            "mobile ui", "app store", "firebase"
        ]
    }
    
    for domain, keywords in examples.items():
        print(f"\n{domain}:")
        print(f"  Keywords: {', '.join(keywords[:8])}...")
        print(f"  Total: {len(keywords)} keywords")
    
    print()


def main():
    print("\n")
    print("╔" + "═" * 68 + "╗")
    print("║" + " " * 10 + "CUSTOM KEYWORDS API USAGE EXAMPLES" + " " * 22 + "║")
    print("╚" + "═" * 68 + "╝")
    print()
    
    # NOTE: Replace with your actual JWT token
    token = "YOUR_JWT_TOKEN_HERE"
    
    if token == "YOUR_JWT_TOKEN_HERE":
        print("⚠️  Please set your JWT token first!")
        print("\nHow to get a token:")
        print("  1. Register: POST /api/v1/auth/register")
        print("  2. Login: POST /api/v1/auth/login")
        print("  3. Copy the access_token from response")
        print()
        
        # Show examples without making actual requests
        example_4_domain_specific_crawling()
        
        print("=" * 70)
        print("To run actual API calls:")
        print("  1. Get your JWT token from /auth/login")
        print("  2. Replace 'YOUR_JWT_TOKEN_HERE' in this script")
        print("  3. Run the script again")
        print("=" * 70)
        
    else:
        # Run actual examples with API calls
        example_1_set_global_keywords(token)
        example_2_crawl_with_custom_keywords(token)
        example_3_search_with_nlp(token)
        example_4_domain_specific_crawling()
        
        print("=" * 70)
        print("✅ All Examples Completed!")
        print("=" * 70)
        print("\nNext Steps:")
        print("  • Check indexed content: GET /content-discovery/contents")
        print("  • View stats: GET /content-discovery/stats")
        print("  • Search with different queries to test personalization")
        print()


if __name__ == "__main__":
    main()
