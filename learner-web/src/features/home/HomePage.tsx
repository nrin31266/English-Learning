import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  ChevronRight, 
  PlayCircle, 
  Zap, 
  Heart, 
  MessageCircle, 
  Trophy,
  Star,
  Users,
  Target,
  Award,
  Clock,
  BookOpen,
  Mic,
  Globe,
  Flame,
  Shield
} from "lucide-react"

const HomePage = () => {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950">
      {/* 🌟 SOFT GLOW BACKGROUND */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-emerald-500/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* 🚀 HERO: THE EMOTIONAL HOOK */}
      <section className="relative pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <Badge className="mb-6 px-4 py-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-none rounded-full font-bold">
            ✨ Your personal AI Language Coach
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 text-slate-900 dark:text-white">
            Speak English Like a <br />
            <span className="text-emerald-600">Native, Effortlessly.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
            Stop struggling with boring textbooks. Our AI listens to your voice, understands your mistakes, and helps you master English through the power of <span className="font-bold text-slate-900 dark:text-white">active immersion.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-14 px-10 text-lg font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20">
              Start Learning Now
            </Button>
            <Button size="lg" variant="ghost" className="h-14 px-8 text-lg font-bold gap-2">
              <PlayCircle className="w-6 h-6 text-emerald-600" /> Watch how it works
            </Button>
          </div>
        </div>
      </section>

      {/* 📊 STATS SECTION - NEW */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { number: "500K+", label: "Active Learners", icon: Users },
              { number: "98%", label: "Success Rate", icon: Target },
              { number: "50+", label: "Languages", icon: Globe },
              { number: "24/7", label: "AI Support", icon: Clock }
            ].map((stat, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-100 dark:border-slate-800">
                <stat.icon className="w-8 h-8 mx-auto mb-3 text-emerald-500" />
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{stat.number}</div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🌈 THE "THREE PILLARS" OF MASTERY */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need to be fluent</h2>
            <p className="text-slate-500 italic">Built for learners, powered by intelligence.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="relative group p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-500">
              <div className="mb-6 inline-flex p-4 rounded-2xl bg-orange-100 text-orange-600">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Master Pronunciation</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Shadow real native speakers. Our AI analyzes your tone and stress in real-time, helping you sound natural and confident.
              </p>
            </div>

            <div className="relative group p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-500">
              <div className="mb-6 inline-flex p-4 rounded-2xl bg-blue-100 text-blue-600">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Listen & Transcribe</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Train your ears with smart dictation. We automatically guide you through errors, making sure you never miss a word.
              </p>
            </div>

            <div className="relative group p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-500">
              <div className="mb-6 inline-flex p-4 rounded-2xl bg-emerald-100 text-emerald-600">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Words That Stick</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Learn words in context with multi-meaning quizzes tailored perfectly to your current skill level.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 🎯 HOW IT WORKS - STEP BY STEP */}
      <section className="py-20 px-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/30 dark:to-transparent">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              Simple Process
            </Badge>
            <h2 className="text-4xl font-bold mb-4">Learn in 3 easy steps</h2>
            <p className="text-slate-500">Start speaking confidently from day one</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Choose Content", desc: "Pick from thousands of real-world videos, podcasts, and articles", icon: BookOpen, color: "blue" },
              { step: "02", title: "Practice Speaking", desc: "Shadow native speakers and get instant AI feedback", icon: Mic, color: "emerald" },
              { step: "03", title: "Track Progress", desc: "Watch your fluency score grow with detailed analytics", icon: Award, color: "purple" }
            ].map((item, i) => (
              <div key={i} className="relative text-center">
                <div className="text-6xl font-black text-slate-200 dark:text-slate-800 mb-4">{item.step}</div>
                <div className={`inline-flex p-3 rounded-xl bg-${item.color}-100 text-${item.color}-600 mb-4`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm">{item.desc}</p>
                {i < 2 && <ChevronRight className="hidden md:block absolute top-1/3 -right-6 w-6 h-6 text-slate-300" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🏆 USER SOCIAL PROOF / MOTIVATION */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <h2 className="text-4xl font-bold mb-6">Why our learners love us</h2>
              <div className="space-y-6">
                {[
                  "Real-world content from your favorite videos",
                  "Instant AI feedback on every sentence",
                  "Personalized path from Beginner to Pro",
                  "Fun, gamified experience that keeps you motivated"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 font-medium text-slate-700 dark:text-slate-300">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-center">
                    <Trophy className="w-10 h-10 mx-auto mb-4 text-amber-500" />
                    <div className="text-2xl font-bold">100%</div>
                    <div className="text-sm text-slate-500 italic">User Growth</div>
                </div>
                <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-center">
                    <Users className="w-10 h-10 mx-auto mb-4 text-blue-500" />
                    <div className="text-2xl font-bold">5.0</div>
                    <div className="text-sm text-slate-500 italic">User Rating</div>
                </div>
                <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-center col-span-2">
                    <div className="flex justify-center mb-4">
                        {[1,2,3,4,5].map(s => <Star key={s} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 italic">"The most addictive way to practice English speaking!"</p>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🔥 DAILY STREAK SECTION - NEW */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl p-12 text-center text-white">
            <Flame className="w-16 h-16 mx-auto mb-6 fill-white/20" />
            <h2 className="text-3xl font-bold mb-3">Maintain Your Streak</h2>
            <p className="text-emerald-50 mb-6 max-w-md mx-auto">Practice 15 minutes daily and watch your progress skyrocket</p>
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5,6,7].map(day => (
                <div key={day} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold">
                  {day}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 🛡️ TRUST BADGES - NEW */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="text-sm uppercase tracking-wider text-slate-400 mb-6">Trusted by learners worldwide</p>
          <div className="flex flex-wrap justify-center gap-8 items-center opacity-60">
            <Shield className="w-10 h-10 text-slate-400" />
            <span className="font-bold text-slate-500">GDPR Compliant</span>
            <span className="font-bold text-slate-500">SSL Encrypted</span>
            <span className="font-bold text-slate-500">24/7 Support</span>
          </div>
        </div>
      </section>

      {/* 🏁 FINAL CTA */}
      <section className="py-24 text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to change your life?</h2>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">Join thousands of happy learners and start your journey today</p>
        <Button size="lg" className="h-16 px-12 text-xl font-bold rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
          Get Started For Free
        </Button>
      </section>
    </div>
  )
}

export default HomePage