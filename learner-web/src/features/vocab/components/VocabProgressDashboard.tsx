import type { VocabProgressDashboard as Dashboard } from "@/store/vocabProgressSlice";
import { CalendarDays, Clock3, BookOpenCheck } from "lucide-react";
import HeatMap from "@uiw/react-heat-map";
import "@uiw/react-heat-map/dist.css";
import VocabTopicListCard from "./VocabTopicListCard";
import { useNavigate } from "react-router-dom";

const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const formatDate = (value: unknown) => {
  if (typeof value !== "string") return null;

  const match = value.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const isValid =
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day);

  return isValid
    ? new Intl.DateTimeFormat("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date)
    : null;
};

export default function VocabProgressDashboard({
  data,
}: {
  data: Dashboard | null;
}) {
  const navigate = useNavigate();
  if (!data)
    return (
      <div className="rounded-2xl border p-10 text-center text-sm text-muted-foreground">
        Đang tải tiến độ...
      </div>
    );
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);
  const heatMapValues = Object.entries(data.activityByDate).map(
    ([date, count]) => ({
      date,
      count,
      content: `${formatDate(date) ?? date}: ${count} từ`,
    }),
  );
  const studiedToday = data.activityByDate[localDateKey(today)] || 0;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/15 via-primary/5 to-card p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-primary p-3 text-primary-foreground shadow-sm">
            <Clock3 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-primary">
              Phiên ôn hôm nay
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {data.dueReviewWords
                ? `${data.dueReviewWords} từ đang chờ bạn`
                : "Bạn đã hoàn thành lịch ôn"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mỗi phiên lấy 10 từ đến hạn sớm nhất trong tất cả chủ đề.
            </p>
          </div>
        </div>
        <button
          disabled={!data.dueReviewWords}
          onClick={() => navigate("/vocab/review")}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm disabled:cursor-default disabled:opacity-45 sm:mt-0 sm:w-auto"
        >
          {data.dueReviewWords
            ? `Ôn ngay ${Math.min(10, data.dueReviewWords)} từ`
            : "Không còn từ cần ôn"}
        </button>
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat
          icon={BookOpenCheck}
          label="Tổng từ đã thuộc"
          value={data.totalMasteredWords}
          hint="Chỉ tính những từ bạn đã chốt ở mức Đã thuộc."
        />
        <Stat
          icon={CalendarDays}
          label="Lượt từ hôm nay"
          value={studiedToday}
          hint="Tổng lượt từ đã chốt trong ngày, bao gồm cả học mới và ôn lại."
        />
      </div>
      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="font-bold">Hoạt động học từ</h2>
          <p className="text-xs text-muted-foreground">
            Số từ bạn học mỗi ngày trong 12 tháng gần nhất.
          </p>
        </div>
        <div className="no-scrollbar overflow-x-auto pb-2">
          <HeatMap
            value={heatMapValues}
            startDate={startDate}
            endDate={today}
            width={920}
            rectSize={13}
            space={3}
            weekLabels={["CN", "T2", "T3", "T4", "T5", "T6", "T7"]}
            monthLabels={[
              "Th1",
              "Th2",
              "Th3",
              "Th4",
              "Th5",
              "Th6",
              "Th7",
              "Th8",
              "Th9",
              "Th10",
              "Th11",
              "Th12",
            ]}
            panelColors={{
              0: "var(--muted)",
              2: "color-mix(in oklab, var(--primary) 28%, transparent)",
              5: "color-mix(in oklab, var(--primary) 50%, transparent)",
              9: "color-mix(in oklab, var(--primary) 75%, transparent)",
              15: "var(--primary)",
            }}
            rectRender={(props, item) => {
              const formattedDate = formatDate(item?.date);
              const content =
                item?.content ||
                (formattedDate
                  ? `${formattedDate}: ${item?.count ?? 0} từ`
                  : "Không có hoạt động");
              return (
                <rect {...props}>
                  <title>{content}</title>
                </rect>
              );
            }}
            style={
              {
                color: "var(--muted-foreground)",
                fontSize: 10,
                "--rhm-rect-hover-stroke": "var(--primary)",
              } as React.CSSProperties
            }
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Di chuột vào từng ô để xem ngày và số từ đã học.
        </p>
      </section>
      <section>
        <h2 className="mb-3 font-bold">Chủ đề đang học</h2>
        <div className="space-y-2">
          {data.topics.length ? (
            data.topics.map((topic) => (
              <VocabTopicListCard
                key={topic.topicId}
                topic={{
                  id: topic.topicId,
                  title: topic.title,
                  description: topic.description,
                  thumbnailUrl: topic.thumbnailUrl,
                  cefrRange: topic.cefrRange,
                  readySubtopicCount: topic.subtopicCount,
                }}
                progress={topic}
                onOpen={() => navigate(`/vocab/topics/${topic.topicId}`)}
              />
            ))
          ) : (
            <p className="rounded-2xl border bg-card py-10 text-center text-sm text-muted-foreground">
              Bạn chưa bắt đầu chủ đề từ vựng nào.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof BookOpenCheck;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div
      title={hint}
      className="w-full rounded-2xl border bg-card p-4 text-left"
    >
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-3">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {hint}
        </p>
      </div>
    </div>
  );
}
