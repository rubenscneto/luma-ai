import { cn } from "@/lib/utils";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export function Input({ className, ...props }: InputProps) {
    return (
        <input
            className={cn(
                "w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all",
                className
            )}
            {...props}
        />
    );
}
