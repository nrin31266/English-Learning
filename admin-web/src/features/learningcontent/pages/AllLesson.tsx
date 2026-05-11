import SkeletonComponent from '@/components/SkeletonComponent';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector, type RootState } from '@/store';
import { fetchLessons } from '@/store/learningcontent/lessonSlice';
import { SquarePlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LessonDataTable from '../components/LessonDataTable';
import LessonFilterPanel from '../components/LessonFilterPanel';
import PaginationBar from '../components/PaginationBar';

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
    const [hydrating, setHydrating] = useState(true);
    useEffect(() => {
        const id = setTimeout(() => setHydrating(false), 50); // 10–120ms
        return () => clearTimeout(id);
    }, []);

    const prevParamsRef = useRef<string | null>(null);   // null = chưa có lần trước
    const dispatch = useAppDispatch();
    const { status, data } = useAppSelector((state: RootState) => state.learningContent.lessons.lessons);
    const loading = status === "loading";

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
    const handleFetchLessons = (uRLSearchParams: URLSearchParams) => {
        const filters = Object.fromEntries(uRLSearchParams.entries());
        // Has page: page -= 1;
        filters.page = filters.page ? String(Number(filters.page) - 1) : "0";
        filters.size = filters.size || "20";
        filters.sort = filters.sort || "id,desc";

        dispatch(fetchLessons(filters));

    };

    if (hydrating) {
        return <SkeletonComponent />;
    }
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex justify-between items-center">
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
                    size="sm"
                    className="h-7 text-xs gap-1"
                >
                    <SquarePlus className="h-3.5 w-3.5" />
                    {t("allLessons.addButton")}
                </Button>
            </div>

            {/* Filter Panel */}
            <LessonFilterPanel
                searchParams={searchParams}
                setSearchParams={setSearchParams}
            />

            <LessonDataTable data={data?.content || []} loading={loading} />

            {data && (
                <PaginationBar
                    page={data.number}
                    size={data.size}
                    totalElements={data.totalElements}
                    totalPages={data.totalPages}
                    numberOfElements={data.numberOfElements}
                    onPageChange={(newPage) => {
                        handleChangeSearchParam("page", newPage + 1, false);
                    }}
                    hasBorderTop={true}
                />
            )}
        </div>
    )
};

export default AllLesson;
