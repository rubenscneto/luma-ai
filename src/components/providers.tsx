"use client";

import React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { RoutineProvider } from "@/context/routineContext";
import { StudyProvider } from "@/context/studyContext";
import { ProjectProvider } from "@/context/projectContext";
import { LibraryProvider } from "@/context/libraryContext";
import { AgendaProvider } from "@/context/agendaContext";

import { AuthProvider } from "@/context/authContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider>
                <RoutineProvider>
                    <StudyProvider>
                        <ProjectProvider>
                            <LibraryProvider>
                                <AgendaProvider>
                                    {children}
                                </AgendaProvider>
                            </LibraryProvider>
                        </ProjectProvider>
                    </StudyProvider>
                </RoutineProvider>
            </AuthProvider>
        </NextThemesProvider>
    );
}
