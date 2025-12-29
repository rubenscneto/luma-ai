import { cn } from "@/lib/utils";
import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
    return (
        <div
            className={cn(
                "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-4",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
