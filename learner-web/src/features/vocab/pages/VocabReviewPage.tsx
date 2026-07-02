import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarCheck, Loader2 } from "lucide-react";
import type { IVocabSubTopic } from "@/types";
import { useAppDispatch, useAppSelector } from "@/store";
import VocabLearningPanel from "../components/learning/VocabLearningPanel";
import {
  type ReviewRating,
  type VocabLearningMode,
} from "../components/learning/vocabLearningUtils";
import {
  fetchVocabReviewQueue,
  submitVocabReviewSession,
} from "@/store/vocabProgressSlice";

export default function VocabReviewPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const queue = useAppSelector((state) => state.vocabProgress.reviewQueue);
  const loading = useAppSelector(
    (state) => state.vocabProgress.reviewStatus === "loading",
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    void dispatch(fetchVocabReviewQueue());
  }, [dispatch, reloadKey]);

  if (loading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  if (!queue)
    return (
      <div className="mx-auto mt-10 max-w-lg rounded-2xl border bg-card p-8 text-center">
        <CalendarCheck className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-bold">Hôm nay đã ôn xong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Hiện không còn từ nào đến hạn. Cứ giữ nhịp này nhé.
        </p>
        <button
          onClick={() => navigate("/vocab/topics?tab=progress")}
          className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          Về trang tiến độ
        </button>
      </div>
    );

  const subtopic = {
    id: "review",
    title: "Ôn tập hôm nay",
  } as IVocabSubTopic;
  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] w-full max-w-7xl flex-col p-3 sm:p-5">
      <button
        onClick={() => navigate("/vocab/topics?tab=progress")}
        className="mb-3 inline-flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Tiến độ của tôi
      </button>
      <VocabLearningPanel
        key={`review:${reloadKey}`}
        subtopic={subtopic}
        words={queue.words}
        initialProgress={queue.progress}
        onProgressChange={() => {}}
        startInReview
        studyPlan="COMBINED"
        reviewQueueRemaining={Math.max(0, queue.totalDue - queue.words.length)}
        onContinueReview={() => setReloadKey((value) => value + 1)}
        onClose={() => navigate("/vocab/topics?tab=progress")}
        onSessionCommit={async (
          sessionId: string,
          words: Array<{
            wordId: string;
            rating: ReviewRating;
            completedModes: VocabLearningMode[];
          }>,
        ) => {
          const result = await dispatch(
            submitVocabReviewSession({ sessionId, words }),
          ).unwrap();
          return {
            progress: result.progress,
            rewardExpected: result.rewardExpected,
          };
        }}
      />
    </div>
  );
}
