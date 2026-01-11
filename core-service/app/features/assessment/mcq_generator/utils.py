"""Utility functions for MCQ generator.

Provides functions for extracting learning path context to make
MCQ generation prerequisite-aware.
"""

from typing import List, Dict, Optional
from app.kg.config import KGConfig


def extract_concept_label(concept: Dict) -> str:
    """
    Extract the label from a JSON-LD concept.

    Args:
        concept: Concept dictionary in JSON-LD format

    Returns:
        The concept label as a string
    """
    # Try different label formats
    label_keys = [
        f"{KGConfig.KG_NAMESPACE}label",
        "http://learnora.ai/kg#label",
        "label",
    ]

    for key in label_keys:
        if key in concept:
            labels = concept[key]
            if isinstance(labels, list) and labels:
                if isinstance(labels[0], dict):
                    return labels[0].get("@value", "Unknown Concept")
                return str(labels[0])
            elif isinstance(labels, str):
                return labels

    # Try @id as fallback
    if "@id" in concept:
        return concept["@id"].split("#")[-1].replace("_", " ").title()

    return "Unknown Concept"


def find_concept_by_id(learning_path: List[Dict], concept_id: str) -> Optional[Dict]:
    """
    Find a concept in the learning path by its ID.

    Args:
        learning_path: List of concepts in JSON-LD format
        concept_id: The @id of the concept to find

    Returns:
        The concept dictionary if found, None otherwise
    """
    for concept in learning_path:
        if concept.get("@id") == concept_id:
            return concept
    return None


def extract_prerequisites(
    learning_path: List[Dict],
    concept_id: str,
    max_depth: int = 3
) -> List[str]:
    """
    Extract prerequisite concept names recursively.

    Args:
        learning_path: List of concepts in JSON-LD format
        concept_id: The @id of the concept to extract prerequisites for
        max_depth: Maximum recursion depth to avoid infinite loops

    Returns:
        List of prerequisite concept names
    """
    if max_depth == 0:
        return []

    concept = find_concept_by_id(learning_path, concept_id)
    if not concept:
        return []

    prerequisites = []
    prereq_keys = [
        f"{KGConfig.KG_NAMESPACE}hasPrerequisite",
        "http://learnora.ai/kg#hasPrerequisite",
        "hasPrerequisite",
    ]

    for prereq_key in prereq_keys:
        if prereq_key in concept:
            for prereq_ref in concept[prereq_key]:
                prereq_id = prereq_ref.get("@id") if isinstance(prereq_ref, dict) else prereq_ref
                if prereq_id:
                    prereq_concept = find_concept_by_id(learning_path, prereq_id)
                    if prereq_concept:
                        prereq_label = extract_concept_label(prereq_concept)
                        prerequisites.append(prereq_label)

                        # Recursively get prerequisites of prerequisites
                        nested_prereqs = extract_prerequisites(
                            learning_path,
                            prereq_id,
                            max_depth - 1
                        )
                        prerequisites.extend(nested_prereqs)
            break

    return prerequisites


def build_learning_path_context(
    learning_path: Optional[List[Dict]],
    concept_id: Optional[str]
) -> str:
    """
    Build a human-readable learning path context string.

    Args:
        learning_path: Optional list of concepts in JSON-LD format
        concept_id: Optional concept ID to extract prerequisites for

    Returns:
        Formatted string describing the learning path context
    """
    if not learning_path or not concept_id:
        return "No prerequisite information provided."

    # Find the current concept
    concept = find_concept_by_id(learning_path, concept_id)
    if not concept:
        return "Concept not found in learning path."

    # Get prerequisite keys
    prereq_keys = [
        f"{KGConfig.KG_NAMESPACE}hasPrerequisite",
        "http://learnora.ai/kg#hasPrerequisite",
        "hasPrerequisite",
    ]

    # Extract immediate prerequisites
    immediate_prereqs = []
    for prereq_key in prereq_keys:
        if prereq_key in concept and concept[prereq_key]:
            for prereq_ref in concept[prereq_key]:
                prereq_id = prereq_ref.get("@id") if isinstance(prereq_ref, dict) else prereq_ref
                if prereq_id:
                    prereq_concept = find_concept_by_id(learning_path, prereq_id)
                    if prereq_concept:
                        immediate_prereqs.append(extract_concept_label(prereq_concept))
            break

    if not immediate_prereqs:
        return "This is a foundational concept with no prerequisites."

    # Format the context
    if len(immediate_prereqs) == 1:
        context = f"This concept builds upon: {immediate_prereqs[0]}"
    else:
        prereq_list = ", ".join(immediate_prereqs[:-1]) + f" and {immediate_prereqs[-1]}"
        context = f"This concept builds upon: {prereq_list}"

    # Get all prerequisites (including nested)
    all_prereqs = extract_prerequisites(learning_path, concept_id)
    if all_prereqs:
        # Remove duplicates while preserving order
        unique_prereqs = []
        seen = set()
        for prereq in all_prereqs:
            if prereq not in seen:
                unique_prereqs.append(prereq)
                seen.add(prereq)

        if len(unique_prereqs) > len(immediate_prereqs):
            context += f"\n\nFoundational concepts in the learning path: {' -> '.join(unique_prereqs[:5])}"
            if len(unique_prereqs) > 5:
                context += f" (and {len(unique_prereqs) - 5} more)"

    return context


def extract_learning_path_topic(learning_path: Optional[List[Dict]]) -> Optional[str]:
    """
    Extract the topic/goal from a learning path.

    Args:
        learning_path: Optional list of concepts in JSON-LD format

    Returns:
        The learning path topic if found
    """
    if not learning_path:
        return None

    # Look for a LearningPath object with a topic
    type_keys = ["@type", "type"]
    topic_keys = [
        f"{KGConfig.KG_NAMESPACE}topic",
        "http://learnora.ai/kg#topic",
        "topic",
    ]

    for item in learning_path:
        item_type = None
        for type_key in type_keys:
            if type_key in item:
                item_type = item[type_key]
                break

        if item_type and "LearningPath" in str(item_type):
            for topic_key in topic_keys:
                if topic_key in item:
                    topics = item[topic_key]
                    if isinstance(topics, list) and topics:
                        if isinstance(topics[0], dict):
                            return topics[0].get("@value")
                        return str(topics[0])
                    elif isinstance(topics, str):
                        return topics

    return None
