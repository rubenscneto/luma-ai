import { cn } from "@/lib/utils";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
    const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
        primary: "bg-black text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200",
        secondary: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700",
        ghost: "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800",
        danger: "bg-red-500 text-white hover:bg-red-600",
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], className)}
            {...props}
        />
    );
}
