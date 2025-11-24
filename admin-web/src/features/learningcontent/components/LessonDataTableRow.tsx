import { TableCell, TableRow } from '@/components/ui/table';
import React from 'react'
interface LessonDataTableRowProps {
    row: any;
}
const LessonDataTableRow = ({ row }: LessonDataTableRowProps) => {
    return (
        <TableRow >
            <TableCell>{row.id}</TableCell>
            <TableCell>{row.amount}</TableCell>
            <TableCell>{row.status}</TableCell>
            <TableCell>{row.email}</TableCell>
        </TableRow>
    )
}

export default LessonDataTableRow