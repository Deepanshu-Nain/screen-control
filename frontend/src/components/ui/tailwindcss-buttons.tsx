"use client";
import React from "react";
import { cn } from "@/lib/utils";

export const ButtonsCard = ({
  children,
  className,
  onClick,
}: {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex min-h-[120px] w-full cursor-pointer items-center justify-center rounded-xl border border-neutral-800 bg-black p-4 transition-colors hover:border-neutral-700",
        className
      )}
    >
      {children}
    </div>
  );
};
