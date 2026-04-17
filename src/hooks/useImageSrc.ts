import { useState, useEffect, useRef } from 'react';

const imageCache = new Map<string, string>();
const thumbnailCache = new Map<string, string>();

export function useImageSrc(path: string | null | undefined): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!path) {
      setDataUrl(null);
      return;
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      setDataUrl(path);
      return;
    }

    if (imageCache.has(path)) {
      setDataUrl(imageCache.get(path)!);
      return;
    }

    let cancelled = false;

    window.electronAPI.readImageAsDataUrl(path).then(result => {
      if (!mountedRef.current || cancelled) return;
      
      if (result) {
        imageCache.set(path, result);
        setDataUrl(result);
      } else {
        setDataUrl(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return dataUrl;
}

export function useThumbnailSrc(path: string | null | undefined, maxSize: number = 200): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!path) {
      setDataUrl(null);
      return;
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      setDataUrl(path);
      return;
    }

    const cacheKey = `${path}:${maxSize}`;

    if (thumbnailCache.has(cacheKey)) {
      setDataUrl(thumbnailCache.get(cacheKey)!);
      return;
    }

    let cancelled = false;

    const createThumbnail = async () => {
      try {
        const result = await window.electronAPI.readImageAsDataUrl(path);
        if (!mountedRef.current || cancelled || !result) {
          setDataUrl(null);
          return;
        }

        const img = new Image();
        img.src = result;
        
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
        });

        if (cancelled) return;

        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setDataUrl(result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        
        thumbnailCache.set(cacheKey, thumbnail);
        
        if (mountedRef.current) {
          setDataUrl(thumbnail);
        }
      } catch {
        if (mountedRef.current && !cancelled) {
          setDataUrl(null);
        }
      }
    };

    createThumbnail();

    return () => {
      cancelled = true;
    };
  }, [path, maxSize]);

  return dataUrl;
}
