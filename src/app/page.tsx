"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#EEF4ED] dark:bg-[#090C08] text-[var(--luma-black)] dark:text-[var(--luma-mint)] flex flex-col overflow-hidden font-sans relative">

      {/* Landing Page Glow Background with Center Spotlight */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Top Right Sky Glow */}
        <div
          className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(134, 187, 216, 0.45) 0%, rgba(134, 187, 216, 0.2) 35%, transparent 65%)",
            filter: "blur(70px)",
          }}
        />

        {/* Bottom Left Rose Glow */}
        <div
          className="absolute bottom-[-10%] left-[-10%] w-[55vw] h-[55vw] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(172, 136, 135, 0.40) 0%, rgba(172, 136, 135, 0.15) 35%, transparent 65%)",
            filter: "blur(80px)",
          }}
        />

        {/* Center Spotlight "Hole" - Clear area for logo */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[500px] md:h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(238, 244, 237, 0.95) 0%, rgba(238, 244, 237, 0.7) 40%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full z-50 relative">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 md:w-10 md:h-10">
            <img src="/brand/logo.png" alt="LumaAI Logo" className="object-contain w-full h-full drop-shadow-sm" />
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
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center px-8 relative max-w-7xl mx-auto w-full gap-12 z-10">

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

        {/* Right Content / Visual - Logo in the "Spotlight Hole" */}
        <div className="flex-1 relative w-full h-[500px] md:h-[600px] flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Logo floating in the clear center */}
            <img
              src="/brand/logo.png"
              alt="LumaAI Hero"
              className="w-48 h-48 md:w-72 md:h-72 object-contain drop-shadow-2xl z-20"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

