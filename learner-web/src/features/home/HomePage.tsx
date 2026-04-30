import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  PlayCircle,
  Mic,
  Keyboard,
  BrainCircuit,
  ArrowRight,
  Sparkles,
  BarChart
} from "lucide-react"
import KeycloakClient from "../keycloak/keycloak";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const kcClient = KeycloakClient.getInstance();
  const keycloak = kcClient.keycloak;
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* 🌟 SOFT GLOW BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none -z-10 flex justify-center">
        <div className="absolute top-[-10%] w-[800px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      {/* 🚀 HERO SECTION: FLUENRIN LÀ TÂM ĐIỂM */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <Badge variant="outline" className="mb-8 px-4 py-1.5 border-primary/20 bg-primary/5 text-primary text-sm font-medium rounded-full">
            <Sparkles className="w-4 h-4 mr-2 inline-block" />
            The New Standard in Language Learning
          </Badge>

          {/* 👉 TÊN APP SIÊU TO KHỔNG LỒ + HIỆU ỨNG GRADIENT */}
          <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-black tracking-tighter mb-6 text-foreground leading-[1.1]">
            Welcome to <br className="md:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-purple-600 drop-shadow-sm">
              Fluenrin.
            </span>
          </h1>

          <h2 className="text-2xl md:text-3xl font-bold text-foreground/80 mb-8 tracking-tight">
            Master English through Deep Immersion.
          </h2>

          <p className="max-w-2xl mx-auto text-lg text-muted-foreground mb-12 leading-relaxed">
            Fluenrin is not just another flashcard application. It is a carefully engineered environment designed for serious learners. By combining the proven methodologies of <strong>Shadowing</strong> and <strong>Dictation</strong>, Fluenrin forces your brain to actively process language.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={()=>{
              navigate("/topics")
            }} size="lg" className="h-14 px-8 text-base font-bold rounded-xl gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105">
              Start Your Journey <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="ghost" className="h-14 px-8 text-base font-bold gap-2 rounded-xl border border-transparent hover:border-border hover:bg-muted/50 transition-all">
              <PlayCircle className="w-5 h-5 text-muted-foreground" /> See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* 📖 METHODOLOGY: Triết lý học thuật */}
      <section className="py-24 px-4 bg-muted/30 border-y border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-6 text-foreground">
                The Science of Active Recall
              </h2>
              <div className="space-y-6 text-muted-foreground leading-relaxed">
                <p>
                  Most language learners spend years passively watching videos or clicking multiple-choice answers without ever improving their spoken fluency. Fluenrin changes this paradigm by requiring active participation.
                </p>
                <p>
                  When you use our <strong>Dictation</strong> mode, you are training your ear to catch every subtle native sound, linking phonetics directly to spelling. It reveals the blind spots in your listening skills that passive watching hides.
                </p>
                <p>
                  Transitioning to <strong>Shadowing</strong>, you immediately apply what you've heard. By mimicking the rhythm, intonation, and stress of native speakers in real-time, you reprogram your vocal muscles to speak English naturally, breaking away from translated, robotic speech.
                </p>
              </div>
            </div>

            <div className="relative rounded-2xl border border-border bg-card p-8 shadow-sm transition-all hover:shadow-md">
              <div className="absolute top-4 left-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <BrainCircuit className="w-6 h-6 text-primary" />
              </div>
              <div className="mt-12 space-y-4">
                <div className="h-2 w-3/4 bg-muted rounded-full" />
                <div className="h-2 w-full bg-muted rounded-full" />
                <div className="h-2 w-5/6 bg-muted rounded-full" />
                <div className="p-4 mt-6 bg-primary/5 border border-primary/10 rounded-xl">
                  <p className="text-sm font-mono text-primary font-medium italic">"Fluency is a habit, not a destination."</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🧩 CORE FEATURES */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Core Features</h2>
            <p className="text-muted-foreground">Everything you need to reach the next level.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Shadowing Practice",
                desc: "Listen to native audio and speak aloud simultaneously. Perfect your rhythm, tone, and connected speech.",
                icon: Mic
              },
              {
                title: "Focused Dictation",
                desc: "Type exactly what you hear. This intense exercise forces you to recognize linking sounds and weak forms.",
                icon: Keyboard
              },
              {
                title: "Contextual Vocabulary",
                desc: "Stop memorizing isolated words. Learn vocabulary within the context of real sentences and situations.",
                icon: BarChart
              }
            ].map((feature, i) => (
              <div key={i} className="group p-8 rounded-2xl border border-border bg-card hover:bg-muted/20 transition-all duration-300 hover:-translate-y-1">
                <div className="mb-6 inline-flex p-3 rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🏁 FINAL CTA */}
      <section className="py-24 text-center border-t border-border/50 bg-muted/10">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="text-3xl md:text-4xl font-black mb-6 text-foreground tracking-tight">Ready to build your fluency?</h2>
          <p className="text-muted-foreground mb-10 text-lg">
            Join Fluenrin today and transform the way you learn English. Consistent, focused practice yields the best results.
          </p>
          <Button onClick={()=>{
            if (!keycloak.authenticated) {
              keycloak.login();
            } else {
              navigate("/topics");
            }
          }} size="lg" className="h-14 px-10 text-base font-bold rounded-xl shadow-md transition-transform hover:scale-105">
            Create Your Account
          </Button>
        </div>
      </section>
    </div>
  )
}

export default HomePage