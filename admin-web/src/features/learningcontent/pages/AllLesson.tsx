import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { SquarePlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LessonFilterPanel from '../components/LessonFilterPanel';
import { useEffect, useRef, useState } from 'react';
import LessonDataTable from '../components/LessonDataTable';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import handleAPI from '@/apis/handleAPI';
import type { ILessonDto, IPageResponse } from '@/types';
import PaginationBar from '../components/PaginationBar';
import { fa } from 'zod/v4/locales';

const FILTER_KEYS = [
    "search",
    "status",
    "topicSlug",
    "lessonType",
    "languageLevel",
    "sourceType",
    "enableDictation",
    "enableShadowing",
    "page",
    "size",
    "sort",
];

const AllLesson = () => {

    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();


    const prevParamsRef = useRef<string | null>(null);   // null = chưa có lần trước
    const [loading, setLoading] = useState(false);
    const [lessons, setLessons] = useState<IPageResponse<ILessonDto> | null>(null);
    useEffect(() => {
        const currStr = searchParams.toString();
        const curr = new URLSearchParams(currStr);

        // 👉 LẦN ĐẦU TIÊN: luôn gọi API
        if (prevParamsRef.current === null) {
            // TODO: fetchLessons(curr)
            handleFetchLessons(curr);
            prevParamsRef.current = currStr;
            return;
        }

        // 👉 Các lần sau: so sánh chỉ FILTER_KEYS
        const prev = new URLSearchParams(prevParamsRef.current);

        let shouldRefetch = false;

        for (const key of FILTER_KEYS) {
            if (prev.get(key) !== curr.get(key)) {
                shouldRefetch = true;
                break;
            }
        }

        if (shouldRefetch) {
            handleFetchLessons(curr);

        } else {
            console.log("⚪ Only UI params changed → no API:", currStr);
        }

        prevParamsRef.current = currStr;
    }, [searchParams.toString()]);

    const handleChangeSearchParam = (key: string, value: any, resetPage: boolean = true) => {
        const newParams = new URLSearchParams(searchParams);

        const shouldDelete =
            value === null ||
            value === undefined ||
            value === "" ||
            (typeof value === "string" && value.trim() === "");

        if (shouldDelete) {
            newParams.delete(key);
        } else {
            newParams.set(key, String(value));
        }

        if (resetPage) {
            newParams.set("page", "1");
        }
        setSearchParams(newParams);
    };
    const handleFetchLessons = async (uRLSearchParams: URLSearchParams) => {
        const filters = Object.fromEntries(uRLSearchParams.entries());
        // Has page: page -= 1;
        filters.page = filters.page ? String(Number(filters.page) - 5) : "0";
        filters.size = filters.size || "1";
        filters.sort = filters.sort || "id,desc";

        setLoading(true);

        try {
            const data = await handleAPI<IPageResponse<ILessonDto>>({
                endpoint: '/learning-contents/lessons',
                method: 'GET',
                params: filters,
            });
            console.log("Fetched lessons:", data);
            setLessons(data);
        } catch (error) {
            console.log("🔴 Failed to fetch lessons:", error);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center h-6">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem >
                            <BreadcrumbPage>{t("appMenu.learningContent")}</BreadcrumbPage>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />

                        <BreadcrumbItem>
                            <BreadcrumbPage>{t("appMenu.allLessons")}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <Button
                    onClick={() => navigate('/generate-lessons')}
                    variant="outline"
                    className="h-6 text-xs"
                >
                    <SquarePlus />
                    Add Lesson
                </Button>
            </div>

            {/* Filter Panel */}
            <LessonFilterPanel
                searchParams={searchParams}
                setSearchParams={setSearchParams}
            />

            <div>
                <LessonDataTable data={lessons?.content || []} loading={loading} />
                {lessons && (
                    <PaginationBar
                        page={lessons.number}
                        size={lessons.size}
                        totalElements={lessons.totalElements}
                        totalPages={lessons.totalPages}
                        numberOfElements={lessons.numberOfElements}
                        onPageChange={(newPage) => {
                            handleChangeSearchParam("page", newPage + 1, false);
                        }}
                        hasBorderTop={true}
                    />
                )}
            </div>
        </div>
    )
};

export default AllLesson;
