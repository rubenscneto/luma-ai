"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Settings, Bell, Download, FileText, User,
    Moon, Sun, ChevronRight, Shield, Smartphone
} from 'lucide-react';
import DataExportImport from '@/components/settings/DataExportImport';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/context/authContext';

type SettingsTab = 'profile' | 'notifications' | 'data';

import { useTheme } from "next-themes";

export default function SettingsPage() {
    const { user, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const {
        isSupported,
        permission,
        isSubscribed,
        subscribe,
        unsubscribe
    } = usePushNotifications();

    // next-themes integration
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch
    React.useEffect(() => {
        setMounted(true);
    }, []);

    const isDarkMode = mounted ? (theme === 'dark' || (theme === 'system' && resolvedTheme === 'dark')) : false;

    const toggleTheme = () => {
        setTheme(isDarkMode ? 'light' : 'dark');
    };

    const tabs = [
        { id: 'profile' as const, label: 'Perfil', icon: User },
        { id: 'notifications' as const, label: 'Notificações', icon: Bell },
        { id: 'data' as const, label: 'Dados', icon: Download },
    ];

    const handleTogglePush = async () => {
        if (isSubscribed) {
            await unsubscribe();
        } else {
            await subscribe();
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Settings className="w-7 h-7 text-purple-400" />
                    Configurações
                </h1>
                <p className="text-white/60 text-sm mt-1">
                    Gerencie suas preferências e dados
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar */}
                <div className="md:w-64 flex-shrink-0">
                    <div className="bg-white/5 rounded-2xl border border-white/10 p-2">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white'
                                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : ''}`} />
                                    <span className="font-medium">{tab.label}</span>
                                    {isActive && (
                                        <ChevronRight className="w-4 h-4 ml-auto text-purple-400" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                {/* User Info */}
                                <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Informações da Conta</h3>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                                                {user?.email?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{user?.email || 'Usuário'}</p>
                                                <p className="text-white/60 text-sm">Membro desde {new Date().getFullYear()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Appearance */}
                                <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Aparência</h3>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {isDarkMode ? (
                                                <Moon className="w-5 h-5 text-purple-400" />
                                            ) : (
                                                <Sun className="w-5 h-5 text-yellow-400" />
                                            )}
                                            <div>
                                                <p className="text-white font-medium">Modo Escuro</p>
                                                <p className="text-white/60 text-sm">Tema da interface</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleTheme}
                                            className={`w-12 h-6 rounded-full transition-colors ${isDarkMode ? 'bg-purple-500' : 'bg-white/20'
                                                }`}
                                        >
                                            <motion.div
                                                layout
                                                className="w-5 h-5 rounded-full bg-white shadow-md"
                                                style={{ marginLeft: isDarkMode ? '26px' : '2px' }}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Security */}
                                <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-green-400" />
                                        Segurança
                                    </h3>

                                    <button
                                        onClick={signOut}
                                        className="w-full py-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/30 transition-all"
                                    >
                                        Sair da Conta
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                {/* Push Notifications */}
                                <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <Smartphone className="w-5 h-5 text-blue-400" />
                                        Notificações Push
                                    </h3>

                                    {!isSupported ? (
                                        <p className="text-white/60 text-sm">
                                            Seu navegador não suporta notificações push.
                                        </p>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-white font-medium">Ativar Push</p>
                                                    <p className="text-white/60 text-sm">
                                                        {permission === 'denied'
                                                            ? 'Bloqueado pelo navegador'
                                                            : 'Receber notificações mesmo com app fechado'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={handleTogglePush}
                                                    disabled={permission === 'denied'}
                                                    className={`w-12 h-6 rounded-full transition-colors ${isSubscribed ? 'bg-green-500' : 'bg-white/20'
                                                        } ${permission === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <motion.div
                                                        layout
                                                        className="w-5 h-5 rounded-full bg-white shadow-md"
                                                        style={{ marginLeft: isSubscribed ? '26px' : '2px' }}
                                                    />
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
                                                <Bell className="w-4 h-4 text-white/40" />
                                                <span className="text-xs text-white/60">
                                                    Status: {permission === 'granted' ? 'Permitido' : permission === 'denied' ? 'Bloqueado' : 'Não solicitado'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Notification Preferences */}
                                <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Preferências</h3>

                                    <div className="space-y-4">
                                        {[
                                            { id: 'blocks', label: 'Lembrete de blocos', desc: '5 minutos antes', default: true },
                                            { id: 'health', label: 'Dicas de saúde', desc: 'Lembretes diários', default: true },
                                            { id: 'study', label: 'Revisão de estudos', desc: 'Flashcards para revisar', default: true },
                                            { id: 'motivation', label: 'Motivação diária', desc: 'Mensagem inspiradora', default: false },
                                        ].map(pref => (
                                            <div key={pref.id} className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-white font-medium">{pref.label}</p>
                                                    <p className="text-white/60 text-sm">{pref.desc}</p>
                                                </div>
                                                <button
                                                    className={`w-10 h-5 rounded-full transition-colors ${pref.default ? 'bg-purple-500' : 'bg-white/20'
                                                        }`}
                                                >
                                                    <motion.div
                                                        layout
                                                        className="w-4 h-4 rounded-full bg-white shadow-md"
                                                        style={{ marginLeft: pref.default ? '22px' : '2px' }}
                                                    />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'data' && (
                            <DataExportImport />
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
