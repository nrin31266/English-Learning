// src/api/axiosInstance.ts

import KeycloakClient from "@/features/keycloak/keycloak";
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_GATEWAY_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000, // default timeout 10s
});

// === TRẠNG THÁI REFRESH TOKEN TOÀN CỤC ===
const keycloak = KeycloakClient.getInstance().keycloak;
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

// Hàm refresh token an toàn (đảm bảo chỉ 1 refresh đang diễn ra)
const inspectOrRefreshTokenSafely = async (): Promise<void> => {
  const now = Math.floor(Date.now() / 1000);
  const tokenExp = keycloak.tokenParsed?.exp || 0;
  const bufferTime = 10; // giây

  // Nếu token vẫn còn hạn đủ lâu, không cần refresh, tranh refresh thừa
  if (tokenExp - now > bufferTime) {
    return;
  }
  if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = new Promise<void>(async (resolve, reject) => {
      try {
        await keycloak.updateToken(10); // còn <10s thì refresh
        isRefreshing = false;
        console.log("Interceptor refres token!!!");
        resolve();
      } catch (err) {
        console.error("🔴 Token refresh failed:", err);
        isRefreshing = false;
        reject(err);
      }
    });
  }
  // Nếu đã có refreshPromise, các request khác chờ nó
  return refreshPromise!;
};

// === REQUEST INTERCEPTOR ===
axiosInstance.interceptors.request.use(
  async (config) => {
    // chỉ thêm token khi có cờ "X-Auth"
    if (config.headers["X-Auth"] && keycloak.authenticated) {
      try {
        await inspectOrRefreshTokenSafely();
      } catch {
        console.warn("🔴 Refresh token expired — redirecting to login");
        keycloak.login();
        throw new axios.Cancel("Redirecting to login");
      }

      if (keycloak.token) {
        config.headers.Authorization = `Bearer ${keycloak.token}`;
      }

      // Xóa cờ để không gửi ra backend
      delete config.headers["X-Auth"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// === RESPONSE INTERCEPTOR ===
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);

    if (error.response) {
      const { status } = error.response;
      if (status === 401 || status === 403) {
        console.warn("🔒 Unauthorized, redirecting to login...");
        try {
          await keycloak.logout();
        } catch {
          keycloak.login();
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
