import { useMemo, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import type { ILessonDetailsDto, IEditLessonPayload } from "@/types"
import { cefrLevelOptions, sourceLanguageOptions } from "@/types"

import { useAppDispatch, useAppSelector } from "@/store"
import { updateLesson, deleteLesson } from "@/store/learningcontent/lessonDetailsSlide"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Dialog,
  DialogContent,
  DialogFooter as DialogFooterBase,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Info, Loader2, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { showNotification } from "@/store/system/notificationSlice"

// ───────────────────────────────────────────
// Schema
// ───────────────────────────────────────────

const createEditLessonSchema = (t: TFunction, sourceType: string) =>
  z
    .object({
      title: z
        .string()
        .trim()
        .min(
          1,
          t("lessonSettings.validation.titleRequired", {
            defaultValue: "Title is required",
          })
        ),
      description: z.string().optional(),
      languageLevel: z.enum(cefrLevelOptions),
      sourceLanguage: z.enum(sourceLanguageOptions),
      thumbnailUrl: z
        .union([
          z.literal(""),
          z
            .string()
            .trim()
            .url(
              t("lessonSettings.validation.thumbnailUrl", {
                defaultValue: "Enter a valid thumbnail URL",
              })
            ),
        ])
        .optional(),
      enableDictation: z.boolean(),
      enableShadowing: z.boolean(),
    })
    .superRefine((values, ctx) => {
      // Nếu không phải YouTube thì bắt buộc phải có thumbnail
      if (sourceType !== "YOUTUBE" && (!values.thumbnailUrl || values.thumbnailUrl === "")) {
        ctx.addIssue({
          code: "custom",
          message: t("lessonSettings.validation.thumbnailRequired", {
            defaultValue: "Thumbnail URL is required for non-YouTube sources",
          }),
          path: ["thumbnailUrl"],
        })
      }
    })

type LessonSettingsFormValues = z.infer<ReturnType<typeof createEditLessonSchema>>

// ───────────────────────────────────────────
// Component
// ───────────────────────────────────────────

const LessonSitting = ({ lesson }: { lesson: ILessonDetailsDto }) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { status: mutationStatus, type: mutationType } = useAppSelector(
    (state) => state.learningContent.lessonDetails.lessonDetailsMutation
  )

  const schema = useMemo(() => createEditLessonSchema(t, lesson.sourceType), [t, lesson.sourceType])

  const defaultValues = useMemo<LessonSettingsFormValues>(
    () => ({
      title: lesson.title,
      description: lesson.description || "",
      languageLevel: lesson.languageLevel,
      sourceLanguage: (lesson.sourceLanguage as (typeof sourceLanguageOptions)[number]) || "en-UK",
      thumbnailUrl: lesson.thumbnailUrl || "",
      enableDictation: lesson.enableDictation,
      enableShadowing: lesson.enableShadowing,
    }),
    [lesson]
  )

  const form = useForm<LessonSettingsFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const formatEnumLabel = useCallback(
    (scope: "languageLevel" | "sourceLanguage", value: string) =>
      t(`lessonSettings.enums.${scope}.${value}`, {
        defaultValue: value.replace(/_/g, " "),
      }),
    [t]
  )

  const isUpdating = mutationStatus === "loading" && mutationType === "update"
  const isDeleting = mutationStatus === "loading" && mutationType === "delete"
  const isProcessing = lesson.status === "PROCESSING"

  // ───────────────────────────────────────────
  // Submit update
  // ───────────────────────────────────────────
  const onSubmit = (values: LessonSettingsFormValues) => {
    const payload: IEditLessonPayload = {
      title: values.title.trim(),
      description: values.description?.trim() || null,
      languageLevel: values.languageLevel,
      sourceLanguage: values.sourceLanguage,
      thumbnailUrl: values.thumbnailUrl?.trim() || null,
      enableDictation: values.enableDictation,
      enableShadowing: values.enableShadowing,
    }

    dispatch(updateLesson({ id: lesson.id, data: payload })).unwrap().then(() => {
      dispatch(showNotification({
        title: t("lessonSettings.notifications.updateSuccess.title", {
          defaultValue: "Lesson updated",
        }),
        message: t("lessonSettings.notifications.updateSuccess.message", {
          defaultValue: "The lesson settings have been successfully updated.",
        }),
        variant: "success",
      }))
    }).catch(() => {
      dispatch(showNotification({
        title: t("lessonSettings.notifications.updateError.title", {
          defaultValue: "Update failed",
        }),
        message: t("lessonSettings.notifications.updateError.message", {
          defaultValue: "There was an error updating the lesson. Please try again.",
        }),
        variant: "error",
      }))
    })
  }

  // ───────────────────────────────────────────
  // Delete lesson
  // ───────────────────────────────────────────
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteInput, setDeleteInput] = useState("")
  const navigate = useNavigate()
  const handleDelete = () => {
    if (deleteInput !== lesson.slug) return
    dispatch(deleteLesson({ id: lesson.id }))
    setDeleteDialogOpen(false)
    navigate("/all-lessons")
  }

  const resetForm = () => {
    form.reset(defaultValues)
  }

  return (
    <div className="space-y-6">
      {/* MAIN SETTINGS CARD */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            {t("lessonSettings.title", { defaultValue: "Lesson settings" })}
            <Badge variant="outline" className="text-[10px]">
              {t("lessonSettings.badge", { defaultValue: "Editable fields only" })}
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            {t("lessonSettings.description", {
              defaultValue:
                "Update learner-facing information and feature toggles. System fields are managed automatically.",
            })}
          </CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-8">
              {/* BASIC INFO */}
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">
                      {t("lessonSettings.sections.basic.title", {
                        defaultValue: "Basic information",
                      })}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t("lessonSettings.sections.basic.subtitle", {
                        defaultValue: "Shown to learners on the lesson page.",
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* TITLE */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("lessonSettings.fields.title", { defaultValue: "Title" })}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("lessonSettings.placeholders.title", {
                              defaultValue: "Enter lesson title",
                            })}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* LANGUAGE LEVEL */}
                  <FormField
                    control={form.control}
                    name="languageLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("lessonSettings.fields.languageLevel", {
                            defaultValue: "Language level (CEFR)",
                          })}
                        </FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger ref={field.ref}>
                              <SelectValue
                                placeholder={t("lessonSettings.placeholders.languageLevel", {
                                  defaultValue: "Select level",
                                })}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {cefrLevelOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {formatEnumLabel("languageLevel", opt)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* DESCRIPTION */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <div className="flex items-center justify-between">
                          <FormLabel>
                            {t("lessonSettings.fields.description", {
                              defaultValue: "Description",
                            })}
                          </FormLabel>
                          <span className="text-[10px] text-muted-foreground">
                            {t("lessonSettings.optional", { defaultValue: "Optional" })}
                          </span>
                        </div>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder={t("lessonSettings.placeholders.description", {
                              defaultValue: "Short summary learners will see...",
                            })}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* THUMBNAIL URL */}
                  <FormField
                    control={form.control}
                    name="thumbnailUrl"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>
                          {t("lessonSettings.fields.thumbnailUrl", {
                            defaultValue: "Thumbnail URL",
                          })}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("lessonSettings.placeholders.thumbnail", {
                              defaultValue: "https://...",
                            })}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          {lesson.sourceType === "YOUTUBE"
                            ? t("lessonSettings.helperTexts.youtubeThumbnail", {
                                defaultValue:
                                  "For YouTube sources, the system may auto-generate a thumbnail.",
                              })
                            : t("lessonSettings.helperTexts.thumbnailRequired", {
                                defaultValue:
                                  "For non-YouTube sources, a thumbnail URL is required.",
                              })}
                        </p>
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              <Separator />

              {/* LANGUAGE & FEATURES */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">
                    {t("lessonSettings.sections.features.title", {
                      defaultValue: "Language & features",
                    })}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t("lessonSettings.sections.features.subtitle", {
                      defaultValue: "Control language metadata and which practice modes are available.",
                    })}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* SOURCE LANGUAGE */}
                  <FormField
                    control={form.control}
                    name="sourceLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("lessonSettings.fields.sourceLanguage", {
                            defaultValue: "Source language",
                          })}
                        </FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger ref={field.ref}>
                              <SelectValue
                                placeholder={t("lessonSettings.placeholders.sourceLanguage", {
                                  defaultValue: "Select source language",
                                })}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {sourceLanguageOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {formatEnumLabel("sourceLanguage", opt)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* EMPTY CELL JUST TO BALANCE GRID, OR FUTURE FIELD */}
                  <div className="hidden md:block" />

                  {/* ENABLE DICTATION */}
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
                            <Label htmlFor="enableDictation" className="text-xs font-medium">
                              {t("lessonSettings.fields.enableDictation", {
                                defaultValue: "Enable dictation mode",
                              })}
                            </Label>
                            <p className="text-[11px] text-muted-foreground">
                              {t("lessonSettings.helperTexts.enableDictation", {
                                defaultValue:
                                  "Learners can type what they hear and check spelling & punctuation.",
                              })}
                            </p>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* ENABLE SHADOWING */}
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
                            <Label htmlFor="enableShadowing" className="text-xs font-medium">
                              {t("lessonSettings.fields.enableShadowing", {
                                defaultValue: "Enable shadowing mode",
                              })}
                            </Label>
                            <p className="text-[11px] text-muted-foreground">
                              {t("lessonSettings.helperTexts.enableShadowing", {
                                defaultValue:
                                  "Learners can repeat sentences out loud and practice pronunciation.",
                              })}
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

            <CardFooter className="flex flex-wrap justify-end gap-3 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetForm}
                disabled={isUpdating || isDeleting}
              >
                {t("lessonSettings.actions.reset", { defaultValue: "Reset changes" })}
              </Button>
              <Button type="submit" size="sm" disabled={isUpdating || isDeleting || isProcessing}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("lessonSettings.actions.save", { defaultValue: "Save settings" })}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {/* DANGER ZONE */}
      <Card className="border-red-300/70 bg-red-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {t("lessonSettings.danger.title", { defaultValue: "Danger zone" })}
          </CardTitle>
          <CardDescription className="text-xs text-red-700/80">
            {t("lessonSettings.danger.description", {
              defaultValue: "Deleting a lesson is permanent and cannot be undone.",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-[11px]">
          <p className="text-muted-foreground">
            {t("lessonSettings.danger.slugHint", {
              defaultValue: "To confirm deletion, you must type the lesson slug exactly:",
            })}{" "}
            <span className="font-mono font-semibold text-red-700">{lesson.slug}</span>
          </p>
        </CardContent>
        <CardFooter>
          <Dialog
            open={deleteDialogOpen}
            onOpenChange={(open) => {
              setDeleteDialogOpen(open)
              if (!open) setDeleteInput("")
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting || isProcessing}
                className="ml-auto"
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {t("lessonSettings.danger.deleteButton", { defaultValue: "Delete lesson" })}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {t("lessonSettings.danger.dialogTitle", {
                    defaultValue: "Confirm lesson deletion",
                  })}
                </DialogTitle>
              </DialogHeader>

              <Alert variant="destructive" className="mb-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-sm">
                  {t("lessonSettings.danger.warningTitle", {
                    defaultValue: "This action cannot be undone",
                  })}
                </AlertTitle>
                <AlertDescription className="text-xs">
                  {t("lessonSettings.danger.warningBody", {
                    defaultValue:
                      "All sentences, words and learner data linked to this lesson will be removed.",
                  })}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label className="text-xs">
                  {t("lessonSettings.danger.confirmLabel", {
                    defaultValue: "Type the lesson slug to confirm",
                  })}
                </Label>
                <Input
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder={lesson.slug}
                  className="text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  {t("lessonSettings.danger.confirmHint", {
                    defaultValue: "Deletion is only enabled when the slug matches exactly.",
                  })}
                </p>
              </div>

              <DialogFooterBase className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  {t("common.cancel", { defaultValue: "Cancel" })}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteInput !== lesson.slug || isDeleting}
                >
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {t("lessonSettings.danger.confirmDelete", {
                    defaultValue: "Delete permanently",
                  })}
                </Button>
              </DialogFooterBase>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  )
}

export default LessonSitting
