import Keycloak from "keycloak-js";

export default class KeycloakClient {
  private static _instance: KeycloakClient | null = null;
  private _keycloak: Keycloak;
  private _refreshInProgress = false;
  // private _refreshTimer: ReturnType<typeof setTimeout> | null = null;
  // 🔹 Private constructor để ngăn new từ bên ngoài
  private constructor() {
    this._keycloak = new Keycloak({
      url: "http://localhost:8080",
      realm: "english-learning-realm",
      clientId: "admin-web",
    });
  }

  // 🔹 Singleton getter — giống Java getInstance()
  public static getInstance(): KeycloakClient {
    if (!this._instance) {
      this._instance = new KeycloakClient();
    }
    return this._instance;
  }

  // 🔹 Trả về keycloak raw instance nếu cần
  public get keycloak(): Keycloak {
    return this._keycloak;
  }

  // 🔹 Hàm init
  public async init(): Promise<void> {
    console.log("🔹 Initializing Keycloak...");

    await this._keycloak.init({
      onLoad: "check-sso",
      pkceMethod: "S256",
      silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html",
    });

    console.log("🔹 Keycloak initialized.");
  }

  // 🔹 Ví dụ thêm refresh token (nếu cần sau này)
  public setupTokenRefresh() {
    const schedule = () => {
      if (!this.keycloak.authenticated) {
        console.error("Keycloak not authenticated, cannot schedule token refresh.");
        return;
      }

      const expireTime = this.keycloak.tokenParsed?.exp || 0;
      const now = Math.floor(Date.now() / 1000);
      const buffer = 30; // refresh trước 30s
      const delay = Math.max((expireTime - now - buffer) * 1000, 0);

      
      console.log(`Next token refresh in ${delay / 1000}s`);

      setTimeout(async () => {
        if (this._refreshInProgress) return;
        this._refreshInProgress = true;
        try {
          const refreshed = await this.keycloak.updateToken(buffer);
          if (refreshed) console.log("🔁 Token refreshed");
        } catch (err) {
          console.error("❌ Failed to refresh token:", err);
        } finally {
          this._refreshInProgress = false;
          schedule(); // lặp lại cho token mới
        }
      }, delay);
    };

    schedule();
  }
  // public async refreshToken(): Promise<void> {
  //   if (this._refreshInProgress) return;
  //   this._refreshInProgress = true;
  //   try {
  //     const updated = await this._keycloak.updateToken(30);
  //     if (updated) console.log("🔹 Token refreshed");
  //   } catch (err) {
  //     console.error("❌ Token refresh failed", err);
  //   } finally {
  //     this._refreshInProgress = false;
  //   }
  // }
}


// class KeycloakClient {
//   private static _instance: Keycloak | null = null;
//   private static _refreshInProgress = false;


//   static getInstance(): Keycloak {
//      if (!this._instance) {
//       this._instance = new Keycloak({
//         url: "http://localhost:8080", // Keycloak server
//         realm: "toeic-realm",
//         clientId: "admin-web",
//       });
//     }
//     return this._instance;
//   }
  
// }
// export const getKeycloak = () => {
//   return KeycloakClient.getInstance();
// }



// let keycloak: Keycloak | null = null;

// export const getKeycloak = () => {
//   if (!keycloak) {
//     keycloak = new Keycloak({
//       url: "http://localhost:8080", // Keycloak server
//       realm: "toeic-realm",
//       clientId: "admin-web",
//     });
//   }
//   return keycloak;
// };

// import type { UserProfile } from "@/types";
// import Keycloak from "keycloak-js";


// class KeycloakService {
//   private static _instance: Keycloak | null = null;
//   private static _profile: UserProfile | null = null;
//   private static _refreshInProgress = false;

//   static get keycloak(): Keycloak {
//     if (!this._instance) {
//       this._instance = new Keycloak({
//         url: "http://localhost:8080", // Keycloak server
//         realm: "toeic-realm",
//         clientId: "admin-web",
//       });
//     }
//     return this._instance;
//   }

