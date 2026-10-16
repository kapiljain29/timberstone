"use client";

// Shared hooks around lib/api.js — the one way screens load data and submit
// forms, so every screen gets the same loading / error handling.

import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "./api";

/**
 * Loads `path` (POST with `body`) and reloads whenever path or body change.
 *   const { data, error, loading, reload } = useApiData("/api/admin/team/list", { page, search });
 * `data` keeps the previous result while a reload is in flight, so lists
 * don't flash empty. `error` is an ApiError (or null).
 */
export function useApiData(path, body) {
  const bodyKey = JSON.stringify(body ?? {});
  const [nonce, setNonce] = useState(0);
  const requestKey = `${path}|${bodyKey}|${nonce}`;
  const [result, setResult] = useState({ requestKey: null, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    api.post(path, JSON.parse(bodyKey)).then(
      (data) => !cancelled && setResult({ requestKey, data, error: null }),
      (error) => !cancelled && setResult((prev) => ({ requestKey, data: prev.data, error: toApiError(error) }))
    );
    return () => {
      cancelled = true;
    };
  }, [path, bodyKey, requestKey]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data: result.data, error: result.error, loading: result.requestKey !== requestKey, reload };
}

/**
 * Form / action submit state.
 *   const form = useSubmit();
 *   const ok = await form.submit(() => api.post("/api/admin/team/create", values));
 * `submit` resolves with the call's result, or undefined when it failed —
 * then `fieldErrors` ({ field: msg }, for messages under inputs) and
 * `error` (banner text for errors not tied to a field) are set.
 */
export function useSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setFieldErrors({});
    setError("");
  }, []);

  const submit = useCallback(
    async (call) => {
      reset();
      setSubmitting(true);
      try {
        return await call();
      } catch (err) {
        const apiError = toApiError(err);
        setFieldErrors(apiError.fieldErrors);
        setError(apiError.generalMessage);
        return undefined;
      } finally {
        setSubmitting(false);
      }
    },
    [reset]
  );

  return { submit, submitting, fieldErrors, error, reset };
}

/**
 * `value`, updated only after it stops changing for `delay` ms — for search
 * boxes, so each keystroke doesn't fire a request.
 */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function toApiError(err) {
  return err instanceof ApiError ? err : new ApiError(0, [{ param: null, msg: "Something went wrong. Please try again." }]);
}
