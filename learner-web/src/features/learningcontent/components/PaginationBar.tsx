import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useTranslation } from "react-i18next"

interface Props {
  page: number;          // backend return: number = current page (0-based)
  size: number;          // items per page
  totalElements: number; // total items
  totalPages: number;    // total pages
  numberOfElements: number; // items in current page
  onPageChange: (page: number) => void;
  hasBorderTop?: boolean;
}

export default function PaginationBar({
  page,
  size,
  totalElements,
  totalPages,
  numberOfElements,
  onPageChange,
    hasBorderTop = false,
}: Props) {
  const { t } = useTranslation();
  const start = page * size + 1;
  const end = page * size + numberOfElements;

  return (
    <div className={`mt-4 flex items-center justify-between px-2 py-3 ${hasBorderTop ? 'border-t' : ''}`}>
      {/* Bên trái: Showing X–Y of Z */}
      <div className="text-sm text-muted-foreground">
        {totalElements === 0
          ? t("allLessons.pagination.noResults")
          : t("allLessons.pagination.showing", { start, end, total: totalElements })}
      </div>

      {/* Bên phải: Pagination */}
     <div >
         <Pagination>
        <PaginationContent>

          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (page > 0) onPageChange(page - 1);
              }}
              aria-disabled={page === 0}
            />
          </PaginationItem>

          {/* Page numbers */}
          {Array.from({ length: totalPages }).map((_, i) => (
            <PaginationItem key={i}>
              <PaginationLink
                href="#"
                isActive={i === page}
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(i);
                }}
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (page < totalPages - 1) onPageChange(page + 1);
              }}
              aria-disabled={page === totalPages - 1}
              
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
     </div>
    </div>
  );
}
