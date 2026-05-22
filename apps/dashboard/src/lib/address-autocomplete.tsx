'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface AutocompleteResult {
  name: string;
  address: string;
  location: { lat: number; lng: number };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: AutocompleteResult) => void;
  className?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  className = '',
}: AddressAutocompleteProps) {
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query, limit: '5' });
      const res = await fetch(`/api/geocode/autocomplete?${params}`);
      const body = (await res.json()) as { data: AutocompleteResult[] };
      setResults(body.data ?? []);
      setOpen(true);
      setActiveIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(() => search(q), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, search]);

  function handleSelect(result: AutocompleteResult) {
    setOpen(false);
    setResults([]);
    onSelect(result);
  }

  function close() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === 'Escape') {
      close();
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(close, 150)}
        className={className}
        autoComplete="off"
      />
      {open && (
        <div
          ref={listRef}
          className="absolute top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No results found</div>
          ) : (
            results.map((result, i) => (
              <button
                key={`${result.name}-${result.location.lat}-${result.location.lng}`}
                type="button"
                className={`flex w-full flex-col px-3 py-2 text-left ${
                  i === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(result);
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className="text-sm font-medium">{result.name}</span>
                <span className="text-xs text-gray-500">{result.address}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
