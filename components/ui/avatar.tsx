import { cn } from "@/lib/utils";

function Avatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar"
      className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-sm font-semibold text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, alt = "", ...props }: React.ComponentProps<"img">) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img data-slot="avatar-image" alt={alt} className={cn("h-full w-full object-cover", className)} {...props} />;
}

function AvatarFallback({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-fallback"
      className={cn("flex h-full w-full items-center justify-center", className)}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
