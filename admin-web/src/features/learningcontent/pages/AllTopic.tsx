import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import {SquarePlus} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from 'react-i18next'
import { TopicDialog } from "../components/TopicDialog"
import { useState } from "react"
const AllTopic = () => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<'add' | 'edit'>('add');
    const [topic, setTopic] = useState<any>(null);
    return (
        <div>
            <div className="flex justify-between items-center">
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
                    <Button onClick={()=>{
                        setMode("add");
                        setOpen(true);
                        // setTopic(undefined);
                    }} variant={"outline"} className="h-6 text-xs">
                        <SquarePlus/>
                        Add Topic</Button>
                </div>
            </div>
            <TopicDialog open={open} mode={mode} topic={topic} onClose={() => setOpen(false)} />
        </div>
    )
}

export default AllTopic