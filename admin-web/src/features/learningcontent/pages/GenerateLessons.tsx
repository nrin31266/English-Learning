import * as React from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAppDispatch, useAppSelector } from "@/store";
import { fetchTopicOptions } from "@/store/learningcontent/topicSlide";
import type { TFunction } from "i18next";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  sourceLicenseTypeOptions,
  sourceTypeOptions,
  type ILessonDto,
} from "@/types";
import SkeletonComponent from "@/components/SkeletonComponent";
import { useNavigate } from "react-router-dom";
import handleAPI from "@/apis/handleAPI";
import { Spinner2 } from "@/components/ui/spinner2";
import { FileAudio, Upload, Youtube } from "lucide-react";
import axios from "axios";

const mockTopics = [
  { value: "travel-stories", label: "Travel Stories" },
  { value: "business-emails", label: "Business Emails" },
  { value: "daily-conversations", label: "Daily Conversations" },
];

const sourceTypeDescriptions: Record<string, string> = {
  YOUTUBE:
    "Paste a public YouTube link. Processing success only means the system can access it.",
  AUDIO_FILE:
    "Upload a file from your computer. Use this for owned or permitted content.",
  TEXT: "Create a lesson from text content instead of audio/video.",
};

const licenseDescriptions: Record<string, string> = {
  STANDARD_YOUTUBE:
    "Standard YouTube source. Good for reference/embed, not owned content.",
  CREATIVE_COMMONS: "Reusable content with a Creative Commons license.",
  OWNED_CONTENT: "Created by your team, teacher, or admin.",
  PERMISSION_GRANTED: "Third-party content with explicit permission.",
  UNKNOWN: "Not verified yet. Keep as draft/internal testing.",
};

const createLessonSchema = (t: TFunction) =>
  z
    .object({
      topicSlug: z
        .string()
        .min(
          1,
          t("generateLessons.validation.topic", {
            defaultValue: "Topic is required",
          }),
        ),
      title: z.string().trim().optional(),
      sourceType: z.enum(sourceTypeOptions),
      sourceLicenseType: z.enum(sourceLicenseTypeOptions),
      sourceUrl: z.string().trim().optional(),
      thumbnailUrl: z
        .union([
          z.literal(""),
          z
            .string()
            .trim()
            .url(
              t("generateLessons.validation.thumbnailUrl", {
                defaultValue: "Enter a valid thumbnail URL",
              }),
            ),
        ])
        .optional(),
      enableDictation: z.boolean(),
      enableShadowing: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (values.sourceType !== "YOUTUBE") return;

      if (!values.sourceUrl?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: t("generateLessons.validation.sourceUrl", {
            defaultValue: "Enter a valid YouTube URL",
          }),
          path: ["sourceUrl"],
        });
        return;
      }

      const parsed = z.string().url().safeParse(values.sourceUrl);
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          message: t("generateLessons.validation.sourceUrl", {
            defaultValue: "Enter a valid YouTube URL",
          }),
          path: ["sourceUrl"],
        });
      }
    });

type LessonFormValues = z.infer<ReturnType<typeof createLessonSchema>>;

const FieldHelp = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs leading-5 text-muted-foreground">{children}</p>
);

const SectionHeading = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="space-y-1">
    <h3 className="text-sm font-semibold tracking-tight text-foreground">
      {title}
    </h3>
    <p className="text-sm leading-6 text-muted-foreground">{description}</p>
  </div>
);

