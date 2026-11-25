// lib/hooks.ts — Reusable React hooks for SCANOVA
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Debounce Hook ────────────────────────────────────────────────────────────
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// ─── Throttle Hook ────────────────────────────────────────────────────────────
export function useThrottle<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  const lastCall = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttled = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        fn(...args);
      } else {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          lastCall.current = Date.now();
          fn(...args);
        }, delay - (now - lastCall.current));
      }
    },
    [fn, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return throttled;
}

// ─── Keyboard Shortcut Hook ───────────────────────────────────────────────────
export function useKeyboardShortcut(
  key: string,
  callback: (e: KeyboardEvent) => void,
  options: { ctrl?: boolean; meta?: boolean; shift?: boolean; enabled?: boolean } = {}
) {
  const { ctrl = false, meta = false, shift = false, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs/textareas
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isInput && key.toLowerCase() !== "escape") return;

      const ctrlMatch = ctrl ? (e.ctrlKey || e.metaKey) : true;
      const metaMatch = meta ? e.metaKey : true;
      const shiftMatch = shift ? e.shiftKey : !e.shiftKey;

      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        (ctrl || meta ? (e.ctrlKey || e.metaKey) : true) &&
        shiftMatch
      ) {
        e.preventDefault();
        callback(e);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback, ctrl, meta, shift, enabled]);
}

// ─── Autosave Hook ────────────────────────────────────────────────────────────
export type AutosaveStatus = "idle" | "saving" | "saved" | "error" | "unsaved";

export function useAutosave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  delay: number = 2000
) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataRef = useRef(data);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    dataRef.current = data;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setStatus("unsaved");
    timeoutRef.current = setTimeout(async () => {
      if (!isMounted.current) return;
      setStatus("saving");
      try {
        await saveFn(dataRef.current);
        if (isMounted.current) setStatus("saved");
      } catch {
        if (isMounted.current) setStatus("error");
      }
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [data, saveFn, delay]);

  return status;
}

// ─── Optimistic Update Hook ───────────────────────────────────────────────────
export function useOptimistic<T>(initial: T) {
  const [state, setState] = useState(initial);
  const [isPending, setIsPending] = useState(false);

  const update = useCallback(async (newState: T, asyncFn: () => Promise<void>) => {
    const prev = state;
    setState(newState);
    setIsPending(true);
    try {
      await asyncFn();
    } catch {
      setState(prev);
    } finally {
      setIsPending(false);
    }
  }, [state]);

  return { state, setState, update, isPending };
}

// ─── Smart Form Validation Hook ────────────────────────────────────────────────
export interface FieldValidation {
  value: string;
  error: string;
  touched: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function useFormValidation(
  initialValues: Record<string, string>,
  validators: Record<string, (value: string) => string>
) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = useCallback((field: string, value: string) => {
    const validator = validators[field];
    if (validator) {
      return validator(value);
    }
    return "";
  }, [validators]);

  const setValue = useCallback((field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validate(field, value) }));
    }
  }, [touched, validate]);

  const setTouchedField = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validate(field, values[field]) }));
  }, [validate, values]);

  const validateAll = useCallback(() => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    for (const field of Object.keys(values)) {
      const err = validate(field, values[field]);
      newErrors[field] = err;
      if (err) isValid = false;
    }
    setErrors(newErrors);
    setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])));
    return isValid;
  }, [values, validate]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return { values, errors, touched, setValue, setTouchedField, validateAll, reset };
}