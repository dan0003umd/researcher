import { cn } from "@/lib/utils";

type ProgressProps = React.ComponentProps<"div"> & {
  value: number;
};

function Progress({ value, className, ...props }: ProgressProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      data-slot="progress"
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

export { Progress };
