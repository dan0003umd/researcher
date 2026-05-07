import { cn } from "@/lib/utils";

type ProgressProps = React.ComponentProps<"div"> & {
  value: number;
  indicatorClassName?: string;
};

function Progress({ value, className, indicatorClassName, ...props }: ProgressProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      data-slot="progress"
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <div
        className={cn("h-full bg-primary transition-all duration-300", indicatorClassName)}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

export { Progress };
