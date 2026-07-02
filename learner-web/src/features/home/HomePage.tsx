import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation, Trans } from "react-i18next";
import {
  PlayCircle,
  Mic,
  Keyboard,
  BrainCircuit,
  ArrowRight,
  Sparkles,
  BookMarked,
} from "lucide-react";
import KeycloakClient from "../keycloak/keycloak";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const { t } = useTranslation();

  const kcClient = KeycloakClient.getInstance();
  const keycloak = kcClient.keycloak;
  const navigate = useNavigate();

  const features = [
    {
      titleKey: "home.featureShadowingTitle",
      descKey: "home.featureShadowingDesc",
      icon: Mic,
    },
    {
      titleKey: "home.featureDictationTitle",
      descKey: "home.featureDictationDesc",
      icon: Keyboard,
    },
    {
      titleKey: "home.featureVocabularyTitle",
      descKey: "home.featureVocabularyDesc",
      icon: BookMarked,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Soft glow background */}
      <div className="pointer-events-none fixed inset-0 -z-10 flex justify-center">
        <div className="absolute top-[-10%] h-[480px] w-[760px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* Hero */}
      <section className="relative px-4 pb-20 pt-28 md:pt-32">
        <div className="container mx-auto max-w-5xl text-center">
          <Badge
            variant="outline"
            className="mb-8 rounded-full border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary"
          >
            <Sparkles className="mr-2 inline-block size-4" />
            {t("home.badge")}
          </Badge>

          <h1 className="mb-6 text-5xl font-black leading-[1.08] tracking-tighter text-foreground md:text-7xl lg:text-[5.5rem]">
            {t("home.welcome")} <br className="md:hidden" />
            <span className="bg-linear-to-r from-primary via-primary/85 to-foreground bg-clip-text text-transparent">
              {t("home.appName")}
            </span>
          </h1>

          <h2 className="mb-8 text-2xl font-bold tracking-tight text-foreground/80 md:text-3xl">
            {t("home.tagline")}
          </h2>

          <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            <Trans i18nKey="home.description" components={{ strong: <strong /> }} />
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              onClick={() => navigate("/topics")}
              size="lg"
              className="h-14 rounded-xl px-8 text-base font-bold shadow-lg shadow-primary/15 transition-all hover:-translate-y-0.5"
            >
              {t("home.startJourney")}
              <ArrowRight className="ml-2 size-4" />
            </Button>

            <Button
              size="lg"
              variant="ghost"
              className="h-14 rounded-xl border border-transparent px-8 text-base font-bold transition-all hover:border-border hover:bg-muted/50"
              onClick={() => navigate("/topics")}
            >
              <PlayCircle className="mr-2 size-5 text-muted-foreground" />
              {t("home.seeHowItWorks")}
            </Button>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="border-y border-border/50 bg-muted/30 px-4 py-20 md:py-24">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 items-center gap-14 md:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl font-bold tracking-tight text-foreground">
                {t("home.scienceTitle")}
              </h2>

              <div className="space-y-5 leading-relaxed text-muted-foreground">
                <p>{t("home.scienceDesc1")}</p>
                <p>
                  <Trans
                    i18nKey="home.scienceDesc2"
                    components={{ strong: <strong /> }}
                  />
                </p>
                <p>
                  <Trans
                    i18nKey="home.scienceDesc3"
                    components={{ strong: <strong /> }}
                  />
                </p>
              </div>
            </div>

            <div className="relative rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="mb-8 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BrainCircuit className="size-6" />
              </div>

              <div className="space-y-4">
                <div className="h-2 w-3/4 rounded-full bg-muted" />
                <div className="h-2 w-full rounded-full bg-muted" />
                <div className="h-2 w-5/6 rounded-full bg-muted" />

                <div className="mt-6 rounded-xl border border-primary/10 bg-primary/5 p-4">
                  <p className="text-sm font-medium italic leading-relaxed text-primary">
                    {t("home.scienceQuote")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core features */}
      <section className="px-4 py-20 md:py-24">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground">
              {t("home.featuresTitle")}
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              {t("home.featuresSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.titleKey}
                  className="group rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-muted/20"
                >
                  <div className="mb-6 inline-flex rounded-xl bg-primary/10 p-3 text-primary transition-transform group-hover:scale-105">
                    <Icon className="size-6" />
                  </div>

                  <h3 className="mb-3 text-xl font-bold text-foreground">
                    {t(feature.titleKey)}
                  </h3>

                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t(feature.descKey)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border/50 bg-muted/10 px-4 py-20 text-center md:py-24">
        <div className="container mx-auto max-w-3xl">
          <h2 className="mb-6 text-3xl font-black tracking-tight text-foreground md:text-4xl">
            {t("home.ctaTitle")}
          </h2>

          <p className="mb-10 text-lg text-muted-foreground">
            {t("home.ctaDesc")}
          </p>

          <Button
            onClick={() => {
              if (!keycloak.authenticated) {
                keycloak.login();
              } else {
                navigate("/topics");
              }
            }}
            size="lg"
            className="h-14 rounded-xl px-10 text-base font-bold shadow-md transition-transform hover:-translate-y-0.5"
          >
            {t("home.ctaButton")}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;