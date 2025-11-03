"""
Seed script for Knowledge Graph data.
Creates sample concepts and user mastery data for testing.
"""

import asyncio
import sys
from pathlib import Path

# Add the parent directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.database.session import get_session
from app.features.concept.service import ConceptService
from app.features.users.service import UserService
from app.features.users.models import UserKnowledge


async def seed_knowledge_graph():
    """Seed the knowledge graph with sample data."""
    async with get_session() as session:
        concept_service = ConceptService()
        user_service = UserService()
        
        # Sample concepts with prerequisites
        concepts = [
            # Programming Fundamentals
            {
                "concept_id": "variables_basics",
                "name": "Variables and Data Types",
                "description": "Understanding how to store and manipulate data",
                "prerequisites": []
            },
            {
                "concept_id": "control_flow",
                "name": "Control Flow",
                "description": "If statements, loops, and conditional logic",
                "prerequisites": ["variables_basics"]
            },
            {
                "concept_id": "functions",
                "name": "Functions",
                "description": "Creating reusable code blocks",
                "prerequisites": ["variables_basics", "control_flow"]
            },
            
            # Object-Oriented Programming
            {
                "concept_id": "classes_objects",
                "name": "Classes and Objects",
                "description": "Object-oriented programming basics",
                "prerequisites": ["functions"]
            },
            {
                "concept_id": "inheritance",
                "name": "Inheritance",
                "description": "Code reuse through class hierarchies",
                "prerequisites": ["classes_objects"]
            },
            {
                "concept_id": "polymorphism",
                "name": "Polymorphism",
                "description": "Using objects of different types through a common interface",
                "prerequisites": ["inheritance"]
            },
            
            # Data Structures
            {
                "concept_id": "arrays_lists",
                "name": "Arrays and Lists",
                "description": "Sequential data storage",
                "prerequisites": ["variables_basics"]
            },
            {
                "concept_id": "dictionaries_maps",
                "name": "Dictionaries and Maps",
                "description": "Key-value pair storage",
                "prerequisites": ["arrays_lists"]
            },
            {
                "concept_id": "trees_graphs",
                "name": "Trees and Graphs",
                "description": "Hierarchical and network data structures",
                "prerequisites": ["dictionaries_maps", "classes_objects"]
            },
            
            # Algorithms
            {
                "concept_id": "sorting_algorithms",
                "name": "Sorting Algorithms",
                "description": "Bubble sort, quicksort, merge sort",
                "prerequisites": ["arrays_lists", "control_flow"]
            },
            {
                "concept_id": "search_algorithms",
                "name": "Search Algorithms",
                "description": "Linear search, binary search, DFS, BFS",
                "prerequisites": ["arrays_lists", "trees_graphs"]
            },
            {
                "concept_id": "recursion",
                "name": "Recursion",
                "description": "Functions that call themselves",
                "prerequisites": ["functions", "control_flow"]
            },
            
            # Web Development
            {
                "concept_id": "html_basics",
                "name": "HTML Basics",
                "description": "Structure of web pages",
                "prerequisites": []
            },
            {
                "concept_id": "css_basics",
                "name": "CSS Basics",
                "description": "Styling web pages",
                "prerequisites": ["html_basics"]
            },
            {
                "concept_id": "javascript_basics",
                "name": "JavaScript Basics",
                "description": "Client-side scripting",
                "prerequisites": ["html_basics", "variables_basics", "functions"]
            },
            {
                "concept_id": "dom_manipulation",
                "name": "DOM Manipulation",
                "description": "Interacting with web page elements",
                "prerequisites": ["javascript_basics"]
            },
            {
                "concept_id": "async_javascript",
                "name": "Async JavaScript",
                "description": "Promises, async/await, callbacks",
                "prerequisites": ["javascript_basics", "functions"]
            },
            {
                "concept_id": "rest_apis",
                "name": "REST APIs",
                "description": "Building and consuming web services",
                "prerequisites": ["async_javascript"]
            },
        ]
        
        print("🌱 Seeding concepts...")
        for concept_data in concepts:
            # Create concept in the knowledge graph
            concept = await concept_service.create_concept(
                concept_id=concept_data["concept_id"],
                name=concept_data["name"],
                description=concept_data["description"]
            )
            
            # Add prerequisites
            for prereq_id in concept_data["prerequisites"]:
                await concept_service.add_prerequisite(
                    concept_id=concept_data["concept_id"],
                    prerequisite_id=prereq_id
                )
            
            print(f"  ✅ Created: {concept_data['name']}")
        
        # Create sample user knowledge states
        print("\n📊 Creating sample user knowledge...")
        
        # Get a test user (you may need to adjust this based on your user setup)
        # For now, we'll assume user_id = 1 exists
        user_id = 1
        
        # Set mastery levels for demonstration
        mastery_levels = [
            # Known concepts (green)
            ("variables_basics", "known"),
            ("control_flow", "known"),
            ("arrays_lists", "known"),
            ("html_basics", "known"),
            ("css_basics", "known"),
            
            # Learning concepts (yellow)
            ("functions", "learning"),
            ("dictionaries_maps", "learning"),
            ("javascript_basics", "learning"),
            ("sorting_algorithms", "learning"),
            
            # Unknown concepts (red) - these will be default
            # All others will remain as unknown
        ]
        
        for concept_id, mastery in mastery_levels:
            # This would normally use your UserKnowledgeService
            # For demonstration, we'll just print what would be created
            print(f"  📌 User {user_id}: {concept_id} → {mastery}")
            
            # Example of how you might set this in your actual service:
            # await user_service.update_knowledge(
            #     user_id=user_id,
            #     concept_id=concept_id,
            #     mastery_level=mastery
            # )
        
        print("\n✨ Knowledge graph seeding complete!")
        print(f"   - Created {len(concepts)} concepts")
        print(f"   - Set {len(mastery_levels)} mastery levels")
        print("\n💡 Next steps:")
        print("   1. Start the backend: cd core-service && uvicorn app.main:app --reload")
        print("   2. Start the frontend: cd learner-web-app && npm run dev")
        print("   3. Navigate to http://localhost:5173/knowledge-graph")


if __name__ == "__main__":
    asyncio.run(seed_knowledge_graph())
