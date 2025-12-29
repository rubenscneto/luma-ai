"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Project, Task } from '@/types';

interface ProjectContextType {
    projects: Project[];
    addProject: (project: Project) => void;
    updateProject: (id: string, updates: Partial<Project>) => void;
    deleteProject: (id: string) => void;
    addTask: (projectId: string, task: Task) => void;
    updateTask: (projectId: string, taskId: string, updates: Partial<Task>) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const [projects, setProjectsState] = useState<Project[]>([]);

    useEffect(() => {
        const savedProjects = localStorage.getItem('luma_projects');
        if (savedProjects) setProjectsState(JSON.parse(savedProjects));
    }, []);

    const saveProjects = (newProjects: Project[]) => {
        setProjectsState(newProjects);
        localStorage.setItem('luma_projects', JSON.stringify(newProjects));
    };

    const addProject = (project: Project) => {
        saveProjects([...projects, project]);
    };

    const updateProject = (id: string, updates: Partial<Project>) => {
        const updated = projects.map(p => p.id === id ? { ...p, ...updates } : p);
        saveProjects(updated);
    };

    const deleteProject = (id: string) => {
        const updated = projects.filter(p => p.id !== id);
        saveProjects(updated);
    };

    const addTask = (projectId: string, task: Task) => {
        const updated = projects.map(p => {
            if (p.id === projectId) {
                return { ...p, tasks: [...p.tasks, task] };
            }
            return p;
        });
        saveProjects(updated);
    };

    const updateTask = (projectId: string, taskId: string, updates: Partial<Task>) => {
        const updated = projects.map(p => {
            if (p.id === projectId) {
                const updatedTasks = p.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
                return { ...p, tasks: updatedTasks };
            }
            return p;
        });
        saveProjects(updated);
    };

    return (
        <ProjectContext.Provider value={{ projects, addProject, updateProject, deleteProject, addTask, updateTask }}>
            {children}
        </ProjectContext.Provider>
    );
}

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (!context) throw new Error('useProject must be used within a ProjectProvider');
    return context;
};
