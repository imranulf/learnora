/**
 * Discover Page
 *
 * Content discovery hub - find learning resources tailored to you.
 * Wraps the ContentDiscovery feature component.
 *
 * Designed to be inviting for learners of all backgrounds.
 */
import { useEffect } from 'react';
import ContentDiscovery from '../features/content-discovery/ContentDiscovery';

export default function DiscoverPage() {
  useEffect(() => { document.title = 'Discover - Learnora'; }, []);
  return <ContentDiscovery />;
}
