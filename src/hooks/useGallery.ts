import { useState, useEffect, useCallback } from 'react';
import { CharacterPreset } from '../presets';
import { CustomTheme } from '../store/useCustomThemeStore';
import { WidgetTemplate } from '../store/useTemplateStore';

const GALLERY_BASE_URL = 'https://wackyweasel.github.io/ucs-community-gallery';
const CACHE_KEY = 'ucs:gallery-cache';
const THEME_DATA_CACHE_KEY = 'ucs:gallery-theme-data';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface GalleryPreset {
  id: string;
  name: string;
  author: string;
  description: string;
  file: string;
}

export interface GalleryTheme {
  id: string;
  name: string;
  author: string;
  description: string;
  file: string;
}

export interface GalleryTemplate {
  id: string;
  name: string;
  author: string;
  description: string;
  file: string;
}

export interface GalleryManifest {
  presets: GalleryPreset[];
  themes: GalleryTheme[];
  templates: GalleryTemplate[];
}

interface CachedData {
  manifest: GalleryManifest;
  timestamp: number;
}

export function useGallery() {
  const [manifest, setManifest] = useState<GalleryManifest | null>(null);
  const [themeData, setThemeData] = useState<Record<string, CustomTheme>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch theme data for all themes in manifest
  const fetchThemeData = useCallback(async (themes: GalleryTheme[], forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(THEME_DATA_CACHE_KEY);
        if (cached) {
          const data = JSON.parse(cached);
          if (Date.now() - data.timestamp < CACHE_TTL_MS) {
            setThemeData(data.themes);
            return;
          }
        }
      } catch (e) {
        console.error('Failed to read theme data cache:', e);
      }
    }

    // Fetch all theme files in parallel
    const fetchedThemes: Record<string, CustomTheme> = {};
    await Promise.all(
      themes.map(async (theme) => {
        try {
          const response = await fetch(`${GALLERY_BASE_URL}/${theme.file}`);
          if (response.ok) {
            const data = await response.json();
            fetchedThemes[theme.id] = data;
          }
        } catch (e) {
          console.error(`Failed to fetch theme ${theme.id}:`, e);
        }
      })
    );

    // Cache the fetched themes
    try {
      localStorage.setItem(THEME_DATA_CACHE_KEY, JSON.stringify({
        themes: fetchedThemes,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.error('Failed to cache theme data:', e);
    }

    setThemeData(fetchedThemes);
  }, []);

  const fetchManifest = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const data: CachedData = JSON.parse(cached);
          if (Date.now() - data.timestamp < CACHE_TTL_MS) {
            setManifest(data.manifest);
            // Also load cached theme data
            if (data.manifest.themes.length > 0) {
              fetchThemeData(data.manifest.themes, false);
            }
            return;
          }
        }
      } catch (e) {
        console.error('Failed to read gallery cache:', e);
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${GALLERY_BASE_URL}/index.json`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Gallery not set up yet. Check back later!');
        }
        throw new Error(`Failed to fetch gallery: ${response.status}`);
      }
      const data: GalleryManifest = await response.json();
      
      // Cache the result
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          manifest: data,
          timestamp: Date.now(),
        }));
      } catch (e) {
        console.error('Failed to cache gallery:', e);
      }

      setManifest(data);
      
      // Fetch theme data for previews
      if (data.themes.length > 0) {
        fetchThemeData(data.themes, forceRefresh);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load gallery');
      // Try to use cached data even if expired
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const data: CachedData = JSON.parse(cached);
          setManifest(data.manifest);
        }
      } catch {
        // No cache available
      }
    } finally {
      setLoading(false);
    }
  }, [fetchThemeData]);

  useEffect(() => {
    fetchManifest();
  }, [fetchManifest]);

  const downloadPreset = useCallback(async (item: GalleryPreset): Promise<CharacterPreset | null> => {
    try {
      const response = await fetch(`${GALLERY_BASE_URL}/${item.file}`);
      if (!response.ok) {
        throw new Error(`Failed to download preset: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      console.error('Failed to download preset:', e);
      return null;
    }
  }, []);

  const downloadTheme = useCallback(async (item: GalleryTheme): Promise<CustomTheme | null> => {
    try {
      const response = await fetch(`${GALLERY_BASE_URL}/${item.file}`);
      if (!response.ok) {
        throw new Error(`Failed to download theme: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      console.error('Failed to download theme:', e);
      return null;
    }
  }, []);

  const downloadTemplate = useCallback(async (item: GalleryTemplate): Promise<WidgetTemplate | null> => {
    try {
      const response = await fetch(`${GALLERY_BASE_URL}/${item.file}`);
      if (!response.ok) {
        throw new Error(`Failed to download template: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      console.error('Failed to download template:', e);
      return null;
    }
  }, []);

  return {
    manifest,
    themeData,
    loading,
    error,
    refresh: () => fetchManifest(true),
    downloadPreset,
    downloadTheme,
    downloadTemplate,
  };
}

// Submission endpoint
const SUBMISSION_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyIBng9kWluQYZ4yJwb2CoLC5Q2OfwVHdaQ9S5dghHMpqo6RTDoc58l2wb7XcasMTcTOg/exec';

export async function submitToGallery(
  sheet: 'Presets' | 'Themes' | 'Templates',
  name: string,
  author: string,
  description: string,
  data: any
): Promise<boolean> {
  try {
    await fetch(SUBMISSION_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sheet,
        name,
        author,
        description,
        data,
      }),
    });
    // With no-cors mode, we can't check the response, so assume success
    return true;
  } catch (e) {
    console.error('Failed to submit to gallery:', e);
    return false;
  }
}
