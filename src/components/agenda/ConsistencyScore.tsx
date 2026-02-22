"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface ConsistencyScoreProps {
    score: number;
    size?: number;
    strokeWidth?: number;
}

export function ConsistencyScore({ score, size = 60, strokeWidth = 5 }: ConsistencyScoreProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;

    // Determine color based on score
    const getColor = () => {
        if (score < 50) return 'var(--accent2)'; // Rose/Red-ish
        if (score < 85) return 'var(--accent)';  // Sky/Blue
        return '#4ADE80'; // Success Green
    };

    const color = getColor();

    return (
        <div className="flex flex-col items-center justify-center gap-1">
            <div
                className="relative flex items-center justify-center"
                style={{ width: size, height: size }}
            >
                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    className="transform -rotate-90"
                >
                    {/* Background circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        className="text-muted/20"
                    />
                    {/* Progress circle */}
                    <motion.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold font-mono">
                        {score}%
                    </span>
                </div>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                Consistência
            </span>
        </div>
    );
}
