"use client";

import React from "react";
import { RoutineProvider } from "@/context/routineContext";
import { StudyProvider } from "@/context/studyContext";
import { ProjectProvider } from "@/context/projectContext";
import { LibraryProvider } from "@/context/libraryContext";

import { AuthProvider } from "@/context/authContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <RoutineProvider>
                <StudyProvider>
                    <ProjectProvider>
                        <LibraryProvider>
                            {children}
                        </LibraryProvider>
                    </ProjectProvider>
                </StudyProvider>
            </RoutineProvider>
        </AuthProvider>
    );
}
