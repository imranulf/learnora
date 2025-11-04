"""Simple test to check endpoints"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

# Get a valid token first by logging in
login_response = requests.post(
    f"{BASE_URL}/api/v1/auth/login",
    data={
        "username": "test@example.com",
        "password": "testpassword123"
    }
)

if login_response.status_code == 200:
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("=" * 60)
    print("Testing Knowledge Dashboard")
    print("=" * 60)
    
    # Test Knowledge Dashboard
    dashboard_response = requests.get(
        f"{BASE_URL}/api/v1/user-knowledge/dashboard?sort_by=last_updated",
        headers=headers
    )
    print(f"Status: {dashboard_response.status_code}")
    if dashboard_response.status_code == 200:
        data = dashboard_response.json()
        print(f"Total concepts: {data['total_concepts']}")
        print(f"Categories: {data['category_stats']}")
        if data['concepts']:
            print(f"First concept: {data['concepts'][0]}")
    
    print("\n" + "=" * 60)
    print("Testing Learning Path Progress")
    print("=" * 60)
    
    # Get learning paths first
    paths_response = requests.get(
        f"{BASE_URL}/api/v1/learning-paths/?skip=0&limit=10",
        headers=headers
    )
    print(f"Learning Paths Status: {paths_response.status_code}")
    
    if paths_response.status_code == 200:
        paths = paths_response.json()
        print(f"Total paths: {len(paths)}")
        
        if paths:
            thread_id = paths[0]["conversation_thread_id"]
            print(f"Testing progress for thread: {thread_id}")
            
            # Test progress endpoint
            progress_response = requests.get(
                f"{BASE_URL}/api/v1/learning-paths/progress/{thread_id}",
                headers=headers
            )
            print(f"Progress Status: {progress_response.status_code}")
            if progress_response.status_code == 200:
                print("SUCCESS: Learning Path Progress works!")
                progress = progress_response.json()
                print(f"Progress data: {json.dumps(progress, indent=2)}")
            else:
                print(f"FAILED: {progress_response.text}")
        else:
            print("No learning paths found to test")
    
else:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.text)
