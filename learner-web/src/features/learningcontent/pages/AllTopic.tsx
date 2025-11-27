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
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useAppDispatch, useAppSelector } from "@/store"
import { fetchTopicOptions, fetchTopics } from "@/store/learningcontent/topicSlide"
import { getTextColorForHex } from "@/utils/colorUtils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip"
import { BadgeCheckIcon, CircleX, SettingsIcon, SquarePlus } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from 'react-i18next'
import { Link } from "react-router-dom"
import { TopicDialog } from "../components/TopicDialog"
import SkeletonComponent from "@/components/SkeletonComponent"
const AllTopic = () => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<'add' | 'edit'>('add');
    const [topic, setTopic] = useState<any>(null);
    const dispatch = useAppDispatch();
    const { topics } = useAppSelector((state) => state.learningContent.topics);
    const [hydrating, setHydrating] = useState(true);
    useEffect(() => {
            const id = setTimeout(() => setHydrating(false), 50); // 10–120ms
            return () => clearTimeout(id);
        }, []);
    useEffect(() => {
        if (topics.status === 'idle') {
            dispatch(fetchTopics());
        }
        // if (topicOptions.status === 'idle') {
            //     dispatch(fetchTopicOptions());
            // }
        
    }, [dispatch]);
    if (hydrating) {
        return <SkeletonComponent/>;
    }
    return (
        <div className="flex flex-col gap-8">
            <div className="flex justify-between items-center h-6">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem >
                            <BreadcrumbPage>{t("appMenu.learningContent")}</BreadcrumbPage>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />

                        <BreadcrumbItem>
                            <BreadcrumbPage>{t("appMenu.topics")}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div>
                    <Button onClick={() => {
                        setMode("add");
                        setOpen(true);
                        setTopic(undefined);
                    }} variant={"outline"} className="h-6 text-xs">
                        <SquarePlus />
                        {t("allTopics.addButton")}</Button>
                </div>
            </div>
            <div className="border p-2 rounded-md">
                <Table>
                    <TableCaption>{t("allTopics.table.caption")}</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-4 max-w-8">{t("allTopics.table.columns.index")}</TableHead>
                            <TableHead>{t("allTopics.table.columns.name")}</TableHead>
                            <TableHead>{t("allTopics.table.columns.description")}</TableHead>
                            <TableHead>{t("allTopics.table.columns.active")}</TableHead>
                            <TableHead className="text-center">{t("allTopics.table.columns.lessons")}</TableHead>
                            <TableHead>{t("allTopics.table.columns.time")}</TableHead>
                            <TableHead className="text-right">{t("allTopics.table.columns.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* LOADING STATE */}
                        {topics.status === "loading" && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center">
                                    <div className="flex justify-center items-center gap-2 text-stone-500">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent"></div>
                                        <span>{t("allTopics.table.loading")}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}

                        {/* EMPTY STATE */}
                        {topics.status === "succeeded" && topics.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-stone-500">
                                    {t("allTopics.table.noResults")}
                                </TableCell>
                            </TableRow>
                        )}

                        {topics.data.map((item, index) => (
                            <TableRow key={item.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="font-medium max-w-[200px]" style={{
                                    background: item.color ? item.color : "white",
                                    color: getTextColorForHex(item.color ? item.color : "#FFFFFF") === "light" ? "white" : "black"
                                }}>
                                    <Link className="hover:underline line-clamp-none truncate" to={`/topics/${item.slug}`}> # {item.name} </Link>
                                </TableCell>
                                <TableCell className="max-w-[300px] text-stone-500">
                                    <p className="truncate line-clamp-1">{item.description ? item.description : "-"}</p>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant="secondary"
                                        className={`text-white ${item.isActive ? 'bg-green-600' : 'bg-red-600'}`}
                                    >
                                        {
                                            item.isActive ? <BadgeCheckIcon className="inline-block mr-1" /> : <CircleX className="inline-block mr-1" />
                                        }
                                        {
                                            item.isActive ? t("allTopics.table.active") : t("allTopics.table.inactive")
                                        }

                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center w-[100px]">
                                    <Badge
                                        className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
                                        variant="outline"
                                    >
                                        {item.lessonCount ?? 0}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Tooltip>
                                        <TooltipTrigger>

                                            <div className="text-xs text-stone-400 flex flex-col">
                                                <span>{t("allTopics.table.created", { date: new Date(item.createdAt).toLocaleDateString() })}</span>
                                                <span>{t("allTopics.table.updated", { date: new Date(item.updatedAt).toLocaleDateString() })}</span>
                                            </div>

                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <div className="text-xs text-stone-400 flex flex-col bg-black p-2 rounded-md">
                                                <span>{t("allTopics.table.created", { date: new Date(item.createdAt).toLocaleString() })}</span>
                                                <span>{t("allTopics.table.updated", { date: new Date(item.updatedAt).toLocaleString() })}</span>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TableCell>

                                <TableCell className="text-right">
                                    <Button onClick={() => {
                                        setMode("edit");
                                        setOpen(true);
                                        setTopic(item);
                                    }} size="icon-sm" >
                                        <SettingsIcon className="size-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={7}>{t("allTopics.table.total", { count: topics.data.length })}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
            <TopicDialog open={open} mode={mode} topic={topic} onClose={() => setOpen(false)} />
        </div>
    )
}

export default AllTopic