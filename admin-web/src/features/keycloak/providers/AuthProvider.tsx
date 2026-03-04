import type { IUserProfile } from "@/types";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import FullScreenSpinner from "@/components/FullScreenSpinner";
import AccessDenied from "@/components/AccessDenied";
import KeycloakClient from "../keycloak";
import handleAPI from "@/apis/handleAPI";
import { useTranslation } from "react-i18next";

type AuthContextType = {
  profile: IUserProfile | null;
  setProfile: (profile: IUserProfile | null) => void;
};

const AuthContext = createContext<AuthContextType>({
  profile: null,
  setProfile: () => { },
});

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<IUserProfile | null>(null);

  const [loadingKC, setLoadingKC] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const kcClient = KeycloakClient.getInstance(); 
  const keycloak = kcClient.keycloak;
  const value = useMemo(
    () => ({
      profile,
      setProfile,
  }),[profile]);
  // ───────────────────────────────────────────
  // 1️⃣ INIT KEYCLOAK
  // ───────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const authenticated = await kcClient.init();

      if (!authenticated) {
        keycloak.login();
        return;
      }

      setLoadingKC(false);
    };

    init();

  }, []);



  // ───────────────────────────────────────────
  // 2️⃣ LOAD USER PROFILE
  // ───────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      const roles = keycloak.realmAccess?.roles || [];
      const isAdmin = roles.includes("ADMIN");

      if (!keycloak.authenticated || !isAdmin) {
        setLoadingProfile(false);
        return;
      }

      try {
        const backendProfile = await handleAPI<IUserProfile>({
          method: "POST",
          endpoint: "/user-profiles/me",
          isAuth: true,
        });

        setProfile(backendProfile);
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    if (!loadingKC) {
      fetchProfile();
    }
  }, [loadingKC]);

  // ───────────────────────────────────────────
  // 3️⃣ UI RENDER
  // ───────────────────────────────────────────

  if (loadingKC)
    return <FullScreenSpinner label={t("auth.checkingSession")} />;

  if (!keycloak.authenticated)
    return <FullScreenSpinner label={t("auth.redirecting")} />;

  const roles = keycloak.realmAccess?.roles || [];
  const isAdmin = roles.includes("ADMIN");

  if (!isAdmin) return <AccessDenied />;

  if (loadingProfile)
    return <FullScreenSpinner label={t("auth.loadingProfile")} />;

 

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;