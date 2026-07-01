import { cn } from "@/lib/utils";
import { rewardCelebrationSound } from "@/utils/sound";
import { Coins, Sparkles, Star, Trophy } from "lucide-react";
import { useEffect } from "react";
import type { CSSProperties } from "react";

type Props = {
  className?: string;
  playSound?: boolean;
};

const PARTICLES = [
  { Icon: Star, x: "-42vw", y: "-25vh", color: "text-amber-400", delay: "0ms" },
  { Icon: Sparkles, x: "-30vw", y: "28vh", color: "text-fuchsia-500", delay: "80ms" },
  { Icon: Coins, x: "-15vw", y: "-38vh", color: "text-yellow-500", delay: "140ms" },
  { Icon: Trophy, x: "8vw", y: "-34vh", color: "text-orange-500", delay: "40ms" },
  { Icon: Star, x: "25vw", y: "-24vh", color: "text-sky-500", delay: "110ms" },
  { Icon: Sparkles, x: "40vw", y: "18vh", color: "text-emerald-500", delay: "170ms" },
  { Icon: Coins, x: "34vw", y: "34vh", color: "text-amber-500", delay: "220ms" },
  { Icon: Trophy, x: "-38vw", y: "35vh", color: "text-primary", delay: "190ms" },
  { Icon: Sparkles, x: "2vw", y: "38vh", color: "text-rose-500", delay: "260ms" },
  { Icon: Star, x: "43vw", y: "-8vh", color: "text-violet-500", delay: "70ms" },
];

export default function RewardCelebration({ className, playSound = true }: Props) {
  useEffect(() => {
    if (!playSound) return;
    rewardCelebrationSound.stop();
    rewardCelebrationSound.play();
  }, [playSound]);

  return (
    <div className={cn("pointer-events-none fixed inset-0 z-40 overflow-hidden", className)} aria-hidden>
      {PARTICLES.map(({ Icon, x, y, color, delay }, index) => (
        <Icon
          key={index}
          className={cn("reward-celebration-particle absolute left-1/2 top-[42%] h-7 w-7", color)}
          style={{ "--burst-x": x, "--burst-y": y, animationDelay: delay } as CSSProperties}
        />
      ))}
    </div>
  );
}
