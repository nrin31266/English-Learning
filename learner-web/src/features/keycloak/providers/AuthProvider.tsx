import type { IUserProfile } from "@/types";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import FullScreenSpinner from "@/components/FullScreenSpinner";
import KeycloakClient from "../keycloak";
import handleAPI from "@/apis/handleAPI";

// IMPORT REDUX & GAMIFICATION UTILS


import { mapGamificationData } from "@/utils/gamificationMemo";
import type { IUserGamificationResponse } from "@/types/gamification";
import { useAppDispatch } from "@/store";
import { setInitialGamification } from "@/store/gamificationSlice";

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

  // KHỞI TẠO REDUX DISPATCH
  const dispatch = useAppDispatch();

  // -------------------------------------------
  // 1. INIT KEYCLOAK
  // -------------------------------------------
  useEffect(() => {
    const init = async () => {
      // KeycloakClient đã dùng 'check-sso', nên nó sẽ 
      // âm thầm kiểm tra xem có session không mà không redirect.
      await kcClient.init();
      setLoadingKC(false);
    };

    init();
  }, []);

  // ------------------------------------------- 
  // 2. LOAD PROFILE & GAMIFICATION ECOSYSTEM
  // -------------------------------------------
  useEffect(() => {
    const fetchUserData = async () => {
      if (!keycloak.authenticated) {
        setLoadingProfile(false);
        return;
      }

      try {
        // 1. Tải Profile thông thường
        const backendProfile = await handleAPI<IUserProfile>({
          method: "POST",
          endpoint: "/user-profiles/me",
          isAuth: true,
        });
        setProfile(backendProfile);

        // 2. Tải dữ liệu Gamification từ Backend
        console.info("📡 Fetching global gamification metrics from userservice...");
        const gamificationRaw = await handleAPI<IUserGamificationResponse>({
          method: "GET",
          endpoint: "/user-profiles/gamification/me",
          isAuth: true,
        });

        // 3. Đưa qua hàm toán học O(1) để map ra state, sau đó đẩy vào Redux
        const gamificationState = mapGamificationData(gamificationRaw);
        dispatch(setInitialGamification(gamificationState));
        console.info("🎯 Gamification state synchronized successfully.");

      } catch (err) {
        console.error("❌ Failed to load user ecosystem data", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    if (!loadingKC) {
      fetchUserData();
    }
  }, [loadingKC, dispatch]);

  // Hook phải nằm trước mọi return
  const contextValue = useMemo( 
    () => ({
      profile,
      setProfile,
    }),
    [profile]
  );

  // -------------------------------------------
  // 3. UI RENDER
  // -------------------------------------------

  if (loadingKC)
    return <FullScreenSpinner label="Checking session..." />;

  // Nếu đã login nhưng chưa load xong Profile thì mới hiện Spinner
  if (keycloak.authenticated && loadingProfile)
    return <FullScreenSpinner label="Loading user data..." />;

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;