const GenerateLessons = () => {
  const { t } = useTranslation();
  const schema = React.useMemo(() => createLessonSchema(t), [t]);
  const { data, status } = useAppSelector(
    (state) => state.learningContent.topics.topicOptions,
  );
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [loading, setLoading] = React.useState(false);
  const [hydrating, setHydrating] = React.useState(true);
  const [audioFile, setAudioFile] = React.useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    const id = setTimeout(() => setHydrating(false), 50);
    return () => clearTimeout(id);
  }, []);

  React.useEffect(() => {
    if (status === "idle") {
      dispatch(fetchTopicOptions());
    }
  }, [dispatch, status]);

  const defaultValues = React.useMemo<LessonFormValues>(
    () => ({
      topicSlug: "",
      title: "",
      sourceType: "YOUTUBE",
      sourceLicenseType: "STANDARD_YOUTUBE",
      sourceUrl: "",
      thumbnailUrl: "",
      enableDictation: true,
      enableShadowing: true,
    }),
    [],
  );

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const watchedSourceType = form.watch("sourceType");
  const watchedLicenseType = form.watch("sourceLicenseType");

  React.useEffect(() => {
    if (watchedSourceType === "YOUTUBE") {
      setAudioFile(null);
      setThumbnailFile(null);
      form.setValue("title", "");
      form.setValue("thumbnailUrl", "");
      form.setValue("sourceLicenseType", "STANDARD_YOUTUBE");
      return;
    }

    form.setValue("sourceUrl", "");
    form.setValue("sourceLicenseType", "OWNED_CONTENT");
  }, [watchedSourceType, form]);

  const topicOptions = React.useMemo(() => {
    if (data.length) {
      return data.map((item) => ({ label: item.name, value: item.slug }));
    }
    return mockTopics;
  }, [data]);

  const formatEnumLabel = React.useCallback(
    (scope: "sourceType" | "sourceLicenseType", value: string) =>
      t(`generateLessons.enums.${scope}.${value}`, {
        defaultValue: value
          .toLowerCase()
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
      }),
    [t],
  );

  const sourceUrlPlaceholder =
    watchedSourceType === "YOUTUBE"
      ? t("generateLessons.placeholders.youtubeSourceUrl", {
          defaultValue: "https://www.youtube.com/watch?v=...",
        })
      : t("generateLessons.placeholders.audioFile", {
          defaultValue: "Choose an audio or video file from your computer",
        });

  const sourceTypeDescription =
    sourceTypeDescriptions[watchedSourceType] ??
    "Choose where the lesson content comes from.";
  const licenseDescription =
    licenseDescriptions[watchedLicenseType] ??
    "Select the license status for this source.";

  async function uploadLessonMedia(
    file: File,
    kind: "lesson-audio" | "lesson-thumbnail",
  ) {
    const baseUrl =
      import.meta.env.VITE_LANGUAGE_PROCESSING_URL || "http://localhost:8089";
    const body = new FormData();
    body.append("file", file);

    const response = await axios.post<{ url: string }>(
      `${baseUrl}/internal/upload/${kind}`,
      body,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      },
    );

    return response.data.url;
  }

  async function onSubmit(values: LessonFormValues) {
    setLoading(true);
    try {
      let sourceUrl = values.sourceUrl?.trim() || "";
      let thumbnailUrl = values.thumbnailUrl?.trim() || undefined;

      if (values.sourceType === "AUDIO_FILE") {
        if (!audioFile) {
          form.setError("sourceUrl", {
            message: t("generateLessons.validation.audioRequired", {
              defaultValue: "Audio or video file is required",
            }),
          });
          return;
        }

        sourceUrl = await uploadLessonMedia(audioFile, "lesson-audio");

        if (thumbnailFile) {
          thumbnailUrl = await uploadLessonMedia(
            thumbnailFile,
            "lesson-thumbnail",
          );
          form.setValue("thumbnailUrl", thumbnailUrl);
        }
      }

      const normalizedPayload = {
        topicSlug: values.topicSlug,
        title:
          values.sourceType === "AUDIO_FILE"
            ? values.title?.trim() || undefined
            : undefined,
        sourceType: values.sourceType,
        sourceUrl,
        thumbnailUrl:
          values.sourceType === "YOUTUBE" ? undefined : thumbnailUrl,
        sourceLicenseType: values.sourceLicenseType,
        enableDictation: values.enableDictation,
        enableShadowing: values.enableShadowing,
      };

      const data = await handleAPI<ILessonDto>({
        endpoint: "/learning-contents/admin/lessons",
        method: "POST",
        isAuth: true,
        body: normalizedPayload,
      });

      navigate(`/lessons/${data.id}/${data.slug}`);
      form.reset(defaultValues);
      setAudioFile(null);
      setThumbnailFile(null);
    } catch (error) {
      console.error("Failed to create lesson", error);
    } finally {
      setLoading(false);
    }
  }

  if (hydrating) {
    return <SkeletonComponent />;
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex h-6 shrink-0 items-center">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>
                {t("appMenu.learningContent", {
                  defaultValue: "Learning Content",
                })}
              </BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {t("appMenu.generateLessons", {
                  defaultValue: "Generate Lessons",
                })}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="min-h-0 flex-1">
          <Card className="flex min-h-full flex-col overflow-hidden border shadow-sm">
            <CardHeader className="border-b bg-muted/20 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <CardTitle className="text-lg font-semibold tracking-tight">
                    {t("generateLessons.form.title", {
                      defaultValue: "Create AI Lesson",
                    })}
                  </CardTitle>
                  <CardDescription className="max-w-3xl text-sm leading-6">
                    {t("generateLessons.form.description", {
                      defaultValue:
                        "Create a lesson from a YouTube link or an uploaded media file.",
                    })}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  {t("generateLessons.form.requiredBadge", {
                    defaultValue: "Admin",
                  })}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-7 px-6 py-6">
              <section className="space-y-5">
                <SectionHeading
                  title={t("generateLessons.sections.source.title", {
                    defaultValue: "Source setup",
                  })}
                  description={t("generateLessons.sections.source.subtitle", {
                    defaultValue:
                      "Choose the topic, source, and license status before processing.",
                  })}
                />

                <div className="grid gap-5 lg:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="topicSlug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("generateLessons.fields.topic", {
                            defaultValue: "Topic",
                          })}
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value || undefined}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger ref={field.ref} className="h-10">
                              <SelectValue
                                placeholder={t(
                                  "generateLessons.placeholders.topic",
                                  { defaultValue: "Select a topic" },
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {topicOptions.map((topic) => (
                                <SelectItem
                                  key={topic.value}
                                  value={topic.value}
                                >
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
                    name="sourceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("generateLessons.fields.sourceType", {
                            defaultValue: "Source type",
                          })}
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger ref={field.ref} className="h-10">
                              <SelectValue
                                placeholder={t(
                                  "generateLessons.placeholders.sourceType",
                                  { defaultValue: "Select source type" },
                                )}
                              />
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
                        <FieldHelp>{sourceTypeDescription}</FieldHelp>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sourceLicenseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("generateLessons.fields.sourceLicenseType", {
                            defaultValue: "Source license",
                          })}
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger ref={field.ref} className="h-10">
                              <SelectValue
                                placeholder={t(
                                  "generateLessons.placeholders.sourceLicenseType",
                                  { defaultValue: "Select license" },
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {sourceLicenseTypeOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {formatEnumLabel("sourceLicenseType", option)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FieldHelp>{licenseDescription}</FieldHelp>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {watchedSourceType === "YOUTUBE" ? (
                  <Card className="border bg-background shadow-none">
                    <CardContent className="grid gap-5 p-4 lg:grid-cols-[40px_minmax(0,1fr)]">
                      <div className="hidden h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-600 lg:flex">
                        <Youtube className="h-5 w-5" />
                      </div>
                      <FormField
                        control={form.control}
                        name="sourceUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("generateLessons.fields.sourceUrl", {
                                defaultValue: "YouTube URL",
                              })}
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="h-10"
                                placeholder={sourceUrlPlaceholder}
                                {...field}
                              />
                            </FormControl>
                            <FieldHelp>
                              Use a public video link. A successful download
                              does not prove content rights.
                            </FieldHelp>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border bg-background shadow-none">
                    <CardContent className="space-y-5 p-4">
                      <div className="grid gap-5 lg:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between gap-3">
                                <FormLabel>
                                  {t("generateLessons.fields.title", {
                                    defaultValue: "Lesson title",
                                  })}
                                </FormLabel>
                                <span className="text-xs text-muted-foreground">
                                  {t("generateLessons.form.optionalHint", {
                                    defaultValue: "Optional",
                                  })}
                                </span>
                              </div>
                              <FormControl>
                                <Input
                                  className="h-10"
                                  placeholder={t(
                                    "generateLessons.placeholders.audioTitle",
                                    {
                                      defaultValue:
                                        "Leave blank for AI to generate",
                                    },
                                  )}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {watchedSourceType === "AUDIO_FILE" && (
                        <div className="grid gap-5 lg:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="sourceUrl"
                            render={() => (
                              <FormItem>
                                <FormLabel>
                                  {t("generateLessons.fields.audioFile", {
                                    defaultValue: "Audio or video file",
                                  })}
                                </FormLabel>
                                <FormControl>
                                  <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-4 text-center text-sm transition hover:bg-muted/40">
                                    <FileAudio className="h-5 w-5 text-muted-foreground" />
                                    <span className="max-w-full truncate font-medium">
                                      {audioFile?.name || sourceUrlPlaceholder}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      MP3, WAV, M4A, MP4
                                    </span>
                                    <Input
                                      type="file"
                                      accept="audio/*,video/*"
                                      className="hidden"
                                      onChange={(event) =>
                                        setAudioFile(
                                          event.target.files?.[0] ?? null,
                                        )
                                      }
                                    />
                                  </label>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="thumbnailUrl"
                            render={() => (
                              <FormItem>
                                <FormLabel>
                                  {t("generateLessons.fields.thumbnailUrl", {
                                    defaultValue: "Thumbnail",
                                  })}
                                </FormLabel>
                                <FormControl>
                                  <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-4 text-center text-sm transition hover:bg-muted/40">
                                    <Upload className="h-5 w-5 text-muted-foreground" />
                                    <span className="max-w-full truncate font-medium">
                                      {thumbnailFile?.name ||
                                        t(
                                          "generateLessons.placeholders.thumbnailUpload",
                                          {
                                            defaultValue:
                                              "Upload thumbnail image",
                                          },
                                        )}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      Optional
                                    </span>
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(event) =>
                                        setThumbnailFile(
                                          event.target.files?.[0] ?? null,
                                        )
                                      }
                                    />
                                  </label>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </section>

              <Separator />

              <section className="space-y-5">
                <SectionHeading
                  title={t("generateLessons.sections.features.title", {
                    defaultValue: "Learning features",
                  })}
                  description={t("generateLessons.sections.features.subtitle", {
                    defaultValue: "Choose practice modes for this lesson.",
                  })}
                />

                <div className="grid gap-4 lg:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="enableDictation"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex min-h-24 items-start gap-3 rounded-lg border bg-muted/10 p-4">
                          <FormControl>
                            <Checkbox
                              id="enableDictation"
                              checked={field.value}
                              onCheckedChange={(checked) =>
                                field.onChange(!!checked)
                              }
                              className="mt-1"
                            />
                          </FormControl>
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="enableDictation"
                              className="text-sm font-medium"
                            >
                              {t("generateLessons.fields.enableDictation", {
                                defaultValue: "Dictation",
                              })}
                            </Label>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {t(
                                "generateLessons.helperTexts.enableDictation",
                                {
                                  defaultValue:
                                    "Learners listen and type what they hear.",
                                },
                              )}
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
                        <div className="flex min-h-24 items-start gap-3 rounded-lg border bg-muted/10 p-4">
                          <FormControl>
                            <Checkbox
                              id="enableShadowing"
                              checked={field.value}
                              onCheckedChange={(checked) =>
                                field.onChange(!!checked)
                              }
                              className="mt-1"
                            />
                          </FormControl>
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="enableShadowing"
                              className="text-sm font-medium"
                            >
                              {t("generateLessons.fields.enableShadowing", {
                                defaultValue: "Shadowing",
                              })}
                            </Label>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {t(
                                "generateLessons.helperTexts.enableShadowing",
                                {
                                  defaultValue:
                                    "Learners repeat after the audio and get pronunciation feedback.",
                                },
                              )}
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

            <div className="sticky bottom-0 z-20 flex items-center justify-end gap-3 border-t bg-card/95 px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] backdrop-blur">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => {
                  form.reset(defaultValues);
                  setAudioFile(null);
                  setThumbnailFile(null);
                }}
              >
                {t("generateLessons.actions.reset", { defaultValue: "Reset" })}
              </Button>
              <Button disabled={loading} type="submit">
                {loading && <Spinner2 className="mr-2 h-4 w-4" />}
                {t("generateLessons.actions.submit", {
                  defaultValue: "Create lesson",
                })}
              </Button>
            </div>
          </Card>
        </form>
      </Form>
    </div>
  );
};

export default GenerateLessons;