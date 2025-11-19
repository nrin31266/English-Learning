import type { IUserProfile } from "@/types";
import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import FullScreenSpinner from "@/components/FullScreenSpinner";
import AccessDenied from "@/components/AccessDenied";
import KeycloakClient from "../keycloak";
import handleAPI from "@/apis/handleAPI";

type AuthContextType = {
  profile: IUserProfile | null;
  setProfile: (profile: IUserProfile | null) => void;
};

const AuthContext = createContext<AuthContextType>({
  profile: null,
  setProfile: () => {},
});

let initFlag = false;

const AuthProvider = () => {
  const [profile, setProfile] = useState<IUserProfile | null>(null);

  const [loadingKC, setLoadingKC] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const keycloak = KeycloakClient.getInstance().keycloak;
  const roles = keycloak.realmAccess?.roles || [];

  const isAdmin = roles.includes("ADMIN");
  // ───────────────────────────────────────────
  // 1️⃣ INIT KEYCLOAK
  // ───────────────────────────────────────────
  const init = async () => {
    if (initFlag) return;
    initFlag = true;

    await keycloak.init({
      onLoad: "check-sso",
      pkceMethod: "S256",
      silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html",
    });

    if (keycloak.authenticated) {
      KeycloakClient.getInstance().setupTokenRefresh();
    } else {
      keycloak.login();
    }

    setLoadingKC(false);
  };

  useEffect(() => {
    init();
  }, []);

  // ───────────────────────────────────────────
  // 2️⃣ LOAD USER PROFILE FROM BACKEND
  // ───────────────────────────────────────────
  const fetchProfile = async () => {
    if (!keycloak.authenticated || !isAdmin) return;

    const backendProfile = await handleAPI<IUserProfile>({
      method: "POST",
      endpoint: "/api/user-profiles/me",
      isAuth: true,
    });

    setProfile(backendProfile);
    setLoadingProfile(false);
  };

  useEffect(() => {
    if (!loadingKC && keycloak.authenticated) {
      fetchProfile();
    }
  }, [loadingKC]);

  

  // ───────────────────────────────────────────
  // 3️⃣ UI STATE RENDER
  // ───────────────────────────────────────────

  if (loadingKC) return <FullScreenSpinner label="Checking session..." />;

  if (!keycloak.authenticated) return <FullScreenSpinner label="Redirecting..." />;
  if (!isAdmin) return <AccessDenied />;

  if (loadingProfile) return <FullScreenSpinner label="Loading profile..." />;

  
  

  return (
    <AuthContext.Provider value={{ profile, setProfile }}>
      <Outlet />
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;
