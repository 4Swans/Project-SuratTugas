"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  PlusCircle,
  Users,
  Award,
  ShieldCheck,
  Menu,
  X,
  LogIn,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const baseNavLinks = [
    { href: "/", label: "Dashboard", icon: FileText },
    { href: "/master-data/pegawai", label: "Data Pegawai", icon: Users },
    { href: "/master-data/pejabat", label: "Pejabat", icon: Award },
  ];

  const navLinks = isAdmin
    ? [
        ...baseNavLinks,
        { href: "/manajemen-user", label: "Manajemen User", icon: ShieldCheck },
      ]
    : baseNavLinks;

  const getRoleBadge = (role?: string) => {
    switch (role?.toLowerCase()) {
      case "superadmin":
      case "admin":
        return {
          bg: "bg-purple-100",
          text: "text-purple-700",
          border: "border-purple-200",
          label: "Superadmin",
          avatarBg: "bg-purple-600 text-white",
        };
      case "staff_tu":
      default:
        return {
          bg: "bg-emerald-100",
          text: "text-emerald-700",
          border: "border-emerald-200",
          label: "Staff TU",
          avatarBg: "bg-emerald-600 text-white",
        };
    }
  };

  const roleStyle = getRoleBadge(user?.role);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Agency Info */}
          <Link
            href="/"
            className="flex items-center gap-2.5 sm:gap-3 shrink-0 py-1 rounded-lg focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:outline-none group"
            aria-label="Kembali ke Beranda Sistem Surat Tugas"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-komdigi-horizontal.png"
              alt="Kementerian Komunikasi dan Digital Republik Indonesia"
              className="h-7 sm:h-8 md:h-9 w-auto object-contain transition-transform group-hover:scale-[1.02]"
              loading="eager"
            />
            <div className="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>
            <div className="flex flex-col">
              <span className="font-bold text-xs sm:text-[13px] tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                Surat Tugas
              </span>
              <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap hidden lg:block leading-none">
                Pusat Kebijakan Strategis
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 shrink-0" aria-label="Navigasi Utama">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[1.8] shrink-0" aria-hidden="true" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons & User Menu */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            {/* CTA Button: Buat Surat Baru */}
            <Link
              href="/surat-tugas/baru"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold min-h-[36px] px-3.5 py-1.5 rounded-lg shadow-xs transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
            >
              <PlusCircle className="w-4 h-4 stroke-[2]" aria-hidden="true" />
              <span>Buat Surat</span>
            </Link>

            {/* User Profile Dropdown */}
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 outline-none cursor-pointer"
                  aria-expanded={userDropdownOpen}
                >
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs uppercase shrink-0 ${roleStyle.avatarBg}`}
                  >
                    {user.nama.slice(0, 2)}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[110px]">
                      {user.nama}
                    </p>
                    <span
                      className={`inline-block text-[9px] font-bold px-1.5 py-0 rounded border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                    >
                      {roleStyle.label}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {/* Dropdown Menu Popup */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-50 animate-in fade-in duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-[11px] text-slate-500">Masuk sebagai:</p>
                      <p className="text-sm font-bold text-slate-900 truncate">{user.nama}</p>
                      <p className="text-xs text-slate-500">@{user.username}</p>
                      <div className="mt-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                        >
                          {roleStyle.label}
                        </span>
                      </div>
                    </div>

                    <div className="p-1 space-y-0.5">
                      {isAdmin && (
                        <Link
                          href="/manajemen-user"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                          <span>Manajemen Pengguna</span>
                        </Link>
                      )}

                      <Link
                        href="/login"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <LogIn className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Ganti Akun</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>Keluar (Logout)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors"
              >
                <LogIn className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Masuk</span>
              </Link>
            )}
          </div>

          {/* Mobile menu toggle button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-label={mobileMenuOpen ? "Tutup Menu Navigasi" : "Buka Menu Navigasi"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 stroke-[1.8]" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5 stroke-[1.8]" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-md">
          {isAuthenticated && user && (
            <div className="p-3 mb-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs uppercase shrink-0 ${roleStyle.avatarBg}`}
                >
                  {user.nama.slice(0, 2)}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 truncate max-w-[160px]">{user.nama}</p>
                  <p className="text-[11px] text-slate-500">@{user.username}</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
              >
                {roleStyle.label}
              </span>
            </div>
          )}

          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="w-4 h-4 stroke-[1.8] shrink-0" aria-hidden="true" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <Link
              href="/surat-tugas/baru"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4 stroke-[2]" aria-hidden="true" />
              <span>Buat Surat Tugas Baru</span>
            </Link>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar (Logout)</span>
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-semibold py-2 rounded-lg text-xs transition-colors"
              >
                <LogIn className="w-4 h-4 text-blue-600" />
                <span>Masuk ke Akun</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
