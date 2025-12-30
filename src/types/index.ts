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
    fixedTasks: FixedTask[];
    userSettings: UserSettings;
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

// Education Modules

export interface Subject {
    id: string;
    user_id: string;
    name: string;
    color: string;
    goal?: string;
    difficulty: number; // 1-5
    created_at?: string;
}

export interface StudyMaterial {
    id: string;
    subject_id: string;
    title: string;
    type: 'pdf' | 'text' | 'link' | 'video';
    content: string;
    summary?: string;
    created_at?: string;
}

export interface Flashcard {
    id: string;
    subject_id: string;
    front: string;
    back: string;
    next_review: string; // ISO Date
    interval: number;
    ease_factor: number;
}

export interface MindMap {
    id: string;
    subject_id: string;
    title: string;
    nodes: any[]; // React Flow Nodes
    edges: any[]; // React Flow Edges
}

export interface UserSettings {
    user_id: string;
    wake_up_time: string;
    bed_time: string;
}

export interface FixedTask {
    id: string;
    user_id: string;
    title: string;
    start_time: string;
    end_time: string;
    days_of_week: number[]; // 1-7
}
