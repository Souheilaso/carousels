export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  liked: boolean;
  alt?: string;
}

export interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

const PEXELS_API_URL = 'https://api.pexels.com/v1';

export async function searchPexels(
  query: string,
  page: number = 1,
  perPage: number = 20
): Promise<PexelsSearchResponse> {
  const apiKey = import.meta.env.VITE_PEXELS_API_KEY;

  if (!apiKey) {
    throw new Error('Pexels API key is not configured. Please set VITE_PEXELS_API_KEY in your .env.local file.');
  }

  const url = new URL(`${PEXELS_API_URL}/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('page', page.toString());
  url.searchParams.set('per_page', perPage.toString());

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Pexels API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getCuratedPhotos(
  page: number = 1,
  perPage: number = 20
): Promise<PexelsSearchResponse> {
  const apiKey = import.meta.env.VITE_PEXELS_API_KEY;

  if (!apiKey) {
    throw new Error('Pexels API key is not configured. Please set VITE_PEXELS_API_KEY in your .env.local file.');
  }

  const url = new URL(`${PEXELS_API_URL}/curated`);
  url.searchParams.set('page', page.toString());
  url.searchParams.set('per_page', perPage.toString());

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Pexels API error: ${response.statusText}`);
  }

  return response.json();
}

