
import Keycloak from "keycloak-js";

export default class KeycloakClient {
  private static _instance: KeycloakClient | null = null;
  private _keycloak: Keycloak;
  private _initialized = false;

  private constructor() {
    this._keycloak = new Keycloak({
      url: "http://localhost:8080",
      realm: "english-learning-realm",
      clientId: "learner-web",
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

  public login(): void {
    this._keycloak.login();
  }

  // check user da login chua
  public isAuthenticated(): boolean {
    return this._keycloak.authenticated ?? false;
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
    const exp = this._keycloak.tokenParsed?.exp ?? 0;
    const now = Math.floor(Date.now() / 1000);
    console.log(
      `Keycloak initialized. Authenticated: ${authenticated}, Token expires in ${exp - now
      }s`
    );


    return authenticated;
  }


}