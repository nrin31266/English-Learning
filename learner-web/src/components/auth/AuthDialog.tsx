// src/components/auth/AuthDialog.tsx

import { useMemo } from "react"
import { useLocation } from "react-router-dom"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAppDispatch, useAppSelector } from "@/store"
import { closeAuthDialog } from "@/store/uiSlice"
import KeycloakClient from "@/features/keycloak/keycloak"
import { BrandLogo } from "../layout/BrandLogo"

const AUTH_COPY_RULES = [
  {
    startsWith: "/learn",
    title: "Lưu kết quả học tập của bạn",
    description:
      "Đăng nhập để lưu thành quả học tập, theo dõi tiến trình và nhận đề xuất học tập cá nhân hóa.",
  },
  {
    startsWith: "/vocab",
    title: "Ôn từ vựng thông minh hơn",
    description:
      "Đăng nhập để lưu tiến độ từ vựng, lịch ôn tập và các từ cần luyện lại.",
  },
]

const DEFAULT_AUTH_COPY = {
  title: "Chào mừng trở lại",
  description:
    "Rất vui được gặp lại bạn! Đăng nhập để tiếp tục hành trình học tiếng Anh của mình.",
}

const AuthDialog = () => {
  const dispatch = useAppDispatch()
  const open = useAppSelector((state) => state.ui.authDialogOpen)
  const { pathname } = useLocation()

  const kcClient = KeycloakClient.getInstance()

  const copy = useMemo(() => {
    return (
      AUTH_COPY_RULES.find((item) => pathname.startsWith(item.startsWith)) ??
      DEFAULT_AUTH_COPY
    )
  }, [pathname])

  const handleGoogleLogin = () => {
    kcClient.login()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) dispatch(closeAuthDialog())
      }}
    >
      <DialogContent
        className="
          max-w-[820px] overflow-hidden rounded-[30px] border border-border/70 p-0
          shadow-2xl shadow-black/25
          sm:max-w-[820px]
        "
      >
        <div className="grid min-h-[500px] bg-background md:grid-cols-[390px_430px]">
          <section className="flex flex-col px-9 py-8">
            <div className="mt-8 flex justify-center">
              <BrandLogo
                asSidebar={false}
                size="md"
                subtitle="Được phát triển bởi Rin"
                className="justify-center"
              />
            </div>

            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <DialogTitle className="max-w-[320px] text-[32px] font-bold leading-tight tracking-[-0.04em] text-foreground">
                {copy.title}
              </DialogTitle>

              <DialogDescription className="mt-4 max-w-[330px] text-[15px] leading-7 text-muted-foreground">
                {copy.description}
              </DialogDescription>

              <Button
                type="button"
                onClick={handleGoogleLogin}
                className="
    mt-9 h-[52px] w-full max-w-[315px] rounded-2xl border border-border/80
    bg-white px-5 text-[15px] font-semibold text-neutral-900
    shadow-sm
    transition-colors
    hover:bg-neutral-50
    focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2
    dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-50
  "
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-white">
                  <GoogleIcon />
                </span>
                <span className="ml-3">Tiếp tục với Google</span>
              </Button>

              <p className="mt-6 max-w-[300px] text-center text-[11px] leading-5 text-muted-foreground/70">
                Khi tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo mật của FluenRin.
              </p>
            </div>
          </section>

          <section className="hidden overflow-hidden bg-muted/20 md:block">
            <img
              src="/images/auth-hero.png"
              alt=""
              className="h-full w-full select-none object-cover object-center"
              draggable={false}
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const GoogleIcon = () => {
  return (
    <svg viewBox="0 0 24 24" className="size-4.5 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.227c0-.709-.064-1.391-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.232c1.891-1.741 2.981-4.305 2.981-7.351z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.964-.895 6.619-2.422l-3.232-2.51c-.895.6-2.041.955-3.387.955-2.605 0-4.81-1.759-5.596-4.123H3.064v2.591A9.996 9.996 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.404 13.9A6.006 6.006 0 0 1 6.091 12c0-.659.114-1.3.313-1.9V7.509H3.064A9.996 9.996 0 0 0 2 12c0 1.614.386 3.141 1.064 4.491L6.404 13.9z"
      />
      <path
        fill="#EA4335"
        d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.959 2.991 14.696 2 12 2A9.996 9.996 0 0 0 3.064 7.509l3.34 2.591C7.19 7.736 9.395 5.977 12 5.977z"
      />
    </svg>
  )
}

export default AuthDialog