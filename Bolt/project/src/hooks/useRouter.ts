import { useState, useCallback, useEffect } from 'react';

export function useRouter() {
  const [path, setPath] = useState(() => {
    if (typeof window === 'undefined') return '/';
    return window.location.hash.replace(/^#/, '') || '/';
  });

  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.replace(/^#/, '') || '/';
      setPath(hash);
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
    window.scrollTo(0, 0);
  }, []);

  return { path, navigate };
}
