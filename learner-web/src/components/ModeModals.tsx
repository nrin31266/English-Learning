
// src/components/ModeModals.tsx
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trophy,
  UserCircle2
} from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onLogin: () => void;
  onClose: () => void;
}

export const LoginIncentiveModal = ({ open, onLogin, onClose }: LoginModalProps) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-6 sm:p-8 rounded-2xl">
        <DialogHeader className="flex flex-col items-center gap-2">
          {/* Icon nhẹ nhàng, bo tròn đơn giản */}
          <div className="mb-2 p-4 rounded-full bg-primary/10 text-primary">
            <UserCircle2 className="h-10 w-10 stroke-[1.5]" />
          </div>
          
          <DialogTitle className="text-2xl font-bold text-center text-foreground">
            {t("modals.loginTitle")}
          </DialogTitle>
          
          {/* Câu chữ tập trung đúng vào việc học và lưu kết quả */}
          <DialogDescription className="text-center text-base text-muted-foreground leading-relaxed">
            {t("modals.loginDescription")}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full sm:w-1/2 h-11 rounded-xl text-muted-foreground hover:text-foreground"
          >
            {t("modals.loginMaybeLater")}
          </Button>
          <Button
            onClick={onLogin}
            className="w-full sm:w-1/2 h-11 rounded-xl font-semibold shadow-sm"
          >
            {t("modals.loginSignIn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
interface CompletionModalProps {
  open: boolean;
  onBack: () => void;
  onReview?: () => void;
  onRestart?: () => void;
}


export const CompletionModal = ({
  open,
  onBack,
  onReview = () => {},
  onRestart = () => {},
}: CompletionModalProps) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onReview}>
      <DialogContent className="sm:max-w-[460px] p-0 rounded-[2rem] border-none bg-background shadow-2xl overflow-hidden">
        <div className="p-8 sm:p-10 flex flex-col items-center">
          
          {/* Trophy Icon: Có background tròn làm điểm tựa, nhìn gọn gàng và tinh tế */}
          <div className="mb-6 p-5 rounded-full bg-amber-500/10 text-amber-500">
             <Trophy className="h-12 w-12 stroke-[1.5]" />
          </div>
          
          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="text-2xl sm:text-3xl font-bold text-foreground">
              {t("modals.completionTitle")}
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              {t("modals.completionDescription")}
            </DialogDescription>
          </DialogHeader>

          {/* Action Buttons: Phân cấp 1 chính - 2 phụ rõ ràng */}
          <div className="w-full mt-10 space-y-3">
            {/* Nút Primary: Điều hướng chính */}
            <Button
              onClick={onBack}
              className="w-full h-12 text-base font-semibold rounded-xl gap-2 shadow-sm"
            >
              {t("modals.completionBackToTopic")}
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Nút Secondary: Học lại */}
              <Button
                onClick={onRestart}
                variant="secondary"
                className="h-11 font-semibold rounded-xl gap-2 hover:opacity-80"
              >
                {t("modals.completionReLearn")}
              </Button>
              
              {/* Nút Outline: Xem lại bài */}
              <Button
                onClick={onReview}
                variant="outline"
                className="h-11 font-semibold rounded-xl gap-2"
              >
                {t("modals.completionReview")}
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};