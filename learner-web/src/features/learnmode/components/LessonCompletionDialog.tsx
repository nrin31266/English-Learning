import RewardCelebration from "@/components/gamification/RewardCelebration";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Coins, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { waitForLessonReward, type LessonReward } from "../api/lessonRewardBus";

type Props = { open: boolean; lessonId?: string; celebrate: boolean; expectReward: boolean; estimatedReward?: { earnedXp: number; earnedCoins: number }; onBack: () => void; onContinue: () => void; children?: ReactNode };

export function LessonCompletionDialog({ open, lessonId, celebrate, expectReward, estimatedReward, onBack, onContinue, children }: Props) {
  const { t } = useTranslation();
  const [reward, setReward] = useState<LessonReward | null>(null);
  const [rewardPending, setRewardPending] = useState(false);
  useEffect(() => {
    if (!open || !celebrate || !expectReward || !lessonId) return;
    let active = true;
    setRewardPending(true);
    void waitForLessonReward(lessonId).then((value) => {
      if (!active) return;
      setReward(value);
      setRewardPending(false);
    });
    return () => { active = false; };
  }, [celebrate, expectReward, lessonId, open]);
  const displayedReward = reward ?? estimatedReward;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onContinue()}>
      {open && celebrate && <RewardCelebration />}
      <DialogContent className="overflow-hidden rounded-2xl p-0 sm:max-w-[440px]">
        <div className="flex flex-col items-center px-7 pb-7 pt-8 text-center">
          <div className={celebrate ? "rounded-full bg-amber-100 p-3 text-amber-600 dark:bg-amber-950/40" : "rounded-full bg-muted p-3 text-muted-foreground"}>
            {celebrate ? <Trophy className="h-10 w-10" /> : <CheckCircle2 className="h-8 w-8" />}
          </div>
          <DialogHeader className="mt-4 items-center text-center">
            <DialogTitle className="text-2xl">{t("modals.completionTitle")}</DialogTitle>
            <DialogDescription className="max-w-xs leading-6">{celebrate ? t("modals.completionDescription") : "Bạn đã hoàn thành bài học này trước đó."}</DialogDescription>
          </DialogHeader>
          {children && <div className="mt-5 w-full">{children}</div>}
          {celebrate && expectReward && (
            <div className="mt-4 w-full rounded-xl border bg-muted/40 p-3">
              {displayedReward ? <div className="grid grid-cols-2 gap-2"><div><p className="text-xl font-bold text-primary">+{displayedReward.earnedXp} XP</p><p className="text-xs text-muted-foreground">Kinh nghiệm</p></div><div><p className="flex items-center justify-center gap-1 text-xl font-bold text-amber-600"><Coins className="h-5 w-5" />+{displayedReward.earnedCoins}</p><p className="text-xs text-muted-foreground">Vàng</p></div></div> : <p className="text-sm text-muted-foreground">{rewardPending ? "Đang nhận phần thưởng..." : "Phần thưởng đã được ghi nhận."}</p>}
            </div>
          )}
          <div className="mt-6 w-full space-y-2"><Button className="h-10 w-full" onClick={onBack}>{t("modals.completionBackToTopic")}</Button><Button className="h-10 w-full" variant="outline" onClick={onContinue}>{t("modals.completionContinue")}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
