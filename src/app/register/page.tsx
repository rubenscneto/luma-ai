"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/authContext";

export default function RegisterPage() {
    const router = useRouter();
    const { signInWithGoogle } = useAuth();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: `${name} ${lastName}`,
                    },
                },
            });

            if (error) {
                setError(error.message);
            } else {
                const { data } = await supabase.auth.getSession();
                if (data.session) {
                    router.push("/dashboard");
                } else {
                    alert("Verifique seu email para confirmar o cadastro!");
                    router.push("/login");
                }
            }
        } catch (err) {
            setError("Ocorreu um erro inesperado.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleRegister = async () => {
        setLoading(true);
        await signInWithGoogle();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#EEF4ED] dark:bg-[#090C08] p-4 relative overflow-hidden">
            {/* Glow Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
                {/* Top Right Sky Glow */}
                <div
                    className="absolute top-[-15%] right-[-15%] w-[60vw] h-[60vw] rounded-full"
                    style={{
                        background: "radial-gradient(circle, rgba(134, 187, 216, 0.35) 0%, rgba(134, 187, 216, 0.15) 40%, transparent 70%)",
                        filter: "blur(80px)",
                    }}
                />

                {/* Bottom Left Rose Glow */}
                <div
                    className="absolute bottom-[-15%] left-[-15%] w-[55vw] h-[55vw] rounded-full"
                    style={{
                        background: "radial-gradient(circle, rgba(172, 136, 135, 0.30) 0%, rgba(172, 136, 135, 0.12) 40%, transparent 70%)",
                        filter: "blur(90px)",
                    }}
                />
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-[#4D626A]/20 dark:border-zinc-800 p-8 rounded-2xl shadow-xl w-full max-w-md space-y-6 z-10 relative">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-[#090C08] dark:text-[#EEF4ED]">Crie sua conta</h1>
                    <p className="text-[#4D626A]">Comece a transformar sua rotina hoje.</p>
                </div>

                <div className="space-y-4">
                    <form onSubmit={handleRegister} className="space-y-4">
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[#090C08] dark:text-[#EEF4ED]">Nome</label>
                                <Input
                                    placeholder="João"
                                    required
                                    className="h-11 border-[#4D626A]/30 focus:border-[#86BBD8] focus:ring-[#86BBD8]"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[#090C08] dark:text-[#EEF4ED]">Sobrenome</label>
                                <Input
                                    placeholder="Silva"
                                    required
                                    className="h-11 border-[#4D626A]/30 focus:border-[#86BBD8] focus:ring-[#86BBD8]"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#090C08] dark:text-[#EEF4ED]">Email</label>
                            <Input
                                type="email"
                                placeholder="seu@email.com"
                                required
                                className="h-11 border-[#4D626A]/30 focus:border-[#86BBD8] focus:ring-[#86BBD8]"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#090C08] dark:text-[#EEF4ED]">Senha</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                required
                                className="h-11 border-[#4D626A]/30 focus:border-[#86BBD8] focus:ring-[#86BBD8]"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full h-11 bg-[#090C08] text-[#EEF4ED] hover:bg-[#4D626A] dark:bg-[#EEF4ED] dark:text-[#090C08] dark:hover:bg-[#86BBD8] shadow-md"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Criar conta grátis"}
                        </Button>
                    </form>

                    <Button
                        variant="secondary"
                        className="w-full flex items-center justify-center gap-2 h-11 border border-[#4D626A]/30 dark:border-zinc-700 font-medium bg-white dark:bg-zinc-800 hover:bg-[#EEF4ED] dark:hover:bg-zinc-700"
                        onClick={handleGoogleRegister}
                        disabled={loading}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Cadastre-se com Google
                    </Button>
                </div>

                <p className="text-center text-sm text-[#4D626A]">
                    Já tem uma conta? <Link href="/login" className="text-[#86BBD8] font-medium hover:underline">Faça Login</Link>
                </p>
            </div>
        </div>
    );
}

