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
            className="fixed z-50 group"
            style={{
                // Position above tab bar on mobile, normal on desktop
                bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
                right: "16px",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            {/* Subtle Pulse Effect */}
            <motion.div
                className="absolute inset-0 rounded-full bg-[#86BBD8]"
                animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.2, 0.1, 0.2],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* Glow Layer */}
            <div className="absolute inset-0 rounded-full bg-[#86BBD8] blur-md opacity-30 group-hover:opacity-50 transition-opacity" />

            {/* Orb Container */}
            <div className="relative w-14 h-14 rounded-full bg-white dark:bg-[#090C08] border border-[#86BBD8]/30 shadow-xl flex items-center justify-center overflow-hidden backdrop-blur-sm">
                <img
                    src="/brand/logo.png"
                    alt="Assistente"
                    className="w-8 h-8 object-contain drop-shadow-sm"
                />
            </div>
        </motion.button>
    );
}
