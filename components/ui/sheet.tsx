"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type SheetContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const context = React.useContext(SheetContext);

  if (!context) {
    throw new Error("Sheet components must be used within <Sheet>.");
  }

  return context;
}

type SheetProps = {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function Sheet({ children, open, defaultOpen = false, onOpenChange }: SheetProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : internalOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  return <SheetContext.Provider value={{ open: currentOpen, setOpen }}>{children}</SheetContext.Provider>;
}

type SheetTriggerProps = React.ComponentProps<"button"> & {
  asChild?: boolean;
};

function SheetTrigger({ asChild = false, children, onClick, ...props }: SheetTriggerProps) {
  const { setOpen } = useSheetContext();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (!event.defaultPrevented) {
      setOpen(true);
    }
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void }>;

    return React.cloneElement(child, {
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        child.props.onClick?.(event);

        if (!event.defaultPrevented) {
          setOpen(true);
        }
      },
    });
  }

  return (
    <button type="button" data-slot="sheet-trigger" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

type SheetCloseProps = React.ComponentProps<"button"> & {
  asChild?: boolean;
};

function SheetClose({ asChild = false, children, onClick, ...props }: SheetCloseProps) {
  const { setOpen } = useSheetContext();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (!event.defaultPrevented) {
      setOpen(false);
    }
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void }>;

    return React.cloneElement(child, {
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        child.props.onClick?.(event);

        if (!event.defaultPrevented) {
          setOpen(false);
        }
      },
    });
  }

  return (
    <button type="button" data-slot="sheet-close" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

type SheetPortalProps = {
  children: React.ReactNode;
};

function SheetPortal({ children }: SheetPortalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(children, document.body);
}

type SheetContentProps = React.ComponentProps<"div"> & {
  side?: "right" | "left";
};

function SheetContent({ className, children, side = "right", ...props }: SheetContentProps) {
  const { open, setOpen } = useSheetContext();

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  if (!open) {
    return null;
  }

  return (
    <SheetPortal>
      <div className="fixed inset-0 z-50">
        <button
          type="button"
          className="absolute inset-0 bg-foreground/25"
          aria-label="Close sheet"
          onClick={() => setOpen(false)}
        />
        <div
          data-slot="sheet-content"
          role="dialog"
          aria-modal="true"
          className={cn(
            "absolute top-0 h-full w-[92vw] max-w-md border-border bg-background p-6 shadow-xl",
            side === "right" ? "right-0 border-l" : "left-0 border-r",
            className,
          )}
          {...props}
        >
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          {children}
        </div>
      </div>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("space-y-1.5 pr-10", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="sheet-title" className={cn("text-xl font-semibold tracking-tight", className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="sheet-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn("mt-6 flex items-center gap-2", className)} {...props} />;
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
