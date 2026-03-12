"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type ContextMenuItem = {
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
};

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  className?: string;
}

export function ContextMenu({
  x,
  y,
  items,
  onClose,
  className,
}: ContextMenuProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClick = () => onClose();
    const handleScroll = () => onClose();
    document.addEventListener("click", handleClick);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  const content = (
    <div
      ref={ref}
      className={cn(
        "fixed z-50 min-w-[10rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
        className
      )}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          className={cn(
            "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
            item.variant === "destructive" && "text-destructive hover:bg-destructive/10 hover:text-destructive"
          )}
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
