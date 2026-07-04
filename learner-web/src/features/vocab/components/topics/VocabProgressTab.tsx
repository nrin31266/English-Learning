import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/keycloak/providers/AuthProvider";
import KeycloakClient from "@/features/keycloak/keycloak";
import { useAppDispatch, useAppSelector } from "@/store";
import { fetchVocabDashboard } from "@/store/vocabProgressSlice";
import { lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { VocabProgressSkeleton } from "./VocabTopicsSkeleton";

const VocabProgressDashboard = lazy(() => import("../VocabProgressDashboard"));

export function VocabProgressTab() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const dispatch = useAppDispatch();
  const { dashboard, dashboardStatus } = useAppSelector((state) => state.vocabProgress);
  useEffect(() => {
    if (profile && dashboardStatus === "idle")
      void dispatch(fetchVocabDashboard());
  }, [dashboardStatus, dispatch, profile]);
  if (!profile) return <div className="rounded-2xl border bg-card p-10 text-center"><h2 className="text-xl font-bold">{t("vocab.catalog.loginTitle")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("vocab.catalog.loginText")}</p><Button className="mt-4" onClick={() => void KeycloakClient.getInstance().keycloak.login()}>{t("vocab.catalog.login")}</Button></div>;
  if (dashboardStatus === "loading" || !dashboard) return <VocabProgressSkeleton />;
  return <Suspense fallback={<VocabProgressSkeleton />}><VocabProgressDashboard data={dashboard} /></Suspense>;
}
