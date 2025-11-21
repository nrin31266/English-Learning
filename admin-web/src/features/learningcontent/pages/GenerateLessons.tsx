
import * as React from "react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useAppDispatch, useAppSelector } from "@/store"
import { fetchTopicOptions } from "@/store/learningcontent/topicReducer"
import type { TFunction } from "i18next"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cefrLevelOptions, lessonTypeOptions, sourceLanguageOptions, sourceTypeOptions } from "@/types"
import { Skeleton } from "@/components/ui/skeleton"
import SkeletonComponent from "@/components/SkeletonComponent"

const mockTopics = [
    { value: "travel-stories", label: "Travel Stories" },
    { value: "business-emails", label: "Business Emails" },
    { value: "daily-conversations", label: "Daily Conversations" },
]




const createLessonSchema = (t: TFunction) =>
    z
        .object({
            topicSlug: z.string().min(1, t("generateLessons.validation.topic", { defaultValue: "Topic is required" })),
            title: z
                .string()
                .trim()
                .min(1, t("generateLessons.validation.title", { defaultValue: "Title is required" })),
            lessonType: z.enum(lessonTypeOptions),
            description: z.string().optional(),
            languageLevel: z.enum(cefrLevelOptions),
            sourceType: z.enum(sourceTypeOptions),
            sourceLanguage: z.enum(sourceLanguageOptions),
            sourceUrl: z
                .string()
                .trim()
                .url(t("generateLessons.validation.sourceUrl", { defaultValue: "Enter a valid source URL" })),
            thumbnailUrl: z
                .union([
                    z.literal(""),
                    z
                        .string()
                        .trim()
                        .url(t("generateLessons.validation.thumbnailUrl", { defaultValue: "Enter a valid thumbnail URL" })),
                ])
                .optional(),
            enableDictation: z.boolean(),
            enableShadowing: z.boolean(),
        })
        .superRefine((values, ctx) => {
            if (values.sourceType !== "YOUTUBE" && (!values.thumbnailUrl || values.thumbnailUrl === "")) {
                ctx.addIssue({
                    code: "custom",
                    message: t("generateLessons.validation.thumbnailRequired", { defaultValue: "Thumbnail URL is required" }),
                    path: ["thumbnailUrl"],
                })
            }
        })

