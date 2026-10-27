import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[#e8ff70] text-[#17221f] shadow-[0_8px_24px_rgba(232,255,112,0.14)] hover:bg-[#f0ff9a]",
  secondary: "border border-[#d8ded8] bg-white text-[#25332d] hover:border-[#98a69c] hover:bg-[#f5f8f3]",
  ghost: "text-[#65736b] hover:bg-[#eef2eb] hover:text-[#17221f]",
  icon: "border border-[#d8ded8] bg-white text-[#516057] hover:border-[#98a69c] hover:text-[#17221f]",
};

export function Button({ className, variant = "secondary", ...props }: ButtonProps) {
  return <button className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50", variants[variant], variant === "icon" && "h-10 w-10 p-0", className)} {...props} />;
}

