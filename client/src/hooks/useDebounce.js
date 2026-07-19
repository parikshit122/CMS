/**
 * useDebounce — delays updating `value` until `delay` ms have elapsed
 * since the last change. Useful for search inputs, autocomplete, etc.
 *
 * @param {*}      value  The value to debounce
 * @param {number} delay  Debounce delay in milliseconds (default 300)
 * @returns The debounced value
 */
import { useState, useEffect } from 'react';

const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
