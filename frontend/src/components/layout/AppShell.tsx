"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/layout/Navbar";
import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isLoginPage) {
        router.replace("/login");
      } else if (isAuthenticated && isLoginPage) {
        router.replace("/");
      }
    }
  }, [isAuthenticated, isLoading, isLoginPage, router]);

  // Tampilkan loading screen saat memverifikasi sesi tersimpan
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
            <ShieldCheck className="w-7 h-7 stroke-[1.8]" />
          </div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#64748B]">
            <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            <span>Memverifikasi Sesi Pengguna...</span>
          </div>
        </div>
      </div>
    );
  }

  // Jika belum login dan sedang mengakses halaman selain login, tampilkan layar pengalihan
  if (!isAuthenticated && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex items-center space-x-2 text-xs font-semibold text-[#64748B]">
          <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <span>Mengalihkan ke halaman login...</span>
        </div>
      </div>
    );
  }

  // Jika di halaman login, tampilkan login page tanpa navbar aplikasi
  if (isLoginPage) {
    return <main className="min-h-screen bg-[#F8FAFC]">{children}</main>;
  }

  // Jika sudah terotentikasi, tampilkan shell aplikasi lengkap
  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {children}
      </main>
      <footer className="border-t border-[#E2E8F0] bg-white py-6 text-center text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-[#0F172A]">
            Pusat Kebijakan Strategis — Kementerian Komunikasi dan Digital Republik Indonesia
          </p>
          <p className="text-[#64748B]">
            Jl. Medan Merdeka Barat No. 9, Jakarta Pusat 10110 • Sistem Otomatisasi Surat Tugas v1.0
          </p>
        </div>
      </footer>
    </>
  );
}
