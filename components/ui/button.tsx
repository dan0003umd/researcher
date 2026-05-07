import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent px-[1.125rem] py-2 text-[0.875rem] font-medium tracking-[0.01em] whitespace-nowrap transition-[background,transform,box-shadow,border-color,color] duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-none hover:-translate-y-px hover:bg-[var(--color-primary-hover)] hover:shadow-[0_4px_12px_oklch(0.48_0.12_192_/_0.3)] active:translate-y-0",
        faculty:
          "bg-[#1e3a5f] text-white shadow-none hover:-translate-y-px hover:bg-[#2d5282] hover:shadow-[0_4px_12px_oklch(0.25_0.08_240_/_0.3)] active:translate-y-0",
        outline:
          "border-[oklch(from_var(--color-text)_l_c_h_/_0.15)] bg-transparent text-foreground hover:bg-[var(--color-surface-offset)] hover:border-[oklch(from_var(--color-text)_l_c_h_/_0.25)]",
        secondary:
          "border-[oklch(from_var(--color-text)_l_c_h_/_0.15)] bg-transparent text-foreground hover:bg-[var(--color-surface-offset)] hover:border-[oklch(from_var(--color-text)_l_c_h_/_0.25)]",
        ghost: "border-[oklch(from_var(--color-text)_l_c_h_/_0.12)] bg-transparent text-foreground hover:bg-[var(--color-surface-offset)] hover:text-foreground",
        destructive:
          "border-[var(--color-error)] bg-transparent text-[var(--color-error)] hover:bg-[var(--color-error-highlight)] focus-visible:border-[var(--color-error)] focus-visible:ring-[var(--color-error)]/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 rounded-[10px] px-2.5 text-xs",
        sm: "h-8 rounded-[10px] px-3 text-[0.8125rem]",
        lg: "h-10 px-5 text-[0.9375rem]",
        icon: "size-9 px-0",
        "icon-xs": "size-7 rounded-[10px] px-0 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-[10px] px-0",
        "icon-lg": "size-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
