
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"

import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import { DialogClose } from "@radix-ui/react-dialog"
import { Checkbox } from '@/components/ui/checkbox';
export const topicSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    isActive: z.boolean(),
    color: z.string().optional(),
});

interface Props {
    onClose?: () => void;
    open?: boolean;
    mode?: 'add' | 'edit';
    topic: any;
}
export function TopicDialog({ onClose, open, mode = 'add', topic }: Props) {
    const { t } = useTranslation();
    const form = useForm<z.infer<typeof topicSchema>>({
        resolver: zodResolver(topicSchema),
        defaultValues: {
            name: topic?.name ?? "",
            description: topic?.description ?? "",
            isActive: topic?.isActive ?? false,
            color: topic?.color ?? "",
        },
    });
    function onSubmit(values: z.infer<typeof topicSchema>) {
        console.log("Form values:", values);
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            {/* <form> */}
            {/* <DialogTrigger asChild>
          <Button variant={"outline"} className="h-6 text-xs">
                        <SquarePlus/>
                        Add Topic</Button>
        </DialogTrigger> */}
            <DialogContent className="sm:max-w-[425px]">
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
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Topic name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* slug */}
                        {/* <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Slug</FormLabel>
                                    <FormControl>
                                        <Input placeholder="topic-slug" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        /> */}

                        {/* description */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Short description..." {...field} />
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
                                    <FormLabel>Color</FormLabel>
                                    <FormControl>
                                        <Input type="color" {...field} />
                                    </FormControl>
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
                                    <FormLabel>Active</FormLabel>
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                {mode === "add" ? "Create" : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
                {/* <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit">Save changes</Button>
                </DialogFooter> */}
            </DialogContent>
            {/* </form> */}
        </Dialog>
    )
}
