import React, { useEffect, useState } from "react"
import { TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

import {
  Youtube,
  FileAudio2,
  FileQuestion,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  CircleDot,
  Mic,
  MicOff,
  MoreHorizontal,
  Sparkles,
  User2,
  NotebookPen,
} from "lucide-react"
import type { ILessonDto, ILessonProcessingStepNotifyEvent, lessonProcessingStep, LessonStatus } from "@/types"
import { useWebSocket } from "@/features/ws/providers/WebSockerProvider"
import { useAppDispatch } from "@/store"
import { updateLessonFromProcessingEvent } from "@/store/learningcontent/lessonSlice"
import { Link } from "react-router-dom"
import { getProcessingMeta } from "@/utils/lessonContentUtils"

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
      return (
        <div className="flex items-center gap-1.5">
          <Youtube className="h-3.5 w-3.5 text-red-500" />
          <span className="text-[11px]">YouTube</span>
        </div>
      )
    case "AUDIO_FILE":
      return (
        <div className="flex items-center gap-1.5">
          <FileAudio2 className="h-3.5 w-3.5" />
          <span className="text-[11px]">Audio file</span>
        </div>
      )
    default:
      return (
        <div className="flex items-center gap-1.5">
          <FileQuestion className="h-3.5 w-3.5" />
          <span className="text-[11px]">Other</span>
        </div>
      )
  }
}

const renderStatusBadge = (status: ILessonDto["status"]) => {
  if (status === "READY") {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-400/60 text-emerald-600 text-[11px] px-2 py-0 h-5">
        <CheckCircle2 className="h-3 w-3" />
        Ready
      </Badge>
    )
  }

  if (status === "PROCESSING") {
    return (
      <Badge variant="outline" className="gap-1 border-amber-400/60 text-amber-600 text-[11px] px-2 py-0 h-5">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </Badge>
    )
  }

  if (status === "ERROR") {
    return (
      <Badge variant="outline" className="gap-1 border-red-400/60 text-red-600 text-[11px] px-2 py-0 h-5">
        <AlertTriangle className="h-3 w-3" />
        Error
      </Badge>
    )
  }

  // DRAFT
  return (
    <Badge variant="outline" className="gap-1 border-slate-300 text-slate-600 text-[11px] px-2 py-0 h-5">
      <CircleDot className="h-3 w-3" />
      Draft
    </Badge>
  )
}

// NEW: hiển thị type (AI_ASSISTED vs TRADITIONAL)
const renderLessonType = (type: ILessonDto["lessonType"]) => {
  if (type === "AI_ASSISTED") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-purple-300/70 text-purple-700 bg-purple-50/60 text-[11px] px-2 py-0 h-5"
      >
        <Sparkles className="h-3 w-3" />
        AI Assisted
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 border-sky-300/70 text-sky-700 bg-sky-50/60 text-[11px] px-2 py-0 h-5"
    >
      <User2 className="h-3 w-3" />
      Traditional
    </Badge>
  )
}



const DictationCell = ({ enabled }: { enabled: boolean }) => {
  return (
    <div className="flex items-center justify-center">
      {enabled ? (
        <Badge
          variant="outline"
          className="gap-1 border-emerald-300/70 text-emerald-600 text-[11px] px-2 py-0 h-5"
        >
          <NotebookPen className="h-3 w-3" />
          On
        </Badge>
      ) : (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <NotebookPen className="h-3 w-3" />
          Off
        </span>
      )}
    </div>
  )
}

const ShadowingCell = ({ enabled }: { enabled: boolean }) => {
  return (
    <div className="flex items-center justify-center">
      {enabled ? (
        <Badge
          variant="outline"
          className="gap-1 border-blue-300/70 text-blue-600 text-[11px] px-2 py-0 h-5"
        >
          <Mic className="h-3 w-3" />
          On
        </Badge>
      ) : (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MicOff className="h-3 w-3" />
          Off
        </span>
      )}
    </div>
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
    <TableRow className="h-9 text-xs">
      {/* ID */}
      <TableCell className="px-3 py-1 align-middle text-[11px] text-muted-foreground">
        #{row.id}
      </TableCell>

      {/* Lesson title + slug */}
      <TableCell className="px-3 py-1 align-middle">
        <div className="flex flex-col gap-0.5">
          <Link className="underline" to={`/lessons/${row.slug}`}><span className="text-xs font-medium truncate max-w-[260px]">
            {row.title}
          </span></Link>
          <span className="text-[11px] text-muted-foreground truncate max-w-[260px]">
            {row.topic.slug}
          </span>
        </div>
      </TableCell>



      {/* Level */}
      <TableCell className="px-3 py-1 align-middle text-center">
        <Badge variant="outline" className="h-5 px-2 py-0 text-[11px]">
          {row.languageLevel}
        </Badge>
      </TableCell>

      {/* NEW: Lesson Type */}
      <TableCell className="px-3 py-1 align-middle">
        {renderLessonType(row.lessonType)}
      </TableCell>

      {/* Source */}
      <TableCell className="px-3 py-1 align-middle">
        {renderSourceIcon(row.sourceType)}
      </TableCell>

      {/* Dictation */}
      <TableCell className="px-3 py-1 align-middle">
        <DictationCell enabled={row.enableDictation} />
      </TableCell>

      {/* Shadowing */}
      <TableCell className="px-3 py-1 align-middle">
        <ShadowingCell enabled={row.enableShadowing} />
      </TableCell>

      {/* Status */}
      <TableCell className="px-3 py-1 align-middle">
        {renderStatusBadge(row.status)}
      </TableCell>

      {/* NEW: Processing with progress bar */}
      <TableCell className="px-3 py-1 align-middle">
        {isError ? (
          <div className="flex items-center gap-1.5 text-[11px] text-red-600">
            <AlertTriangle className="h-3 w-3" />
            Failed
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                {processing.label}
              </span>
              {row.status === "PROCESSING" && (
                <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
              )}
              {isDone && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
            </div>
            <Progress
              value={processing.progress}
              className="h-1.5"
            />
          </div>
        )}
      </TableCell>

      {/* Created at */}
      <TableCell className="px-3 py-1 align-middle text-[11px] text-muted-foreground">
        {formatDate(row.createdAt)}
      </TableCell>

      {/* Publish */}
      <TableCell className="px-3 py-1 align-middle text-center">
        {row.publishedAt ? (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-300/70 text-emerald-600 text-[11px] px-2 py-0 h-5"
          >
            <CheckCircle2 className="h-3 w-3" />
            Published at {formatDate(row.publishedAt)}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="gap-1 border-slate-300 text-slate-600 text-[11px] px-2 py-0 h-5"
          >
            <AlertTriangle className="h-3 w-3" />
            Unpublished
          </Badge>
        )}
      </TableCell>
      {/* <TableCell className="px-3 py-1 align-middle text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => console.log("Row actions", row.id)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </TableCell> */}
    </TableRow>
  )
}

export default LessonDataTableRow
