
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from "@/components/ui/textarea"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { TOPIC_COLOR_LIST } from "@/types/colorMap"
import { getRandomTopicColor, getTextColorForHex } from "@/utils/colorUtils"
import type { TFunction } from "i18next"
import { useAppDispatch, useAppSelector } from "@/store"
import { Spinner2 } from "@/components/ui/spinner2"
import { addTopic, deleteTopic, editTopic } from "@/store/learningcontent/topicReducer"
import type { ITopicDto } from "@/types"
import { useEffect } from "react"
export const createTopicSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(1, t("topicDialog.nameRequired")),
    description: z.string().optional(),
    isActive: z.boolean(),
    color: z.string().optional(),
  });

interface Props {
    onClose?: () => void;
    open?: boolean;
    mode?: 'add' | 'edit';
    topic: ITopicDto | null;
}
export function TopicDialog({ onClose, open, mode = 'add', topic }: Props) {
    const { t } = useTranslation();
    // const [highlightedColor, setHighlightedColor] = useState<string | null>(null);
    const form = useForm<z.infer<ReturnType<typeof createTopicSchema>>>({
        resolver: zodResolver(createTopicSchema(t)),
        defaultValues: {
            name: topic?.name ?? "",
            description: topic?.description ?? "",
            isActive: topic?.isActive ?? false,
            color: topic?.color ?? getRandomTopicColor(),
        },
    });

    useEffect(() => {
        form.reset({
            name: topic?.name ?? "",
            description: topic?.description ?? "",
            isActive: topic?.isActive ?? false,
            color: topic?.color ?? getRandomTopicColor(),
        });
    }, [topic]);
    const dispatch = useAppDispatch();
    const {type, status, error } = useAppSelector((state) => state.learningContent.topics.topicMutation);
    function onSubmit(values: z.infer<ReturnType<typeof createTopicSchema>>) {
        console.log("Form values:", values);
        const fd = new FormData();
        for (let key in values) fd.append(key, (values as any)[key]);
        if(mode === 'add') {
            dispatch(addTopic(fd)).unwrap().then(() => {
                onClose && onClose();
                form.reset();
            });
        }else if(mode === 'edit' && topic) {
            dispatch(editTopic({ slug: topic.slug, data: fd })).unwrap().then(() => {
                onClose && onClose();
                form.reset();
            });
        }
    }

    function handleDelete() {
        // Xử lý xóa topic ở đây
        if(topic) {
            dispatch(deleteTopic(topic.slug)).unwrap().then(() => {
                onClose && onClose();
                form.reset();
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-[425px] [&>button]:hidden">
                <DialogHeader>
                    <DialogTitle>{mode === 'add' ? t("topicDialog.addTitle") : t("topicDialog.editTitle")}</DialogTitle>
                    <DialogDescription>
                        {/* Make changes to your profile here. Click save when you&apos;re
              done. */}
                        {
                            mode === 'add' ? t("topicDialog.addDescription") : t("topicDialog.editDescription")
                        }
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        {/* name */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("topicDialog.nameLabel")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("topicDialog.namePlaceholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />


                        {/* description */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("topicDialog.descriptionLabel")}</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder={t("topicDialog.descriptionPlaceholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* color */}
                        <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("topicDialog.colorLabel")}</FormLabel>

                                    <div className="grid grid-cols-5 gap-2 mt-2">
                                        {TOPIC_COLOR_LIST.map((hex) => {
                                            const isSelected = field.value === hex;
                                            const textColor = getTextColorForHex(hex) === "light" ? "text-white" : "text-black";

                                            return (
                                                <button
                                                    key={hex}
                                                    type="button"
                                                    onClick={() => field.onChange(hex)}
                                                    className={`
                                        h-8 w-8 rounded-md transition
                                        ${isSelected ? "ring-2 ring-black scale-110" : "ring-1 ring-gray-300"}
                                    `}
                                                    style={{ backgroundColor: hex }}
                                                >
                                                    {/* optional: dấu check */}
                                                    {isSelected && (
                                                        <span className={`block text-center text-xs font-bold ${textColor}`}>
                                                            Aa
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <FormMessage />
                                </FormItem>
                            )}
                        />


                        {/* isActive */}
                        <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormLabel>{t("topicDialog.isActiveLabel")}</FormLabel>
                                </FormItem>
                            )}
                            
                        />

                        {/* Error */}
                        {error && (
                            <div className="text-destructive text-sm mb-2">
                                {error.message}
                            </div>
                        )}

                        <DialogFooter>
                            
                            {
                                mode === 'edit' && (<Button onClick={handleDelete}  type="button" variant="destructive" className="mr-auto" disabled={status === "loading"}>
                                    {status === "loading" && type === "delete" && <Spinner2 />}
                                    {t("topicDialog.deleteButton")}
                                </Button>
                                )
                            }
                            <Button type="button" variant="outline" disabled={status === "loading"} onClick={onClose}>
                                {t("topicDialog.cancelButton")}
                            </Button>
                            <Button type="submit" disabled={status === "loading"} >
                                {status === "loading" && type !== "delete" && <Spinner2  />}
                                {mode === "add" ? t("topicDialog.addButton") : t("topicDialog.editButton")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
            {/* </form> */}
        </Dialog>
    )
}

