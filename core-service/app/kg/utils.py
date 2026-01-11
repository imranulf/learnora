"""Knowledge Graph utility functions.

Provides helper functions for common KG operations including:
- Subgraph extraction
- URI/ID normalization
- Graph traversal utilities
"""

from rdflib import Graph, URIRef
from typing import Optional, Set
import logging

logger = logging.getLogger(__name__)


def extract_subgraph(
    graph: Graph,
    start_node: URIRef,
    max_depth: int = 2,
    follow_predicates: Optional[Set[URIRef]] = None
) -> Graph:
    """
    Extract a subgraph around a start node up to max_depth hops.

    Performs breadth-first traversal following both outgoing and incoming
    triples. Only follows URIRef nodes (not literals).

    Args:
        graph: Source RDF graph to extract from
        start_node: Node to start traversal from
        max_depth: Maximum number of hops to traverse (default: 2)
        follow_predicates: Optional set of predicates to follow.
                          If None, follows all predicates.

    Returns:
        New rdflib.Graph containing discovered triples

    Example:
        >>> from rdflib import URIRef
        >>> user_uri = URIRef("http://learnora.ai/kg#user_1")
        >>> subgraph = extract_subgraph(full_graph, user_uri, max_depth=3)
        >>> print(f"Extracted {len(subgraph)} triples")
    """
    sub = Graph()
    seen: Set[URIRef] = set()
    frontier: Set[URIRef] = {start_node}

    for depth in range(max_depth):
        next_frontier: Set[URIRef] = set()

        for node in frontier:
            # Outgoing triples (node as subject)
            for s, p, o in graph.triples((node, None, None)):
                # Filter by predicates if specified
                if follow_predicates is not None and p not in follow_predicates:
                    continue

                sub.add((s, p, o))

                if isinstance(o, URIRef) and o not in seen:
                    next_frontier.add(o)

            # Incoming triples (node as object)
            for s, p, o in graph.triples((None, None, node)):
                # Filter by predicates if specified
                if follow_predicates is not None and p not in follow_predicates:
                    continue

                sub.add((s, p, o))

                if isinstance(s, URIRef) and s not in seen:
                    next_frontier.add(s)

            seen.add(node)

        frontier = next_frontier

    logger.debug(f"Extracted subgraph with {len(sub)} triples from {start_node}")
    return sub


def extract_concept_chain(
    graph: Graph,
    concept_uri: URIRef,
    prerequisite_predicate: URIRef,
    max_depth: int = 10
) -> Graph:
    """
    Extract a concept and all its prerequisites recursively.

    Follows the prerequisite chain to extract the complete learning
    sequence needed for a concept.

    Args:
        graph: Source RDF graph
        concept_uri: Starting concept URI
        prerequisite_predicate: The predicate for prerequisite relationships
        max_depth: Maximum chain depth to prevent infinite loops

    Returns:
        Graph containing the concept and all prerequisite chains
    """
    sub = Graph()
    visited: Set[URIRef] = set()
    to_visit: list[tuple[URIRef, int]] = [(concept_uri, 0)]

    while to_visit:
        current, depth = to_visit.pop(0)

        if current in visited or depth > max_depth:
            continue

        visited.add(current)

        # Add all triples about this concept
        for s, p, o in graph.triples((current, None, None)):
            sub.add((s, p, o))

        # Find and queue prerequisites
        for s, p, o in graph.triples((current, prerequisite_predicate, None)):
            if isinstance(o, URIRef) and o not in visited:
                to_visit.append((o, depth + 1))

    logger.debug(f"Extracted concept chain with {len(sub)} triples, {len(visited)} concepts")
    return sub


def normalize_concept_id(concept_id: str) -> str:
    """
    Normalize a concept ID to a standard format.

    - Converts to lowercase
    - Replaces spaces with underscores
    - Removes special characters

    Args:
        concept_id: Raw concept identifier

    Returns:
        Normalized concept ID suitable for use as URI fragment

    Example:
        >>> normalize_concept_id("Machine Learning")
        'machine_learning'
        >>> normalize_concept_id("C++ Programming")
        'cpp_programming'
    """
    import re

    # Convert to lowercase
    normalized = concept_id.lower()

    # Replace spaces and hyphens with underscores
    normalized = re.sub(r'[\s\-]+', '_', normalized)

    # Replace C++ with cpp
    normalized = normalized.replace('c++', 'cpp')
    normalized = normalized.replace('c#', 'csharp')

    # Remove special characters except underscores
    normalized = re.sub(r'[^a-z0-9_]', '', normalized)

    # Remove leading/trailing underscores
    normalized = normalized.strip('_')

    # Replace multiple underscores with single
    normalized = re.sub(r'_+', '_', normalized)

    return normalized


def get_kg_local_name(prefix: str, db_id: int | str) -> str:
    """
    Generate a KG URI local name from a database ID.

    Args:
        prefix: The prefix to use (e.g., 'user', 'learning_path')
        db_id: The database ID

    Returns:
        KG URI local name (e.g., 'user_123', 'learning_path_456')
    """
    return f"{prefix}_{db_id}"


def extract_id_from_uri(uri: URIRef | str, namespace: str) -> Optional[str]:
    """
    Extract the local ID from a URI.

    Args:
        uri: The URI to extract from
        namespace: The namespace prefix to strip

    Returns:
        The local ID part, or None if namespace doesn't match

    Example:
        >>> extract_id_from_uri("http://learnora.ai/kg#Python", "http://learnora.ai/kg#")
        'Python'
    """
    uri_str = str(uri)
    if uri_str.startswith(namespace):
        return uri_str[len(namespace):]

    # Try splitting by # or /
    if '#' in uri_str:
        return uri_str.split('#')[-1]
    elif '/' in uri_str:
        return uri_str.split('/')[-1]

    return None


def topological_sort_concepts(
    concepts: list[dict],
    concept_key: str = "concept",
    prereq_key: str = "prerequisites"
) -> list[dict]:
    """
    Sort concepts in topological order based on prerequisites.

    Concepts with no prerequisites come first, followed by concepts
    whose prerequisites have already been listed.

    Args:
        concepts: List of concept dicts with concept and prerequisites keys
        concept_key: Key for concept name in dict
        prereq_key: Key for prerequisites list in dict

    Returns:
        Topologically sorted list of concepts

    Raises:
        ValueError: If circular dependencies are detected
    """
    # Build dependency graph
    concept_set = {c[concept_key] for c in concepts}
    concept_map = {c[concept_key]: c for c in concepts}

    # Track in-degree (number of unresolved prerequisites)
    in_degree = {c[concept_key]: 0 for c in concepts}
    for c in concepts:
        for prereq in c.get(prereq_key, []):
            if prereq in concept_set:
                in_degree[c[concept_key]] += 1

    # Start with concepts that have no prerequisites
    queue = [name for name, degree in in_degree.items() if degree == 0]
    sorted_concepts = []

    while queue:
        current = queue.pop(0)
        sorted_concepts.append(concept_map[current])

        # Reduce in-degree for concepts that depend on current
        for c in concepts:
            if current in c.get(prereq_key, []):
                in_degree[c[concept_key]] -= 1
                if in_degree[c[concept_key]] == 0:
                    queue.append(c[concept_key])

    # Check for circular dependencies
    if len(sorted_concepts) != len(concepts):
        remaining = [c[concept_key] for c in concepts if c not in sorted_concepts]
        raise ValueError(f"Circular dependencies detected among: {remaining}")

    return sorted_concepts
