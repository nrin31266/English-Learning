import type { IUserProfile } from "@/types";
import { createContext, useContext, useEffect, useState } from "react";
import FullScreenSpinner from "@/components/FullScreenSpinner";
import KeycloakClient from "../keycloak";
import handleAPI from "@/apis/handleAPI";
import { useTranslation } from "react-i18next";

type AuthContextType = {
  profile: IUserProfile | null;
  setProfile: (profile: IUserProfile | null) => void;
};

const AuthContext = createContext<AuthContextType>({
  profile: null,
  setProfile: () => {},
});

let initFlag = false;

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<IUserProfile | null>(null);

  const [loadingKC, setLoadingKC] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const keycloak = KeycloakClient.getInstance().keycloak;
  const roles = keycloak.realmAccess?.roles || [];

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
    if (!keycloak.authenticated) return;

    const backendProfile = await handleAPI<IUserProfile>({
      method: "POST",
      endpoint: "/user-profiles/me",
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

  if (loadingKC) return <FullScreenSpinner label={t("auth.checkingSession")} />;

  if (!keycloak.authenticated) return <FullScreenSpinner label={t("auth.redirecting")} />;

  if (loadingProfile) return <FullScreenSpinner label={t("auth.loadingProfile")} />;

  
  

  return (
    <AuthContext.Provider value={{ profile, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;
