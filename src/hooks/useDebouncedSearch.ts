import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for debounced search input
 * 
 * Separates input state from search execution to prevent excessive re-renders
 * and API calls while the user is still typing.
 */
export const useDebouncedSearch = (
  initialValue: string = '',
  delay: number = 300
) => {
  // Immediate input state - updates on every keystroke
  const [inputValue, setInputValue] = useState(initialValue);
  
  // Debounced value - only updates after user stops typing
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  
  // Loading state to show user that search is processing
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    // If input value equals debounced value, no need to debounce
    if (inputValue === debouncedValue) {
      setIsDebouncing(false);
      return;
    }

    // Set debouncing state to true when input changes
    setIsDebouncing(true);

    const timer = setTimeout(() => {
      setDebouncedValue(inputValue);
      setIsDebouncing(false);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [inputValue, debouncedValue, delay]);

  // Immediate update function for programmatic changes
  const setValue = useCallback((value: string) => {
    setInputValue(value);
    setDebouncedValue(value);
    setIsDebouncing(false);
  }, []);

  // Update only input value (for user typing)
  const setInputValueOnly = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  // Force immediate search (for search button or enter key)
  const executeImmediateSearch = useCallback(() => {
    setDebouncedValue(inputValue);
    setIsDebouncing(false);
  }, [inputValue]);

  return {
    inputValue,
    debouncedValue,
    isDebouncing,
    setValue,
    setInputValue: setInputValueOnly,
    executeImmediateSearch
  };
};
