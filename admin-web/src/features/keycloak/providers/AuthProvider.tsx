import type { IUserProfile } from "@/types";
import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import FullScreenSpinner from "@/components/FullScreenSpinner";
import AccessDenied from "@/components/AccessDenied";
import KeycloakClient from "../keycloak";

type AuthContextType = {
  profile: IUserProfile | null;
  setProfile: (profile: IUserProfile | null) => void;
  setLoading: (loading: boolean) => void;
};

const AuthContext = createContext<AuthContextType>({
  profile: null,
  setProfile: () => {},
  setLoading: () => {},
});


let initFlag = false; // 🔹 fix double render



const AuthProvider = () => {
  const [profile, setProfile] = useState<IUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const init = async () => {
    if (initFlag) return;
    initFlag = true;
    console.log("Start keycloak...")
    const keycloak = KeycloakClient.getInstance().keycloak;

    await keycloak.init({
      onLoad: "check-sso",
      pkceMethod: "S256",
      silentCheckSsoRedirectUri:
        window.location.origin + "/silent-check-sso.html",
    });
    if (keycloak.authenticated) {
      const roles = keycloak.realmAccess?.roles || [];
      const userProfile = await keycloak.loadUserProfile();
      const token = keycloak.token || "";
      setProfile({
        ...userProfile,
        roles,
        token,
      });
      KeycloakClient.getInstance().setupTokenRefresh();
      console.log("User authenticated");
    }else{
      console.log("User not authenticated");
      keycloak.login();
    }
    setLoading(false);
  
  }


  useEffect(() => {
    init();
  }, []);


  if (loading || !profile) {
    return <FullScreenSpinner label="Loading Information..." />;
  }

  if (!loading && profile && !profile?.roles.includes("ADMIN")) {
    return <AccessDenied />;
  }
 



  return (
    <AuthContext.Provider
      value={{
        profile,
        setProfile,
        setLoading,
      }}
    >
      <Outlet />
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;