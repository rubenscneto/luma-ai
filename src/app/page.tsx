"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--luma-mint)] dark:bg-[var(--luma-black)] text-[var(--luma-black)] dark:text-[var(--luma-mint)] flex flex-col overflow-hidden font-sans relative">

      {/* Landing Page Glow Background - Subtle brand palette glows */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Top Right Sky Glow - 86BBD8 */}
        <motion.div
          className="absolute top-[-15%] right-[-15%] w-[70vw] h-[70vw] rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          style={{
            background: "radial-gradient(circle, rgba(134, 187, 216, 0.18) 0%, rgba(134, 187, 216, 0.08) 40%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />

        {/* Bottom Left Rose Glow - AC8887 */}
        <motion.div
          className="absolute bottom-[-15%] left-[-15%] w-[65vw] h-[65vw] rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.2 }}
          style={{
            background: "radial-gradient(circle, rgba(172, 136, 135, 0.15) 0%, rgba(172, 136, 135, 0.06) 40%, transparent 70%)",
            filter: "blur(110px)",
          }}
        />

        {/* Center Slate Accent - 4D626A */}
        <motion.div
          className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 0.4 }}
          style={{
            background: "radial-gradient(circle, rgba(77, 98, 106, 0.10) 0%, rgba(77, 98, 106, 0.04) 45%, transparent 70%)",
            filter: "blur(120px)",
          }}
        />
      </div>

      {/* Navbar with Safe Area */}
      <nav
        className="flex items-center justify-between px-5 py-4 md:px-8 md:py-6 max-w-7xl mx-auto w-full z-50 relative"
        style={{
          paddingTop: 'max(1rem, calc(env(safe-area-inset-top) + 0.5rem))',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 md:w-12 md:h-12">
            <img src="/brand/logo.png" alt="LumaAI Logo" className="object-contain w-full h-full drop-shadow-md" />
          </div>
          <span className="font-bold text-lg md:text-xl tracking-tight text-[var(--luma-black)] dark:text-[var(--luma-mint)]">LumaAI</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/login" className="font-medium hover:text-[var(--luma-slate)] transition-colors text-sm">
            Entrar
          </Link>
          <Link href="/register">
            <Button className="bg-[var(--luma-black)] hover:opacity-90 text-[var(--luma-mint)] rounded-full px-6 font-semibold shadow-md transition-all">
              Comece agora
            </Button>
          </Link>
        </div>

        {/* Mobile: Text Link + Menu */}
        <div className="flex md:hidden items-center gap-4">
          <Link
            href="/login"
            className="text-[var(--luma-slate)] hover:text-[var(--luma-black)] dark:hover:text-[var(--luma-mint)] font-medium text-sm transition-colors min-h-[44px] flex items-center px-2"
          >
            Entrar
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-0 top-[80px] z-40 md:hidden"
            style={{ top: 'calc(env(safe-area-inset-top) + 60px)' }}
          >
            <div className="mx-4 p-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col gap-3">
                <Link
                  href="/register"
                  className="w-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button className="w-full bg-[var(--luma-black)] text-[var(--luma-mint)] rounded-xl h-12 font-semibold">
                    Comece gratuitamente
                  </Button>
                </Link>
                <Link
                  href="/login"
                  className="text-center py-3 text-[var(--luma-slate)] font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Já tenho uma conta
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center px-6 md:px-8 relative max-w-7xl mx-auto w-full gap-8 md:gap-12 z-10 py-8 md:py-0">

        {/* Left Content */}
        <motion.div
          className="flex-1 space-y-6 md:space-y-8 z-10 md:-mt-20 text-center md:text-left"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1] text-[var(--luma-black)] dark:text-white">
            Desbloqueie seu <br className="hidden sm:block" />
            potencial com a <br className="hidden sm:block" />
            <span className="text-[var(--luma-rose)]">LumaAI.</span>
          </h1>

          <p className="text-base md:text-xl text-[var(--luma-slate)] max-w-lg leading-relaxed font-medium mx-auto md:mx-0">
            Seu assistente pessoal para produtividade e aprendizado. Organize seus dias, planeje projetos e alcance objetivos.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 md:pt-4 w-full sm:w-auto justify-center md:justify-start">
            <Link href="/register" className="w-full sm:w-auto">
              <Button
                className="h-14 px-8 text-base bg-[var(--luma-black)] text-[var(--luma-mint)] hover:bg-[var(--luma-slate)] transition-all rounded-full shadow-lg w-full sm:w-auto font-semibold"
              >
                Comece gratuitamente
              </Button>
            </Link>
          </div>

          {/* Trust badges or features (optional) */}
          <div className="flex items-center gap-6 text-sm text-[var(--luma-slate)] justify-center md:justify-start pt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              100% gratuito
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[var(--luma-sky)] rounded-full"></span>
              IA integrada
            </span>
          </div>
        </motion.div>

        {/* Right Content - Visual element for desktop */}
        <motion.div
          className="flex-1 relative w-full h-[300px] md:h-[500px] hidden md:flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {/* Decorative gradient orb */}
          <div
            className="w-[350px] h-[350px] rounded-full"
            style={{
              background: "radial-gradient(circle at 30% 30%, rgba(134, 187, 216, 0.4), rgba(172, 136, 135, 0.3) 50%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
        </motion.div>
      </main>

      {/* Footer safe area padding */}
      <div
        className="md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      />
    </div>
  );
}
