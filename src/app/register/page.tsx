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
                // If email confirmation is off, redirect. Usually configured to verify email.
                // For this demo, let's assume it might require verification or login.
                // But often local dev or new Supabase projects require verification by default.
                // I will show a message or redirect if session is instant.

                // Check if session established (depends on Supabase settings)
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
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl shadow-xl w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold">Crie sua conta</h1>
                    <p className="text-zinc-500">Comece a transformar sua rotina hoje.</p>
                </div>

                <div className="space-y-4">
                    <form onSubmit={handleRegister} className="space-y-4">
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome</label>
                                <Input
                                    placeholder="João"
                                    required
                                    className="h-11"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Sobrenome</label>
                                <Input
                                    placeholder="Silva"
                                    required
                                    className="h-11"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                type="email"
                                placeholder="seu@email.com"
                                required
                                className="h-11"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Senha</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                required
                                className="h-11"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : "Criar conta grátis"}
                        </Button>
                    </form>

                    <Button
                        variant="secondary"
                        className="w-full flex items-center justify-center gap-2 h-11 border border-zinc-200 dark:border-zinc-700 font-medium bg-transparent hover:bg-zinc-50"
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

                <p className="text-center text-sm text-zinc-500">
                    Já tem uma conta? <Link href="/login" className="text-blue-600 font-medium hover:underline">Faça Login</Link>
                </p>
            </div>
        </div>
    );
}
