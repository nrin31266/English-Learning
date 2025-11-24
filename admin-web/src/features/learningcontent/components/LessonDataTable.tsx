import React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import type { ILessonDto } from "@/types"
import LessonDataTableRow from "./LessonDataTableRow"

interface LessonDataTableProps {
  data: ILessonDto[]
  loading: boolean
}

const LessonDataTable = ({ data, loading }: LessonDataTableProps) => {
  return (
    <div className="rounded-md border">
      <Table className="text-xs overflow-auto">
        <TableHeader>
          <TableRow className="h-8">
            <TableHead className="w-[60px] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              ID
            </TableHead>
            <TableHead className="min-w-[220px] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              Lesson
            </TableHead>
            <TableHead className="w-[70px] px-3 py-1 text-[11px] font-semibold text-muted-foreground text-center">
              Level
            </TableHead>
            {/* NEW: Type column */}
            <TableHead className="w-[110px] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              Type
            </TableHead>
            <TableHead className="w-[110px] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              Source
            </TableHead>
            <TableHead className="w-[90px] px-3 py-1 text-[11px] font-semibold text-muted-foreground text-center">
              Dictation
            </TableHead>
            <TableHead className="w-[90px] px-3 py-1 text-[11px] font-semibold text-muted-foreground text-center">
              Shadowing
            </TableHead>
            <TableHead className="w-[110px] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="w-[130px] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              Processing
            </TableHead>
            <TableHead className="w-[120px] px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              Created At
            </TableHead>
            <TableHead className="w-[60px] px-3 py-1 text-[11px] font-semibold text-muted-foreground text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={11} className="h-40 text-center align-middle">
                <div className="flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading lessons...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="h-32 text-center text-[12px] text-muted-foreground">
                No lessons found.
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
