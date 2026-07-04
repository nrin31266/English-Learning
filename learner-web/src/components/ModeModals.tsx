// src/components/ModeModals.tsx

import { useTranslation } from "react-i18next"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Trophy } from "lucide-react"

interface CompletionModalProps {
  open: boolean
  onBack: () => void
  onReview?: () => void
  children?: ReactNode
}

export const CompletionModal = ({
  open,
  onBack,
  onReview = () => {},
  children,
}: CompletionModalProps) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onReview}>
      <DialogContent className="sm:max-w-[420px] overflow-hidden rounded-2xl border border-border/70 bg-background p-0 shadow-xl">
        <div className="flex flex-col items-center px-7 pb-8 pt-9 text-center sm:px-10 sm:pt-10">
          <div className="mb-6 flex items-center justify-center text-amber-500 dark:text-amber-400">
            <Trophy className="h-14 w-14 stroke-[1.7] drop-shadow-sm" />
          </div>

          <DialogHeader className="flex w-full flex-col items-center space-y-2 text-center">
            <DialogTitle className="w-full text-center text-2xl font-semibold tracking-tight text-foreground">
              {t("modals.completionTitle")}
            </DialogTitle>

            <DialogDescription className="max-w-xs text-center text-sm leading-6 text-muted-foreground">
              {t("modals.completionDescription")}
            </DialogDescription>
          </DialogHeader>

          {children && <div className="mt-7 w-full">{children}</div>}

          <div className="mt-8 w-full space-y-2.5">
            <Button
              onClick={onBack}
              className="h-11 w-full justify-center rounded-lg text-center font-semibold shadow-none"
            >
              {t("modals.completionBackToTopic")}
            </Button>

            <Button
              onClick={onReview}
              variant="outline"
              className="h-11 w-full justify-center rounded-lg border-border/80 text-center font-medium"
            >
              {t("modals.completionContinue")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}