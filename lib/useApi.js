"use client";

// Shared hooks around lib/api.js — the one way screens load data and submit
// forms, so every screen gets the same loading / error handling.

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/Toast";
import { ApiError, api } from "./api";

/**
 * Loads `path` (POST with `body`) and reloads whenever path or body change.
 *   const { data, error, loading, stale, reload, patch } = useApiData("/api/admin/team/list", { page, search });
 * `data` keeps the previous result while a reload is in flight, so lists
 * don't flash empty — `loading` is true meanwhile, and `stale` is true while
 * `data` is still another query's result (filters / page / search changed),
 * so screens can show it as old (see DataTable `busy`, listTotal).
 * `patch(fn)` updates `data` locally (e.g. a row's new status) until the
 * next load replaces it. `error` is an ApiError (or null).
 */
export function useApiData(path, body) {
  const bodyKey = JSON.stringify(body ?? {});
  const queryKey = `${path}|${bodyKey}`;
  const [nonce, setNonce] = useState(0);
  const requestKey = `${queryKey}|${nonce}`;
  // dataKey = the query `data` came from (unchanged when a request fails).
  const [result, setResult] = useState({ requestKey: null, dataKey: null, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    api.post(path, JSON.parse(bodyKey)).then(
      (data) => !cancelled && setResult({ requestKey, dataKey: queryKey, data, error: null }),
      (error) => !cancelled && setResult((prev) => ({ ...prev, requestKey, error: toApiError(error) }))
    );
    return () => {
      cancelled = true;
    };
  }, [path, bodyKey, queryKey, requestKey]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const patch = useCallback((update) => setResult((prev) => (prev.data ? { ...prev, data: update(prev.data) } : prev)), []);

  return {
    data: result.data,
    error: result.error,
    loading: result.requestKey !== requestKey,
    stale: result.data !== null && result.dataKey !== queryKey,
    reload,
    patch,
  };
}

/**
 * Record count for a list box title: "…" until the current filters'
 * results arrive, so an old total isn't shown under new filters.
 */
export function listTotal(list) {
  return list.stale ? "…" : (list.data?.pagination.total ?? "…");
}

/**
 * Form / action submit state.
 *   const form = useSubmit();
 *   const saved = await form.post("/api/admin/team/create", values);
 * `post` resolves with the API's result (true when it has none), or
 * undefined when it failed. It shows the API's success message as a toast,
 * and on failure an error toast with the API's messages; `fieldErrors`
 * ({ field: msg }) is then set for the messages under inputs.
 * { notify: false } skips the success toast (the screen shows its own).
 * `submit(call)` runs any other async call with the same error handling.
 */
export function useSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const reset = useCallback(() => setFieldErrors({}), []);

  const submit = useCallback(
    async (call) => {
      reset();
      setSubmitting(true);
      try {
        return await call();
      } catch (err) {
        const apiError = toApiError(err);
        setFieldErrors(apiError.fieldErrors);
        toast.error(apiError.message);
        return undefined;
      } finally {
        setSubmitting(false);
      }
    },
    [reset]
  );

  const post = useCallback(
    async (path, body, { notify = true } = {}) => {
      const response = await submit(() => api.post(path, body, { withMessage: true }));
      if (!response) return undefined;
      if (notify) toast.success(response.message);
      return response.result ?? true;
    },
    [submit]
  );

  return { post, submit, submitting, fieldErrors, reset };
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
