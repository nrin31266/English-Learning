import React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import LessonDataTableRow from "./LessonDataTableRow"
import type { ILessonDto } from "@/types"

const data = [
  { id: "m5gr84i9", amount: 316, status: "success", email: "ken99@example.com" },
  { id: "3u1reuv4", amount: 242, status: "success", email: "Abe45@example.com" },
  { id: "derv1ws0", amount: 837, status: "processing", email: "Monserrat44@example.com" },
  { id: "5kma53ae", amount: 874, status: "success", email: "Silas22@example.com" },
  { id: "bhqecj4p", amount: 721, status: "failed", email: "carmella@example.com" },
]

interface LessonDataTableProps {
  // Define any props if needed
  data: ILessonDto[],
  loading: boolean,
}

const LessonDataTable = ({ data, loading }: LessonDataTableProps) => {
  return (


    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Email</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody className="">
        {
          loading ? <TableRow>
            <TableCell colSpan={7} className="h-60 text-center">
              <div className="flex justify-center items-center gap-2 text-stone-500">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent"></div>
                <span>Loading Lessons...</span>
              </div>
            </TableCell>
          </TableRow> : data.map((item) => (
          <LessonDataTableRow key={item.id} row={item} />
        ))
        }
        
      </TableBody>
    </Table>

  )
}

export default LessonDataTable
