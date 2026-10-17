"use client";

// Single client for the Timberstone API. Every screen talks to the backend
// through this file only — never call fetch() against the API directly.
//
// Wire format (mirrors timberstone-api middleware/decryptBody.js and
// middleware/wrapResponse.js):
//   request : data → device envelope { device_type, ..., data } → JSON →
//             base64 → [AES-256-CBC if crypto on] → { is_crypto, req }
//   response: { response } → [AES-decrypt if crypto on] → base64 → JSON →
//             { status, message, result }
//
// Successful calls resolve with `result`. Failures throw ApiError, whose
// `errors` is the API's [{ param, msg }] array.

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const CRYPTO_ON = process.env.NEXT_PUBLIC_API_CRYPTO === "1";
const AES_KEY_HEX = process.env.NEXT_PUBLIC_CRYPTO_AES_KEY || "";
const AES_IV_HEX = process.env.NEXT_PUBLIC_CRYPTO_AES_IV || "";

const SESSION_KEY = "ts_session_v1";
const DEVICE_KEY = "ts_device_id_v1";
const SESSION_EVENT = "ts-session-change";

// ---------- errors ----------

export class ApiError extends Error {
  constructor(status, errors) {
    const list = Array.isArray(errors) && errors.length ? errors : [{ param: null, msg: "Request failed" }];
    super(list.map((e) => e.msg).join(", "));
    this.name = "ApiError";
    this.status = status; // HTTP status, 0 = network error
    this.errors = list; // [{ param, msg }]
  }

  // { email: "is required", ... } — handy for showing errors under form fields.
  get fieldErrors() {
    const out = {};
    this.errors.forEach((e) => {
      if (e.param && !out[e.param]) out[e.param] = e.msg;
    });
    return out;
  }

  // Errors not tied to a field, for a form's banner ("" when every error
  // belongs to a field and is shown under it via fieldErrors).
  get generalMessage() {
    const general = this.errors.filter((e) => !e.param).map((e) => e.msg);
    if (general.length) return general.join(" ");
    return Object.keys(this.fieldErrors).length ? "" : this.message;
  }
}

// ---------- encoding ----------

function isBrowser() {
  return typeof window !== "undefined";
}

function toBase64(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

let aesKeyPromise = null;
function getAesKey() {
  if (AES_KEY_HEX.length !== 64 || AES_IV_HEX.length !== 32) {
    throw new Error("NEXT_PUBLIC_CRYPTO_AES_KEY (64 hex) / NEXT_PUBLIC_CRYPTO_AES_IV (32 hex) are not set");
  }
  if (!aesKeyPromise) {
    aesKeyPromise = crypto.subtle.importKey("raw", hexToBytes(AES_KEY_HEX), { name: "AES-CBC" }, false, [
      "encrypt",
      "decrypt",
    ]);
  }
  return aesKeyPromise;
}

// AES-256-CBC (PKCS#7 padding, same as Node's default). Input/output strings;
// cipher text is base64.
async function aesEncrypt(text) {
  const key = await getAesKey();
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: hexToBytes(AES_IV_HEX) },
    key,
    new TextEncoder().encode(text)
  );
  let binary = "";
  new Uint8Array(cipher).forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

async function aesDecrypt(cipherB64) {
  const key = await getAesKey();
  const cipher = Uint8Array.from(atob(cipherB64), (c) => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: "AES-CBC", iv: hexToBytes(AES_IV_HEX) }, key, cipher);
  return new TextDecoder().decode(plain);
}

