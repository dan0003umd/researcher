import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-xl border border-[oklch(from_var(--color-text)_l_c_h_/_0.08)] bg-[var(--color-surface)] p-5 text-card-foreground shadow-[0_1px_3px_oklch(0.2_0.01_80_/_0.06),0_4px_12px_oklch(0.2_0.01_80_/_0.04)] transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-px hover:shadow-[0_2px_6px_oklch(0.2_0.01_80_/_0.08),0_8px_24px_oklch(0.2_0.01_80_/_0.06)]",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("space-y-1.5 p-0", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-[0.9375rem] font-medium tracking-[-0.01em]", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("p-0 pt-4", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn("flex items-center p-0 pt-4", className)} {...props} />;
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
