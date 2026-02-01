"use client";

import React from "react";

export function AppBackgroundGlow() {
    return (
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden" aria-hidden="true">
            {/* Base Background */}
            <div className="absolute inset-0 bg-[#EEF4ED] dark:bg-[#090C08]" />

            {/* Top Right Sky Glow */}
            <div
                className="absolute top-[-15%] right-[-15%] w-[70vw] h-[70vw] rounded-full"
                style={{
                    background: "radial-gradient(circle, rgba(134, 187, 216, 0.35) 0%, rgba(134, 187, 216, 0.15) 40%, transparent 70%)",
                    filter: "blur(80px)",
                }}
            />

            {/* Bottom Left Rose Glow */}
            <div
                className="absolute bottom-[-15%] left-[-15%] w-[65vw] h-[65vw] rounded-full"
                style={{
                    background: "radial-gradient(circle, rgba(172, 136, 135, 0.30) 0%, rgba(172, 136, 135, 0.12) 40%, transparent 70%)",
                    filter: "blur(90px)",
                }}
            />
        </div>
    );
}