function getDeviceId() {
  if (!isBrowser()) return "";
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = `web-${crypto.randomUUID()}`;
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

async function encodeBody(data) {
  const envelope = {
    device_type: "web",
    api_type: "web",
    lang_code: "en",
    device_id: getDeviceId(),
    device_token: "",
    data: data || {},
  };
  const base64 = toBase64(envelope);
  return { is_crypto: CRYPTO_ON ? 1 : 0, req: CRYPTO_ON ? await aesEncrypt(base64) : base64 };
}

async function decodeBody(json) {
  // Health check and docs are sent unwrapped.
  if (!json || typeof json.response !== "string") return json;
  const base64 = CRYPTO_ON ? await aesDecrypt(json.response) : json.response;
  return fromBase64(base64);
}

// ---------- session (tokens, user, branches) ----------

export function getSession() {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  if (!isBrowser()) return;
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // storage unavailable (private mode) — session lives only in memory for this call
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

// Subscribe to login / logout / branch switch. Returns an unsubscribe fn.
export function onSessionChange(callback) {
  if (!isBrowser()) return () => {};
  const onStorage = (e) => e.key === SESSION_KEY && callback();
  window.addEventListener(SESSION_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SESSION_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

// Branch sent as x-branch-id. "all" is only valid for all-branch roles.
export function setActiveBranch(branchId) {
  const session = getSession();
  if (!session) return;
  saveSession({ ...session, activeBranchId: branchId });
}

// ---------- core request ----------

function buildUrl(path, query) {
  const url = new URL(`${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

/**
 * request("POST", "/api/admin/leads", { data, query, branchId, auth })
 *   data     — plain body object (POST/PUT/PATCH); encoded automatically
 *   query    — query-string params (GET filters, pagination)
 *   branchId — override the active branch for this call
 *   auth     — false to skip the Authorization header (public endpoints)
 * Resolves with the API's `result`; throws ApiError.
 */
export async function request(method, path, opts = {}) {
  const { auth = true } = opts;
  try {
    return await send(method, path, opts);
  } catch (err) {
    // Access token expired — refresh once and retry with the new token.
    if (!(err instanceof ApiError) || err.status !== 401 || !auth || !err.sentRefreshToken) throw err;
    if (!(await refreshSession(err.sentRefreshToken))) throw err;
    return send(method, path, opts);
  }
}

async function send(method, path, { data, query, branchId, auth = true } = {}) {
  const session = getSession();
  const headers = { Accept: "application/json" };

  if (auth && session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  const branch = branchId ?? session?.activeBranchId;
  if (auth && branch) headers["x-branch-id"] = branch;
  if (CRYPTO_ON) headers["X-Is-Crypto"] = "1";

  const hasBody = !["GET", "HEAD"].includes(method);
  let body;
  if (hasBody) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(await encodeBody(data));
  }

  let res;
  try {
    res = await fetch(buildUrl(path, query), { method, headers, body });
  } catch {
    throw new ApiError(0, [{ param: null, msg: "Cannot reach the server. Check your connection." }]);
  }

  let payload = null;
  try {
    payload = await decodeBody(await res.json());
  } catch {
    throw new ApiError(res.status, [{ param: null, msg: "Invalid response from server" }]);
  }

  if (!res.ok || payload?.status === "error") {
    const error = new ApiError(res.status, payload?.message);
    // request() uses this to refresh the session that sent the call.
    // Without a refresh token there is nothing to retry with — sign out.
    if (res.status === 401 && auth && session) {
      if (session.refreshToken) error.sentRefreshToken = session.refreshToken;
      else saveSession(null);
    }
    throw error;
  }

  return payload?.result ?? payload;
}

// One refresh at a time per tab; concurrent 401s wait on the same promise.
let refreshing = null;

// Swaps the refresh token for a new access token. Resolves true when the
// session now holds a usable token, false when the user must sign in again
// (the session is cleared, which sends the UI to login).
function refreshSession(usedRefreshToken) {
  // Another tab (or an earlier call) already rotated the tokens — just retry.
  const current = getSession();
  if (!current?.refreshToken) return Promise.resolve(false);
  if (current.refreshToken !== usedRefreshToken) return Promise.resolve(true);

  if (!refreshing) {
    refreshing = send("POST", "/api/public/auth/refresh", { data: { refreshToken: usedRefreshToken }, auth: false })
      .then((result) => {
        const latest = getSession();
        if (latest) saveSession({ ...latest, accessToken: result.accessToken, refreshToken: result.refreshToken });
        return !!latest;
      })
      .catch((err) => {
        const latest = getSession();
        // Another tab rotated the token meanwhile — its new one is usable.
        if (latest?.refreshToken && latest.refreshToken !== usedRefreshToken) return true;
        // Refresh token rejected — sign out. Network errors keep the session.
        if (err instanceof ApiError && err.status === 401) saveSession(null);
        return false;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export const api = {
  get: (path, opts) => request("GET", path, opts),
  post: (path, data, opts) => request("POST", path, { ...opts, data }),
  put: (path, data, opts) => request("PUT", path, { ...opts, data }),
  patch: (path, data, opts) => request("PATCH", path, { ...opts, data }),
  delete: (path, opts) => request("DELETE", path, opts),
};

// ---------- auth ----------

export async function login(email, password) {
  const result = await api.post("/api/public/auth/login", { email, password }, { auth: false });
  const first = result.branches?.[0]?.id;
  saveSession({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    user: result.user,
    allBranches: result.allBranches,
    branches: result.branches || [],
    activeBranchId: result.allBranches ? "all" : first || null,
  });
  return result;
}

// Re-reads the signed-in user's profile, role permissions and branches
// (POST /api/admin/account/me) into the session, so changes an admin made
// since sign-in show without signing in again. Keeps the active branch if
// it is still allowed. Resolves false when there is no session.
export async function refreshProfile() {
  if (!getSession()?.accessToken) return false;
  const result = await api.post("/api/admin/account/me");
  const latest = getSession();
  if (!latest) return false;
  const stillAllowed =
    latest.activeBranchId === "all" ? result.allBranches : result.branches.some((b) => b.id === latest.activeBranchId);
  saveSession({
    ...latest,
    user: result.user,
    allBranches: result.allBranches,
    branches: result.branches,
    activeBranchId: stillAllowed ? latest.activeBranchId : result.allBranches ? "all" : result.branches[0]?.id || null,
  });
  return true;
}

// Signs out locally right away, then revokes this device's refresh token on
// the server (best effort — a failed call still leaves the user signed out).
export function logout() {
  const refreshToken = getSession()?.refreshToken;
  saveSession(null);
  if (refreshToken) {
    return send("POST", "/api/public/auth/logout", { data: { refreshToken }, auth: false }).catch(() => {});
  }
  return Promise.resolve();
}
