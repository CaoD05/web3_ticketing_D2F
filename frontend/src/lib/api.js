import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";
const TOKEN_KEY = "uticket_token";
const USER_KEY = "uticket_user";
const STORAGE_KEY = "uticket_auth_storage";

function readJson(storage, key) {
  const value = storage.getItem(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getStorageType() {
  return localStorage.getItem(STORAGE_KEY) || "session";
}

function getActiveStorage() {
  return getStorageType() === "local" ? localStorage : sessionStorage;
}

function getStoredToken() {
  return getActiveStorage().getItem(TOKEN_KEY);
}

export function getAuthSession() {
  const storage = getActiveStorage();
  const token = storage.getItem(TOKEN_KEY);
  const user = readJson(storage, USER_KEY);

  if (!token || !user) {
    return null;
  }

  return {
    token,
    user,
    remember: getStorageType() === "local",
  };
}

export function setAuthSession(token, user, remember = false) {
  clearAuthSession();

  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEY, remember ? "local" : "session");
}

export function updateAuthUser(user) {
  const session = getAuthSession();

  if (!session) {
    return;
  }

  const storage = session.remember ? localStorage : sessionStorage;
  storage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
