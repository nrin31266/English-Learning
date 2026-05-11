import React from "react"
import { useTranslation } from "react-i18next"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import type { ILessonDto } from "@/types"
import LessonDataTableRow from "./LessonDataTableRow"

interface LessonDataTableProps {
  data: ILessonDto[]
  loading: boolean
}

const LessonDataTable = ({ data, loading }: LessonDataTableProps) => {
  const { t } = useTranslation();
  
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="h-9">
            <TableHead className="w-[50px] px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {t("allLessons.table.columns.id")}
            </TableHead>
            <TableHead className="min-w-[180px] px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {t("allLessons.table.columns.lesson")}
            </TableHead>
            <TableHead className="w-[100px] px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {t("allLessons.table.columns.topic")}
            </TableHead>
            <TableHead className="w-[55px] px-2.5 py-1 text-xs font-semibold text-muted-foreground text-center">
              {t("allLessons.table.columns.level")}
            </TableHead>
            <TableHead className="w-[70px] px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {t("allLessons.table.columns.type")}
            </TableHead>
            <TableHead className="w-[50px] px-2.5 py-1 text-xs font-semibold text-muted-foreground text-center">
              {t("allLessons.table.columns.source")}
            </TableHead>
            <TableHead className="w-[55px] px-2.5 py-1 text-xs font-semibold text-muted-foreground text-center">
              {t("allLessons.table.columns.dictation")}
            </TableHead>
            <TableHead className="w-[55px] px-2.5 py-1 text-xs font-semibold text-muted-foreground text-center">
              {t("allLessons.table.columns.shadowing")}
            </TableHead>
            <TableHead className="w-[80px] px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {t("allLessons.table.columns.status")}
            </TableHead>
            <TableHead className="w-[110px] px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {t("allLessons.table.columns.processing")}
            </TableHead>
            <TableHead className="w-[85px] px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {t("allLessons.table.columns.createdAt")}
            </TableHead>
            <TableHead className="w-[85px] px-2.5 py-1 text-center text-xs font-semibold text-muted-foreground">
              {t("allLessons.table.columns.published")}
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={12} className="h-24 text-center align-middle">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("allLessons.table.loading")}</span>
                </div>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="h-20 text-center text-xs text-muted-foreground">
                {t("allLessons.table.noResults")}
              </TableCell>
            </TableRow>
          ) : (
            data.map((lesson) => <LessonDataTableRow key={lesson.id} row={lesson} />)
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default LessonDataTable
