import { useState, useEffect } from 'react';
import { searchPexels, PexelsPhoto } from '@/lib/pexels';
import { searchPinterestPins, PinterestPin, getProxiedPinterestImageUrl, isPinterestImageUrl } from '@/lib/pinterest';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ImageSource = 'pexels' | 'pinterest';

interface ImageSearchResultsProps {
  query: string;
  source: ImageSource;
  onSelectImage: (imageUrl: string) => void;
}

interface SearchResult {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  alt?: string;
}

export function ImageSearchResults({ query, source, onSelectImage }: ImageSearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [bookmark, setBookmark] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // Reset page when query or source changes
    setPage(1);
    setBookmark(undefined);
  }, [query, source]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // Validate that query is not a URL
    const trimmedQuery = query.trim();
    const isUrl = /^https?:\/\//i.test(trimmedQuery);
    
    if (isUrl) {
      setError('Please use the "Import from URL" field above to add images from URLs. Search queries should be keywords, not URLs.');
      setResults([]);
      setLoading(false);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setError(null);
      try {
        if (source === 'pexels') {
          const response = await searchPexels(query, page, 20);
          const mappedResults: SearchResult[] = response.photos.map((photo) => ({
            id: photo.id.toString(),
            imageUrl: photo.src.large,
            thumbnailUrl: photo.src.medium,
            alt: photo.alt || `Photo by ${photo.photographer}`,
          }));
          setResults(mappedResults);
          setHasMore(response.next_page !== undefined);
        } else if (source === 'pinterest') {
          const response = await searchPinterestPins(query, bookmark);
          const mappedResults: SearchResult[] = response.items
            .filter((pin) => pin.media?.images)
            .map((pin) => {
              const images = pin.media.images!;
              const rawImageUrl = images['736x']?.url || images['564x']?.url || images.originals?.url || '';
              const rawThumbnailUrl = images['564x']?.url || images['736x']?.url || images.originals?.url || '';
              // Use proxied URLs for Pinterest images to avoid CORS
              const imageUrl = isPinterestImageUrl(rawImageUrl) 
                ? getProxiedPinterestImageUrl(rawImageUrl)
                : rawImageUrl;
              const thumbnailUrl = isPinterestImageUrl(rawThumbnailUrl)
                ? getProxiedPinterestImageUrl(rawThumbnailUrl)
                : rawThumbnailUrl;
              return {
                id: pin.id,
                imageUrl,
                thumbnailUrl,
                alt: pin.title || pin.description,
              };
            });
          setResults(mappedResults);
          setHasMore(!!response.bookmark);
          setBookmark(response.bookmark);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search images');
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query, source, page, bookmark]);

  if (!query.trim()) {
    return null;
  }

  if (loading && results.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (results.length === 0 && !loading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No images found. Try a different search term.
      </div>
    );
  }

  const handlePrevious = () => {
    if (source === 'pexels') {
      setPage(p => Math.max(1, p - 1));
    } else {
      // Pinterest pagination uses bookmarks, which is more complex
      // For now, we'll just reset to first page
      setBookmark(undefined);
      setPage(1);
    }
  };

  const handleNext = () => {
    if (source === 'pexels') {
      setPage(p => p + 1);
    } else {
      // Pinterest pagination handled via bookmark in useEffect
      setPage(p => p + 1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {results.map((result) => (
          <button
            key={result.id}
            onClick={() => onSelectImage(result.imageUrl)}
            className="relative aspect-square overflow-hidden rounded-lg border border-border hover:border-primary transition-colors group"
          >
            <img
              src={result.thumbnailUrl}
              alt={result.alt || 'Search result'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        ))}
      </div>

      {(hasMore || page > 1) && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={page === 1 || loading}
            className="border-border"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {source === 'pexels' ? `Page ${page}` : 'Pinterest Pins'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={!hasMore || loading}
            className="border-border"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

