export type Priority = 'high' | 'medium' | 'low';
export type Status = 'todo' | 'in-progress' | 'done';

export interface Task {
    id: string;
    title: string;
    status: Status;
    priority: Priority;
    projectId?: string;
}

export interface Project {
    id: string;
    title: string;
    description: string;
    progress: number;
    tasks: Task[];
    status: 'active' | 'completed' | 'on-hold';
}

export interface RoutineBlock {
    id: string;
    title: string;
    startTime: string; // HH:mm
    duration: number; // minutes
    type: 'work' | 'study' | 'leisure' | 'health' | 'fixed';
    completed: boolean;
}

export interface RoutineProfile {
    occupation: string;
    peakProductivity: string;
    energyLevel: string;
    fixedTasks: string[];
    style: 'focused' | 'balanced' | 'relaxed';
}

export interface StudySession {
    id: string;
    subject: string;
    topic: string;
    date: string;
    duration: number; // minutes
    notes: string;
    nextReviewDate?: string;
}

export interface LibraryItem {
    id: string;
    title: string;
    type: 'pdf' | 'book' | 'article';
    summary?: string;
    tags: string[];
    addedAt: string;
}

export interface Insight {
    id: string;
    content: string;
    date: string;
    type: 'motivation' | 'tip' | 'warning';
}