//   static get profile(): UserProfile | null {
//     return this._profile;
//   }

//   static async init(): Promise<boolean> {
//     console.log("Connecting to Keycloak...");
//     const authenticated = await this.keycloak.init({
//       onLoad: "check-sso",
//       pkceMethod: "S256",
//       silentCheckSsoRedirectUri:
//         window.location.origin + "/silent-check-sso.html",
//     });
//     if (authenticated) {
//       console.log("User authenticated");
//       this._profile = await this.keycloak.loadUserProfile();
//       this._profile.token = this.keycloak.token || "";
//       const roles = this.keycloak.realmAccess?.roles || [];
//       console.log("User roles:", roles);
//       // Bắt đầu tự động refresh token
//       // this._autoRefresh();
//     }
//     return authenticated;
//   }

//   //   static login() {
//   //     return this.keycloak.login();
//   //   }

//   //   static logout() {
//   //     return this.keycloak.logout({ redirectUri: "http://localhost:3000" });
//   //   }
//   // Arrow function giữ context của class, tránh mất this
//   // static login = () => {
//   //   return this.keycloak.login({ redirectUri: window.location.origin });
//   // };
//   // // Arrow function giữ context của class, tránh mất this
//   // static logout = () => {
//   //   return this.keycloak.logout({ redirectUri: window.location.origin });
//   // };

//   // private static _autoRefresh() {
//   //   const schedule = () => {
//   //     if (!this.keycloak.authenticated) return;

//   //     const expireTime = this.keycloak.tokenParsed?.exp || 0;
//   //     const now = Math.floor(Date.now() / 1000);
//   //     const buffer = 30; // refresh trước 30s
//   //     const delay = Math.max((expireTime - now - buffer) * 1000, 0);

//   //     console.log(`Next token refresh in ${delay / 1000}s`);

//   //     setTimeout(async () => {
//   //       if (!this.keycloak.authenticated) return;

//   //       if (this._refreshInProgress) return;
//   //       this._refreshInProgress = true;

//   //       try {
//   //         const refreshed = await this.keycloak.updateToken(buffer);
//   //         if (refreshed) console.log("🔁 Token refreshed");
//   //       } catch (err) {
//   //         console.error("❌ Failed to refresh token:", err);
//   //       } finally {
//   //         this._refreshInProgress = false;
//   //         schedule(); // lặp lại cho token mới
//   //       }
//   //     }, delay);
//   //   };

//   //   schedule();
//   // }

//   //   // ✅ Hàm tự động refresh token
//   // private static _autoRefresh() {
//   //   setInterval(async () => {
//   //     console.log("Check token refresh...");
//   //     if (!this.keycloak.authenticated) return;
//   //     if (this._refreshInProgress) return; // tránh refresh trùng

//   //     const expireTime = this.keycloak.tokenParsed?.exp || 0;
//   //     const now = Math.floor(Date.now() / 1000);

//   //     // Refresh nếu còn dưới 30s
//   //     if (expireTime - now < 30) {
//   //       this._refreshInProgress = true;
//   //       try {
//   //         const refreshed = await this.keycloak.updateToken(60);
//   //         if (refreshed) console.log("🔁 Token refreshed");
//   //       } catch (err) {
//   //         console.error("❌ Failed to refresh token:", err);
//   //       } finally {
//   //         this._refreshInProgress = false;
//   //       }
//   //     }
//   //   }, 30000); // check mỗi 2 phút
//   // }
// }

// export default KeycloakService;
// //   static async init(): Promise<boolean> {
// //     const authenticated = await this.keycloak.init({
// //       onLoad: "login-required",
// //       checkLoginIframe: false,
// //       pkceMethod: "S256",
// //     });

// //     if (authenticated) {
// //       const kcProfile = await this.keycloak.loadUserProfile();
// //       this._profile = {
// //         username: kcProfile.username,
// //         email: kcProfile.email,
// //         firstName: kcProfile.firstName,
// //         lastName: kcProfile.lastName,
// //         token: this.keycloak.token || "",
// //       };
// //     }

// //     return authenticated;
// //   }
