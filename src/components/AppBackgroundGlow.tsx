"use client";

import React from "react";

export function AppBackgroundGlow() {
    return (
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden" aria-hidden="true">
            {/* Top Right Sky Glow */}
            <div
                className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full opacity-60 mix-blend-multiply dark:mix-blend-screen"
                style={{
                    background: "radial-gradient(circle, var(--luma-sky) 0%, rgba(0,0,0,0) 70%)",
                    filter: "blur(90px)",
                    opacity: 0.15
                }}
            />

            {/* Bottom Left Rose Glow */}
            <div
                className="absolute bottom-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full opacity-60 mix-blend-multiply dark:mix-blend-screen"
                style={{
                    background: "radial-gradient(circle, var(--luma-rose) 0%, rgba(0,0,0,0) 70%)",
                    filter: "blur(100px)",
                    opacity: 0.12
                }}
            />
        </div>
    );
}
