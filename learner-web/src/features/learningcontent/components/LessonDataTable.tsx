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
    <div className="rounded-md border">
      <Table className="text-xs overflow-auto">
        <TableHeader>
          <TableRow className="h-8">
            <TableHead className="w-[60px] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              {t("allLessons.table.columns.id")}
            </TableHead>
            <TableHead className="min-w-[220px] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              {t("allLessons.table.columns.lesson")}
            </TableHead>
            <TableHead className="w-[70px] px-3 py-1 text-[11px] font-semibold text-muted-foreground text-center">
              {t("allLessons.table.columns.level")}
            </TableHead>
            {/* NEW: Type column */}
            <TableHead className="w-[110px] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              {t("allLessons.table.columns.type")}
            </TableHead>
            <TableHead className="w-[110px] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              {t("allLessons.table.columns.source")}
            </TableHead>
            <TableHead className="w-[90px] px-3 py-1 text-[11px] font-semibold text-muted-foreground text-center">
              {t("allLessons.table.columns.dictation")}
            </TableHead>
            <TableHead className="w-[90px] px-3 py-1 text-[11px] font-semibold text-muted-foreground text-center">
              {t("allLessons.table.columns.shadowing")}
            </TableHead>
            <TableHead className="w-[110px] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              {t("allLessons.table.columns.status")}
            </TableHead>
            <TableHead className="w-[130px] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              {t("allLessons.table.columns.processing")}
            </TableHead>
            <TableHead className="w-[120px] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              {t("allLessons.table.columns.createdAt")}
            </TableHead>
            <TableHead className="w-[120px] px-3 py-1 text-center text-[11px] font-semibold text-muted-foreground">
              {t("allLessons.table.columns.published")}
            </TableHead>
            {/* <TableHead className="w-[60px] px-3 py-1 text-[11px] font-semibold text-muted-foreground text-right">
              Actions
            </TableHead> */}
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={11} className="h-40 text-center align-middle">
                <div className="flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("allLessons.table.loading")}</span>
                </div>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="h-32 text-center text-[12px] text-muted-foreground">
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
