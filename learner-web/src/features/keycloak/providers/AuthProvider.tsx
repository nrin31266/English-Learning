import type { IUserProfile } from "@/types";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import FullScreenSpinner from "@/components/FullScreenSpinner";
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

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<IUserProfile | null>(null);
  const [loadingKC, setLoadingKC] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const kcClient = KeycloakClient.getInstance();
  const keycloak = kcClient.keycloak;

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
  // 2️⃣ LOAD PROFILE
  // ───────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      if (!keycloak.authenticated) {
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

  // Hook phải nằm trước mọi return
  const contextValue = useMemo( 
    () => ({
      profile,
      setProfile,
    }),
    [profile]
  );

  // ───────────────────────────────────────────
  // 3️⃣ UI RENDER
  // ───────────────────────────────────────────

  if (loadingKC)
    return <FullScreenSpinner label="Checking session..." />;

  if (!keycloak.authenticated)
    return <FullScreenSpinner label="Redirecting..." />;

  if (loadingProfile)
    return <FullScreenSpinner label="Loading profile..." />;

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;