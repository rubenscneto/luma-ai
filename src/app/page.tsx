"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col overflow-hidden">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-violet-600 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold">L</div>
          <span className="font-bold text-xl tracking-tight">LumaAI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="font-medium hover:opacity-70 transition-opacity text-sm">Entrar</Link>
          <Link href="/register">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 font-semibold shadow-lg shadow-blue-500/30">
              Comece agora
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center px-8 relative max-w-7xl mx-auto w-full gap-12">

        {/* Left Content */}
        <div className="flex-1 space-y-8 z-10 md:-mt-20">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1]">
            Desbloqueie seu <br />
            potencial com a <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">LumaAI.</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-lg leading-relaxed">
            Seu assistente pessoal com inteligência artificial para produtividade e aprendizado. Organize seus dias de forma inteligente, planeje seus projetos e alcance seus objetivos mais rapidamente.
          </p>

          <div className="flex items-center gap-4 pt-4">
            <Link href="/register">
              <Button className="h-12 px-8 text-base bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition-opacity rounded-full shadow-xl shadow-blue-500/20">
                Comece gratuitamente
              </Button>
            </Link>
          </div>

          {/* Issue Tag Simulation */}
          <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold mt-8">
            <div className="w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center text-[10px]">N</div>
            1 Issue x
          </div>
        </div>

        {/* Right Content / Visual */}
        <div className="flex-1 relative w-full h-[600px] flex items-center justify-center">
          {/* Abstract Blur Gradient */}
          <div className="relative w-full h-full rounded-3xl overflow-hidden bg-zinc-100 dark:bg-zinc-900/50 backdrop-blur-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-orange-400 via-rose-500 to-violet-600 rounded-full blur-[100px] opacity-80 animate-pulse-slow"></div>
            <div className="absolute inset-0 bg-white/30 dark:bg-black/10 backdrop-blur-2xl"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
