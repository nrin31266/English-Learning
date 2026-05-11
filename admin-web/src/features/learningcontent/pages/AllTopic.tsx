import SkeletonComponent from "@/components/SkeletonComponent"
import { Badge } from "@/components/ui/badge"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { useAppDispatch, useAppSelector } from "@/store"
import { fetchTopics } from "@/store/learningcontent/topicSlide"
import { getTextColorForHex } from "@/utils/colorUtils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip"
import { BadgeCheckIcon, CircleX, ExternalLink, SettingsIcon, SquarePlus } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from 'react-i18next'
import { Link } from "react-router-dom"
import { TopicDialog } from "../components/TopicDialog"

const AllTopic = () => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<'add' | 'edit'>('add');
    const [topic, setTopic] = useState<any>(null);
    const dispatch = useAppDispatch();
    const { topics } = useAppSelector((state) => state.learningContent.topics);
    const [hydrating, setHydrating] = useState(true);
    useEffect(() => {
        const id = setTimeout(() => setHydrating(false), 50);
        return () => clearTimeout(id);
    }, []);
    useEffect(() => {
        if (topics.status === 'idle') {
            dispatch(fetchTopics());
        }
    }, [dispatch]);

    if (hydrating) {
        return <SkeletonComponent />;
    }

    return (
        <div className="space-y-3">
            
            {/* Header */}
            <div className="flex justify-between items-center">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbPage>{t("appMenu.learningContent")}</BreadcrumbPage>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{t("appMenu.topics")}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <Button
                    onClick={() => {
                        setMode("add");
                        setOpen(true);
                        setTopic(undefined);
                    }}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                >
                    <SquarePlus className="h-3.5 w-3.5" />
                    {t("allTopics.addButton")}
                </Button>
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="h-9">
                            <TableHead className="w-8 text-xs">{t("allTopics.table.columns.index")}</TableHead>
                            <TableHead className="text-xs">{t("allTopics.table.columns.name")}</TableHead>
                            <TableHead className="text-xs">{t("allTopics.table.columns.description")}</TableHead>
                            <TableHead className="text-xs">{t("allTopics.table.columns.active")}</TableHead>
                            <TableHead className="text-center text-xs w-[90px]">{t("allTopics.table.columns.lessons")}</TableHead>
                            <TableHead className="text-xs">{t("allTopics.table.columns.time")}</TableHead>
                            <TableHead className="text-right text-xs w-[60px]">{t("allTopics.table.columns.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* LOADING STATE */}
                        {topics.status === "loading" && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent"></div>
                                        <span className="text-xs">{t("allTopics.table.loading")}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}

                        {/* EMPTY STATE */}
                        {topics.status === "succeeded" && topics.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-20 text-center text-xs text-muted-foreground">
                                    {t("allTopics.table.noResults")}
                                </TableCell>
                            </TableRow>
                        )}

                        {topics.data.map((item, index) => (
                            <TableRow key={item.id} className="h-9">
                                <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                                <TableCell
                                    className="font-medium max-w-[200px] px-2.5 py-1"
                                    style={{
                                        background: item.color || "white",
                                        color: getTextColorForHex(item.color || "#FFFFFF") === "light" ? "white" : "black"
                                    }}
                                >
                                    <Link
                                        to={`/all-lessons?topicSlug=${item.slug}&page=1`}
                                        className="inline-flex items-center gap-1 hover:underline text-xs"
                                    >
                                        {item.name}
                                        <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                                    </Link>
                                </TableCell>
                                <TableCell className="max-w-[300px] text-xs text-muted-foreground px-2.5 py-1">
                                    <p className="truncate">{item.description || "-"}</p>
                                </TableCell>
                                <TableCell className="px-2.5 py-1">
                                    <Badge
                                        variant="secondary"
                                        className={`text-white text-[11px] h-5 px-1.5 gap-1 ${item.isActive ? 'bg-green-600' : 'bg-red-600'}`}
                                    >
                                        {item.isActive
                                            ? <BadgeCheckIcon className="h-3 w-3" />
                                            : <CircleX className="h-3 w-3" />
                                        }
                                        {item.isActive ? t("allTopics.table.active") : t("allTopics.table.inactive")}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center px-2.5 py-1">
                                    <Link
                                        to={`/all-lessons?topicSlug=${item.slug}&page=1`}
                                        className="inline-flex"
                                    >
                                        <Badge
                                            className="h-5 min-w-5 rounded-full px-1.5 font-mono tabular-nums text-xs hover:bg-primary/20 transition-colors cursor-pointer"
                                            variant="outline"
                                        >
                                            {item.lessonCount ?? 0}
                                        </Badge>
                                    </Link>
                                </TableCell>
                                <TableCell className="px-2.5 py-1">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="text-[11px] text-muted-foreground flex flex-col leading-tight">
                                                <span>{t("allTopics.table.created", { date: new Date(item.createdAt).toLocaleDateString() })}</span>
                                                <span>{t("allTopics.table.updated", { date: new Date(item.updatedAt).toLocaleDateString() })}</span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" align="center">
                                            <div className="text-[11px] bg-popover text-popover-foreground px-2 py-1.5 rounded-md shadow-md border">
                                                <span className="block">{t("allTopics.table.created", { date: new Date(item.createdAt).toLocaleString() })}</span>
                                                <span className="block">{t("allTopics.table.updated", { date: new Date(item.updatedAt).toLocaleString() })}</span>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TableCell>
                                <TableCell className="text-right px-2.5 py-1">
                                    <Button
                                        onClick={() => {
                                            setMode("edit");
                                            setOpen(true);
                                            setTopic(item);
                                        }}
                                        size="icon-sm"
                                        variant="ghost"
                                        className="h-7 w-7"
                                    >
                                        <SettingsIcon className="h-3.5 w-3.5" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="h-8">
                            <TableCell colSpan={7} className="text-xs text-muted-foreground px-2.5 py-1">
                                {t("allTopics.table.total", { count: topics.data.length })}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            <TopicDialog open={open} mode={mode} topic={topic} onClose={() => setOpen(false)} />
        </div>
    )
}

export default AllTopic
