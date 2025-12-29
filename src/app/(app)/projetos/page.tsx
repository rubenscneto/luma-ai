"use client";

import React, { useState } from "react";
import { useProject } from "@/context/projectContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MoreHorizontal } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function ProjectsPage() {
    const { projects, addProject, addTask } = useProject();
    const [newProjectTitle, setNewProjectTitle] = useState("");

    const handleCreateProject = () => {
        if (!newProjectTitle.trim()) return;
        addProject({
            id: uuidv4(),
            title: newProjectTitle,
            description: "Novo projeto",
            progress: 0,
            status: "active",
            tasks: [],
        });
        setNewProjectTitle("");
    };

    const handleAddTask = (projectId: string) => {
        const taskTitle = prompt("Nome da tarefa:");
        if (!taskTitle) return;
        addTask(projectId, {
            id: uuidv4(),
            title: taskTitle,
            status: "todo",
            priority: "medium",
        });
    };

    return (
        <div className="h-full flex flex-col">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Projetos</h1>
                <div className="flex gap-2">
                    <Input
                        placeholder="Novo Projeto..."
                        value={newProjectTitle}
                        onChange={(e) => setNewProjectTitle(e.target.value)}
                        className="w-64"
                    />
                    <Button onClick={handleCreateProject}><Plus size={20} /></Button>
                </div>
            </header>

            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <div className="flex gap-6 h-full min-w-max">
                    {projects.map(project => (
                        <div key={project.id} className="w-80 flex flex-col h-full bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">{project.title}</h3>
                                    <span className="text-xs text-zinc-500 uppercase tracking-wider">{project.tasks.length} Tarefas</span>
                                </div>
                                <button className="text-zinc-400 hover:text-zinc-600"><MoreHorizontal size={20} /></button>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 mb-6">
                                <div
                                    className="bg-black dark:bg-white h-1.5 rounded-full transition-all"
                                    style={{ width: `${project.tasks.length > 0 ? (project.tasks.filter(t => t.status === 'done').length / project.tasks.length) * 100 : 0}%` }}
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar p-1">
                                {project.tasks.map(task => (
                                    <Card key={task.id} className="p-3 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all cursor-move">
                                        <p className="text-sm font-medium">{task.title}</p>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${task.priority === 'high' ? 'bg-red-100 text-red-600' :
                                                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                                                        'bg-zinc-100 text-zinc-600'
                                                }`}>
                                                {task.priority}
                                            </span>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            <Button
                                variant="ghost"
                                className="w-full mt-4 justify-start text-zinc-500 hover:text-black dark:hover:text-white"
                                onClick={() => handleAddTask(project.id)}
                            >
                                <Plus size={16} className="mr-2" /> Nova Tarefa
                            </Button>
                        </div>
                    ))}

                    {projects.length === 0 && (
                        <div className="w-80 flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-8 text-zinc-400 text-center">
                            <p>Crie seu primeiro projeto para começar</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
