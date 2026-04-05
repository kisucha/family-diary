/**
 * Avatar 컴포넌트 — @radix-ui/react-avatar 없이 직접 구현.
 * AvatarImage: 이미지 로드 실패 시 onError 핸들러로 fallback 표시.
 * AvatarFallback: 이니셜 또는 대체 콘텐츠를 원형 배경에 렌더링.
 */

import * as React from "react"

import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/* Root                                                                  */
/* ------------------------------------------------------------------ */

type AvatarProps = React.HTMLAttributes<HTMLSpanElement>

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
)
Avatar.displayName = "Avatar"

/* ------------------------------------------------------------------ */
/* Image                                                                 */
/* ------------------------------------------------------------------ */

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  onLoadingStatusChange?: (status: "loading" | "loaded" | "error") => void
}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt = "", onError, onLoad, onLoadingStatusChange, ...props }, ref) => {
    const [status, setStatus] = React.useState<"loading" | "loaded" | "error">(
      src ? "loading" : "error"
    )

    React.useEffect(() => {
      if (!src) {
        setStatus("error")
        onLoadingStatusChange?.("error")
      } else {
        setStatus("loading")
        onLoadingStatusChange?.("loading")
      }
    }, [src]) // eslint-disable-line react-hooks/exhaustive-deps

    if (status === "error") return null

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={cn("aspect-square h-full w-full object-cover", className)}
        onLoad={(e) => {
          setStatus("loaded")
          onLoadingStatusChange?.("loaded")
          onLoad?.(e)
        }}
        onError={(e) => {
          setStatus("error")
          onLoadingStatusChange?.("error")
          onError?.(e)
        }}
        {...props}
      />
    )
  }
)
AvatarImage.displayName = "AvatarImage"

/* ------------------------------------------------------------------ */
/* Fallback                                                              */
/* ------------------------------------------------------------------ */

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {
  delayMs?: number
}

const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, delayMs, children, ...props }, ref) => {
    const [visible, setVisible] = React.useState(delayMs === undefined)

    React.useEffect(() => {
      if (delayMs !== undefined) {
        const timer = setTimeout(() => setVisible(true), delayMs)
        return () => clearTimeout(timer)
      }
    }, [delayMs])

    if (!visible) return null

    return (
      <span
        ref={ref}
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium uppercase",
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
