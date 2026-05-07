import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[0.75rem] font-medium leading-none",
  {
    variants: {
      variant: {
        default:
          "border-[oklch(from_var(--color-primary)_l_c_h_/_0.2)] bg-[oklch(from_var(--color-primary)_l_c_h_/_0.12)] text-primary",
        secondary: "border-border bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]",
        outline: "border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
