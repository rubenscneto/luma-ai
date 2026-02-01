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

export interface RoutineProfileDB {
    user_id: string;
    occupation: string;
    peak_productivity: string;
    energy_level: string;
    goal: string;
    summary?: string;
    wake_up_time: string;
    bed_time: string;
}

export interface FixedCommitment {
    id: string;
    user_id: string;
    title: string;
    category: string;
    start_time: string;
    end_time: string;
    days_of_week: number[];
}

export interface AgendaItem {
    id: string;
    user_id: string;
    title: string;
    notes?: string;
    date: string; // ISO Date YYYY-MM-DD
    start_time: string; // HH:mm
    duration: number; // minutes
    category: 'work' | 'study' | 'health' | 'leisure' | 'fixed' | 'project';
    status: 'todo' | 'in-progress' | 'done';
    generated: boolean;
}

// ========== New Agenda System Types ==========

export type BlockCategory = 'work' | 'study' | 'health' | 'leisure' | 'admin' | 'sleep' | 'meal' | 'commute' | 'fixed';
export type BlockSource = 'fixed' | 'ai' | 'manual';
export type PlanStatus = 'draft' | 'active' | 'archived';
export type HealthGoal = 'energy' | 'fitness' | 'healthy_habits' | 'sleep' | 'stress' | 'general';
export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';

export interface FixedBlock {
    id: string;
    user_id: string;
    title: string;
    category: BlockCategory;
    day_of_week: number; // 0-6 (0 = Sunday)
    start_time: string; // HH:mm
    end_time: string; // HH:mm
    location?: string;
    notes?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface DailyPlan {
    id: string;
    user_id: string;
    plan_date: string; // YYYY-MM-DD
    timezone: string;
    status: PlanStatus;
    created_at?: string;
    updated_at?: string;
}

export interface DailyBlock {
    id: string;
    plan_id: string;
    user_id: string;
    title: string;
    category: BlockCategory;
    start_datetime: string; // ISO datetime
    end_datetime: string; // ISO datetime
    source: BlockSource;
    is_done: boolean;
    done_at?: string;
    is_skipped: boolean;
    skip_reason?: string;
    order_index: number;
    meta?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
}

export interface HealthProfile {
    user_id: string;
    height_cm?: number;
    weight_kg?: number;
    goal: HealthGoal;
    dietary_preferences: string[];
    allergies_restrictions: string[];
    training_level: TrainingLevel;
    equipment: string[];
    wake_time?: string; // HH:mm
    sleep_time?: string; // HH:mm
    created_at?: string;
    updated_at?: string;
}

export interface ShoppingItem {
    name: string;
    qty?: number;
    unit?: string;
    category?: string;
    checked: boolean;
}

export interface ShoppingList {
    id: string;
    user_id: string;
    title: string;
    items: ShoppingItem[];
    source: BlockSource;
    created_at?: string;
    updated_at?: string;
}

// Helper type for current block status
export type BlockStatus = 'upcoming' | 'current' | 'done' | 'skipped' | 'delayed';

export interface DailyBlockWithStatus extends DailyBlock {
    status: BlockStatus;
    timeUntilStart?: number; // minutes
    timeUntilEnd?: number; // minutes
}

