import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TableCell, TableRow } from "@/components/ui/table"
import { useEffect } from "react"

import { useWebSocket } from "@/features/ws/providers/WebSockerProvider"
import { useAppDispatch } from "@/store"
import { updateLessonFromProcessingEvent } from "@/store/learningcontent/lessonSlice"
import type { ILessonDto, ILessonProcessingStepNotifyEvent } from "@/types"
import { getProcessingMeta } from "@/utils/lessonContentUtils"
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  FileAudio2,
  FileQuestion,
  Loader2,
  Sparkles,
  User2,
  Youtube
} from "lucide-react"
import { Link } from "react-router-dom"

interface LessonDataTableRowProps {
  row: ILessonDto
}

const formatDate = (value: string | null) => {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

const renderSourceIcon = (sourceType: ILessonDto["sourceType"]) => {
  switch (sourceType) {
    case "YOUTUBE":
      return <Youtube className="h-4 w-4 text-red-500" />
    case "AUDIO_FILE":
      return <FileAudio2 className="h-4 w-4 text-muted-foreground" />
    default:
      return <FileQuestion className="h-4 w-4 text-muted-foreground" />
  }
}

const renderStatusBadge = (status: ILessonDto["status"]) => {
  if (status === "READY") {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-400/60 text-emerald-600 text-[11px] px-1.5 py-0 h-5">
        <CheckCircle2 className="h-3 w-3" />
        Ready
      </Badge>
    )
  }

  if (status === "PROCESSING") {
    return (
      <Badge variant="outline" className="gap-1 border-amber-400/60 text-amber-600 text-[11px] px-1.5 py-0 h-5">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </Badge>
    )
  }

  if (status === "ERROR") {
    return (
      <Badge variant="outline" className="gap-1 border-red-400/60 text-red-600 text-[11px] px-1.5 py-0 h-5">
        <AlertTriangle className="h-3 w-3" />
        Error
      </Badge>
    )
  }

  // DRAFT
  return (
    <Badge variant="outline" className="gap-1 border-slate-300 text-slate-500 text-[11px] px-1.5 py-0 h-5">
      <CircleDot className="h-3 w-3" />
      Draft
    </Badge>
  )
}

const renderLessonType = (type: ILessonDto["lessonType"]) => {
  if (type === "AI_ASSISTED") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-purple-300/70 text-purple-700 bg-purple-50/60 text-[11px] px-1.5 py-0 h-5"
      >
        <Sparkles className="h-3 w-3" />
        AI
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 border-sky-300/70 text-sky-700 bg-sky-50/60 text-[11px] px-1.5 py-0 h-5"
    >
      <User2 className="h-3 w-3" />
      Manual
    </Badge>
  )
}




const LessonDataTableRow = ({ row }: LessonDataTableRowProps) => {
  const processing = getProcessingMeta(row.processingStep)
  const isError = row.status === "ERROR"
  const isDone = row.processingStep === "COMPLETED"
  const stompClient = useWebSocket();
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!stompClient) return;

    const destination = `/topic/learning-contents/lessons/${row.id}/processing-step`;
    console.log("📡 Subscribing:", destination);

    const subscription = stompClient.subscribe(destination, (msg) => {
      try {
        const event: ILessonProcessingStepNotifyEvent = JSON.parse(msg.body);
        dispatch(updateLessonFromProcessingEvent(event));
      } catch (e) {
        console.error("Failed to parse WS event for lesson", row.id, e);
      }
    });

    return () => {
      console.log("❌ Unsubscribing:", destination);
      subscription.unsubscribe();
    };
  }, [stompClient?.ws, dispatch, row.id]);


  return (
    <TableRow className="h-9">
      {/* ID */}
      <TableCell className="px-2.5 py-1 align-middle text-xs text-muted-foreground">
        #{row.id}
      </TableCell>

      {/* Lesson title */}
      <TableCell className="px-2.5 py-1 align-middle">
        <Link className="underline hover:text-primary" to={`/lessons/${row.id}/${row.slug}`}>
          <span className="text-sm font-medium truncate max-w-[200px] block">{row.title}</span>
        </Link>
      </TableCell>

      {/* Topic */}
      <TableCell className="px-2.5 py-1 align-middle">
        <span className="text-xs text-muted-foreground truncate max-w-[120px] block">{row.topic.slug}</span>
      </TableCell>

      {/* Level */}
      <TableCell className="px-2.5 py-1 align-middle text-center">
        <span className="text-xs text-muted-foreground">{row.languageLevel}</span>
      </TableCell>

      {/* Lesson Type */}
      <TableCell className="px-2.5 py-1 align-middle">
        {renderLessonType(row.lessonType)}
      </TableCell>

      {/* Source */}
      <TableCell className="px-2.5 py-1 align-middle text-center">
        {renderSourceIcon(row.sourceType)}
      </TableCell>

      {/* Dictation */}
      <TableCell className="px-2.5 py-1 align-middle text-center">
        <span className={`text-xs font-medium ${row.enableDictation ? "text-green-600" : "text-red-400"}`}>
          {row.enableDictation ? "Yes" : "No"}
        </span>
      </TableCell>

      {/* Shadowing */}
      <TableCell className="px-2.5 py-1 align-middle text-center">
        <span className={`text-xs font-medium ${row.enableShadowing ? "text-green-600" : "text-red-400"}`}>
          {row.enableShadowing ? "Yes" : "No"}
        </span>
      </TableCell>

      {/* Status */}
      <TableCell className="px-2.5 py-1 align-middle">
        {renderStatusBadge(row.status)}
      </TableCell>

      {/* Processing with progress bar */}
      <TableCell className="px-2.5 py-1 align-middle">
        {isError ? (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            Failed
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Progress value={processing.progress} className="h-1.5 w-14" />
            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
              {processing.label}
            </span>
            {row.status === "PROCESSING" && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500 shrink-0" />
            )}
            {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
          </div>
        )}
      </TableCell>

      {/* Created at */}
      <TableCell className="px-2.5 py-1 align-middle text-xs text-muted-foreground">
        {formatDate(row.createdAt)}
      </TableCell>

      {/* Publish */}
      <TableCell className="px-2.5 py-1 align-middle text-center">
        {row.publishedAt ? (
          <span className="text-xs text-emerald-600 font-medium">{formatDate(row.publishedAt)}</span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </TableCell>
    </TableRow>
  )
}

export default LessonDataTableRow
