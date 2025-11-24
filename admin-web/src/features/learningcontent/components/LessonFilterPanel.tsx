
import { SearchForm } from "@/components/SearchForm";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { lessonStatusSelectOptions, lessonTypeOptions } from "@/types";
import { useAppDispatch, useAppSelector } from "@/store";
import { fetchTopicOptions } from "@/store/learningcontent/topicReducer";
interface LessonFilterPanelProps {
    searchParams: URLSearchParams;
    setSearchParams: Dispatch<SetStateAction<URLSearchParams>>;
}


const LessonFilterPanel = ({ searchParams, setSearchParams }: LessonFilterPanelProps) => {
    const isExtendFilter = useMemo(() => {
        return searchParams.get("extendFilter") === "true"
    }, [searchParams]);
    const [searchTerm, setSearchTerm] = useState<string>(searchParams.get("search") || "");
    const dispatch = useAppDispatch();
    const { topicOptions} = useAppSelector((state) => state.learningContent.topics);
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
    const handleBooleanParam = (key: string, value: boolean, resetPage: boolean = true) => {
        const newParams = new URLSearchParams(searchParams);

        if (value === true) newParams.set(key, "true");
        else newParams.delete(key); // false thì xoá

        if (resetPage) {
            newParams.set("page", "1");
        }

        setSearchParams(newParams);
    };



    // Debounce search
    useEffect(() => {
        const timeout = setTimeout(() => {
            handleChangeSearchParam("search", searchTerm, false);
        }, 500);

        return () => clearTimeout(timeout);
    }, [searchTerm]);
    useEffect(() => {
        if (topicOptions.status === 'idle') {
            dispatch(fetchTopicOptions());
        }
    }, [dispatch]);



    return (
        <div className="p-2 space-y-2 text-xs bg-background rounded-md border border-border">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-2 items-center">
                <span className="text-sm font-semibold">Filter by:</span>
                <SearchForm
                    value={searchTerm || ""}
                    onChange={(value) => {
                        setSearchTerm(value);
                    }}
                />
                <Select value={searchParams.get("status") || "all"} onValueChange={(value) =>
                    handleChangeSearchParam("status", value === "all" ? null : value)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Lesson Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            {/* No value */}
                            <SelectItem value="all">All Statuses</SelectItem>
                            {
                                lessonStatusSelectOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))
                            }
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <Select value={searchParams.get("topicSlug") || "all"} onValueChange={(value) =>
                    handleChangeSearchParam("topicSlug", value === "all" ? null : value)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Lesson Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectItem value="all">All Topics</SelectItem>
                            {
                                topicOptions.data.map((topic) => (
                                    <SelectItem key={topic.slug} value={topic.slug}>
                                        {topic.name}
                                    </SelectItem>
                                ))
                            }
                        </SelectGroup>
                    </SelectContent>
                </Select>

                <Button onClick={() => handleBooleanParam("extendFilter", isExtendFilter ? false : true, false)} className="h-8" variant={"ghost"}><ChevronDown /> More</Button>
            </div>
            {isExtendFilter && <div>
                <Select value={searchParams.get("lessonType") || "all"} onValueChange={(value) =>
                    handleChangeSearchParam("lessonType", value === "all" ? null : value)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Lesson Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectItem value="all">All Types</SelectItem>
                            {
                                lessonTypeOptions.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type}
                                    </SelectItem>
                                ))
                            }
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>}
        </div>
    )
}

export default LessonFilterPanel;