type LessonFormValues = z.infer<ReturnType<typeof createLessonSchema>>
const GenerateLessons = () => {
    const { t } = useTranslation()
    const schema = React.useMemo(() => createLessonSchema(t), [t])
    const { data, status } = useAppSelector((state) => state.learningContent.topics.topicOptions);
    const dispatch = useAppDispatch();
    const [hydrating, setHydrating] = React.useState(true);
    React.useEffect(() => {
        const id = setTimeout(() => setHydrating(false), 10); // 10–120ms
        return () => clearTimeout(id);
    }, []);

    React.useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchTopicOptions());
        }
    }, [dispatch]);


    const defaultValues = React.useMemo<LessonFormValues>(() => ({
        topicSlug: "",
        title: "",
        lessonType: "AI_ASSISTED",
        description: "",
        languageLevel: "A1",
        sourceType: "YOUTUBE",
        sourceLanguage: "en-UK",
        sourceUrl: "",
        thumbnailUrl: "",
        enableDictation: true,
        enableShadowing: true,
    }), []);


    const form = useForm<LessonFormValues>({
        resolver: zodResolver(schema),
        defaultValues,
    });

    const watchedSourceType = form.watch("sourceType")

    React.useEffect(() => {
        if (watchedSourceType === "YOUTUBE" && form.getValues("thumbnailUrl")) {
            form.setValue("thumbnailUrl", "")
        }
    }, [watchedSourceType])

    const topicOptions = React.useMemo(() => {
        if (data.length) {
            return data.map((item) => ({ label: item.name, value: item.slug }))
        }
        return mockTopics
    }, [data])

    const formatEnumLabel = React.useCallback(
        (scope: "lessonType" | "languageLevel" | "sourceType" | "sourceLanguage", value: string) =>
            t(`generateLessons.enums.${scope}.${value}`, {
                defaultValue: value.replace(/_/g, " "),
            }),
        [t]
    )

      // ---------- Placeholder ----------
  const sourceUrlPlaceholder =  watchedSourceType === "YOUTUBE"
    ? t("generateLessons.placeholders.youtubeSourceUrl")
    : t("generateLessons.placeholders.genericSourceUrl")


    function onSubmit(values: LessonFormValues) {
        const normalizedPayload = {
            ...values,
            description: values.description?.trim() || undefined,
            thumbnailUrl: values.sourceType === "YOUTUBE" ? undefined : values.thumbnailUrl?.trim(),
        }
        console.log("Prepared lesson payload", normalizedPayload)
        form.reset(defaultValues)
    }
    if (hydrating) {
        return <SkeletonComponent/>
    }
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 h-6">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbPage>{t("appMenu.learningContent")}</BreadcrumbPage>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{t("appMenu.generateLessons")}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("generateLessons.form.title")}</CardTitle>
                    <CardDescription>
                        {t("generateLessons.form.description")}
                    </CardDescription>
                </CardHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                        <CardContent className="space-y-8">
                            <section className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-base font-semibold">{t("generateLessons.sections.topicBasics.title")}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {t("generateLessons.sections.topicBasics.subtitle")}
                                        </p>
                                    </div>
                                    <Badge variant="secondary">{t("generateLessons.form.requiredBadge")}</Badge>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="topicSlug"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("generateLessons.fields.topic")}</FormLabel>
                                                <FormControl>
                                                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                                                        <SelectTrigger ref={field.ref}>
                                                            <SelectValue placeholder={t("generateLessons.placeholders.topic")}
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {topicOptions.map((topic) => (
                                                                <SelectItem key={topic.value} value={topic.value}>
                                                                    {topic.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("generateLessons.fields.title")}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={t("generateLessons.placeholders.title")}
                                                        {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="lessonType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("generateLessons.fields.lessonType")}</FormLabel>
                                                <FormControl>
                                                    <Select value={field.value} onValueChange={field.onChange}>
                                                        <SelectTrigger ref={field.ref}>
                                                            <SelectValue placeholder={t("generateLessons.placeholders.lessonType")}
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {lessonTypeOptions.map((option) => (
                                                                <SelectItem key={option} value={option}>
                                                                    {formatEnumLabel("lessonType", option)}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="languageLevel"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("generateLessons.fields.languageLevel")}</FormLabel>
                                                <FormControl>
                                                    <Select value={field.value} onValueChange={field.onChange}>
                                                        <SelectTrigger ref={field.ref}>
                                                            <SelectValue placeholder={t("generateLessons.placeholders.languageLevel")}
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {cefrLevelOptions.map((option) => (
                                                                <SelectItem key={option} value={option}>
                                                                    {formatEnumLabel("languageLevel", option)}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem className="md:col-span-2">
                                                <div className="flex items-center justify-between">
                                                    <FormLabel>{t("generateLessons.fields.description")}</FormLabel>
                                                    <span className="text-xs text-muted-foreground">
                                                        {t("generateLessons.form.optionalHint")}
                                                    </span>
                                                </div>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder={t("generateLessons.placeholders.description")}
                                                        rows={4}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </section>

                            <Separator />

                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-base font-semibold">{t("generateLessons.sections.source.title")}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t("generateLessons.sections.source.subtitle")}
                                    </p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="sourceType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("generateLessons.fields.sourceType")}</FormLabel>
                                                <FormControl>
                                                    <Select value={field.value} onValueChange={field.onChange}>
                                                        <SelectTrigger ref={field.ref}>
                                                            <SelectValue placeholder={t("generateLessons.placeholders.sourceType")} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {sourceTypeOptions.map((option) => (
                                                                <SelectItem key={option} value={option}>
                                                                    {formatEnumLabel("sourceType", option)}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="sourceLanguage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("generateLessons.fields.sourceLanguage")}</FormLabel>
                                                <FormControl>
                                                    <Select value={field.value} onValueChange={field.onChange}>
                                                        <SelectTrigger ref={field.ref}>
                                                            <SelectValue placeholder={t("generateLessons.placeholders.sourceLanguage")} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {sourceLanguageOptions.map((option) => (
                                                                <SelectItem key={option} value={option}>
                                                                    {formatEnumLabel("sourceLanguage", option)}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="sourceUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("generateLessons.fields.sourceUrl")}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={sourceUrlPlaceholder} {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {watchedSourceType !== "YOUTUBE" && (
                                        <FormField
                                            control={form.control}
                                            name="thumbnailUrl"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("generateLessons.fields.thumbnailUrl")}</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder={t("generateLessons.placeholders.thumbnail")}
                                                            {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            </section>



                            <Separator />

                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-base font-semibold">{t("generateLessons.sections.features.title")}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t("generateLessons.sections.features.subtitle")}
                                    </p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="enableDictation"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-start gap-3 rounded-md border p-3">
                                                    <FormControl>
                                                        <Checkbox
                                                            id="enableDictation"
                                                            checked={field.value}
                                                            onCheckedChange={(checked) => field.onChange(!!checked)}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1">
                                                        <Label htmlFor="enableDictation">{t("generateLessons.fields.enableDictation")}</Label>
                                                        <p className="text-xs text-muted-foreground">
                                                            {t("generateLessons.helperTexts.enableDictation")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="enableShadowing"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-start gap-3 rounded-md border p-3">
                                                    <FormControl>
                                                        <Checkbox
                                                            id="enableShadowing"
                                                            checked={field.value}
                                                            onCheckedChange={(checked) => field.onChange(!!checked)}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1">
                                                        <Label htmlFor="enableShadowing">{t("generateLessons.fields.enableShadowing")}</Label>
                                                        <p className="text-xs text-muted-foreground">
                                                            {t("generateLessons.helperTexts.enableShadowing")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </section>
                        </CardContent>
                        <CardFooter className="flex flex-wrap justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => form.reset(defaultValues)}>
                                {t("generateLessons.actions.reset")}
                            </Button>
                            <Button type="submit">
                                {t("generateLessons.actions.submit")}
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    )
}

export default GenerateLessons