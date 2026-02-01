"use client";

import React from "react";
import { motion } from "framer-motion";

interface FloatingAssistantOrbProps {
    onClick: () => void;
}

export function FloatingAssistantOrb({ onClick }: FloatingAssistantOrbProps) {
    return (
        <motion.button
            onClick={onClick}
            className="fixed bottom-6 right-6 z-50 group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            {/* Pulse Effect */}
            <div className="absolute inset-0 rounded-full bg-[var(--luma-sky)] opacity-20 animate-ping" />

            {/* Glow Layer */}
            <div className="absolute inset-0 rounded-full bg-[var(--luma-sky)] blur-md opacity-40 group-hover:opacity-60 transition-opacity" />

            {/* Orb Container */}
            <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-white dark:bg-black border border-[var(--luma-sky)]/30 shadow-xl flex items-center justify-center overflow-hidden backdrop-blur-sm">
                <img
                    src="/brand/logo.png"
                    alt="Assistant"
                    className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-sm"
                />
            </div>
        </motion.button>
    );
}
