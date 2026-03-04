import Keycloak from "keycloak-js";

export default class KeycloakClient {
  private static _instance: KeycloakClient | null = null;
  private _keycloak: Keycloak;
  private _refreshTimeout: ReturnType<typeof setTimeout> | null = null;
  private _refreshInProgress = false;
  private _initialized = false;

  private constructor() {
    this._keycloak = new Keycloak({
      url: "http://localhost:8080",
      realm: "english-learning-realm",
      clientId: "admin-web", 
    });
  }

  public static getInstance(): KeycloakClient {
    if (!this._instance) {
      this._instance = new KeycloakClient();
    }
    return this._instance;
  }

  public get keycloak(): Keycloak {
    return this._keycloak;
  }

  // ✅ INIT ONLY HERE
  public async init(): Promise<boolean> {
    if (this._initialized) return this._keycloak.authenticated ?? false;

    const authenticated = await this._keycloak.init({
      onLoad: "check-sso",
      pkceMethod: "S256",
      silentCheckSsoRedirectUri:
        window.location.origin + "/silent-check-sso.html",
    });

    this._initialized = true;

    // if (authenticated) {
    //   this.scheduleTokenRefresh();
    // }

    return authenticated;
  }

  // // ✅ SAFE TOKEN REFRESH
  // private scheduleTokenRefresh() {
  //   if (!this._keycloak.authenticated) return;

  //   const exp = this._keycloak.tokenParsed?.exp ?? 0;
  //   const now = Math.floor(Date.now() / 1000);
  //   const buffer = 30;
  //   const delay = Math.max((exp - now - buffer) * 1000, 0);

  //   console.log(`Next token refresh in ${delay / 1000}s`);

  //   this._refreshTimeout = setTimeout(async () => {
  //     if (this._refreshInProgress) return;
  //     this._refreshInProgress = true;

  //     try {
  //       const refreshed = await this._keycloak.updateToken(buffer);
  //       if (refreshed) console.log("🔁 Token refreshed");
  //     } catch (err) {
  //       console.error("❌ Failed to refresh token:", err);
  //     } finally {
  //       this._refreshInProgress = false;
  //       this.scheduleTokenRefresh(); // reschedule
  //     }
  //   }, delay);
  // }

  // public clearRefresh() {
  //   if (this._refreshTimeout) {
  //     clearTimeout(this._refreshTimeout);
  //   }
  // }
}