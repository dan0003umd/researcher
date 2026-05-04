import { cn } from "@/lib/utils";

type RadioGroupProps = React.ComponentProps<"div">;

function RadioGroup({ className, ...props }: RadioGroupProps) {
  return <div data-slot="radio-group" className={cn("grid gap-2", className)} {...props} />;
}

type RadioGroupItemProps = Omit<React.ComponentProps<"input">, "type">;

function RadioGroupItem({ className, ...props }: RadioGroupItemProps) {
  return (
    <input
      type="radio"
      data-slot="radio-group-item"
      className={cn(
        "h-4 w-4 border-border text-primary focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
      {...props}
    />
  );
}

export { RadioGroup, RadioGroupItem };
