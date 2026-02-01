"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-transparent text-[var(--luma-black)] dark:text-[var(--luma-mint)] flex flex-col overflow-hidden font-sans">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full z-50">
        <div className="flex items-center gap-3">
          {/* Logo - using the image as requested */}
          <div className="relative w-8 h-8 md:w-10 md:h-10">
            <img src="/brand/Logo.png" alt="LumaAI Logo" className="object-contain w-full h-full drop-shadow-sm" />
          </div>
          <span className="font-bold text-xl tracking-tight text-[var(--luma-black)] dark:text-[var(--luma-mint)]">LumaAI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="font-medium hover:text-[var(--luma-slate)] transition-colors text-sm">Entrar</Link>
          <Link href="/register">
            <Button className="bg-[var(--luma-black)] hover:opacity-90 text-[var(--luma-mint)] rounded-full px-6 font-semibold shadow-md transition-all">
              Comece agora
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center px-8 relative max-w-7xl mx-auto w-full gap-12">

        {/* Left Content */}
        <div className="flex-1 space-y-8 z-10 md:-mt-20">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1] text-[var(--luma-black)] dark:text-white">
            Desbloqueie seu <br />
            potencial com a <br />
            <span className="text-[var(--luma-rose)]">LumaAI.</span>
          </h1>

          <p className="text-lg md:text-xl text-[var(--luma-slate)] max-w-lg leading-relaxed font-medium">
            Seu assistente pessoal para produtividade e aprendizado. Organize seus dias, planeje projetos e alcance objetivos.
          </p>

          <div className="flex items-center gap-4 pt-4">
            <Link href="/register">
              <Button className="h-12 px-8 text-base bg-[var(--luma-black)] text-[var(--luma-mint)] hover:bg-[var(--luma-slate)] transition-all rounded-full shadow-lg">
                Comece gratuitamente
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Content / Visual */}
        <div className="flex-1 relative w-full h-[500px] md:h-[600px] flex items-center justify-center">
          {/* Hero Image / Brand Element */}
          <div className="relative w-full h-full flex items-center justify-center p-8">
            <div className="relative w-64 h-64 md:w-96 md:h-96 rounded-3xl bg-[var(--luma-mint)]/50 backdrop-blur-xl border border-[var(--luma-sky)]/30 shadow-2xl flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-white/20"></div>
              {/* Large Logo in Hero */}
              <img src="/brand/Logo.png" alt="LumaAI Hero" className="w-2/3 h-2/3 object-contain z-10 drop-shadow-2xl" />
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-1/4 right-10 p-4 bg-white/80 dark:bg-black/80 backdrop-blur-md rounded-2xl shadow-xl animate-bounce-slow">
              <Sparkles className="text-[var(--luma-sky)] w-6 h-6" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
