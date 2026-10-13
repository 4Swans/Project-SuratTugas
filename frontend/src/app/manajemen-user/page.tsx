"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  FileText,
  KeyRound,
  X,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getUserList,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
  getRoleList,
} from "@/lib/api";
import { User, RoleInfo, UserCreatePayload, UserUpdatePayload } from "@/types";

export default function ManajemenUserPage() {
  const { user: currentUser, isAdmin, isAuthenticated, isLoading: authLoading } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");

  // Notifications
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected User for Actions
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form States
  const [addForm, setAddForm] = useState<UserCreatePayload>({
    username: "",
    nama: "",
    password: "",
    role: "staff_tu",
  });
  const [editForm, setEditForm] = useState<UserUpdatePayload>({
    username: "",
    nama: "",
    password: "",
    role: "staff_tu",
  });
  const [newTargetRole, setNewTargetRole] = useState<string>("staff_tu");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsersData = async () => {
    setIsLoading(true);
    try {
      const [userList, roleList] = await Promise.all([
        getUserList(),
        getRoleList().catch(() => []),
      ]);
      setUsers(userList);
      if (roleList && roleList.length > 0) {
        setRoles(roleList);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data pengguna.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchUsersData();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, isAdmin]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole =
        selectedRoleFilter === "all" ||
        u.role.toLowerCase() === selectedRoleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, selectedRoleFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const superadminCount = users.filter(
      (u) => u.role.toLowerCase() === "superadmin" || u.role.toLowerCase() === "admin"
    ).length;
    const staffTuCount = users.filter(
      (u) => u.role.toLowerCase() === "staff_tu" || u.role.toLowerCase() === "staff"
    ).length;
    return { total, superadminCount, staffTuCount };
  }, [users]);

  // Auto-dismiss feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // HANDLER: Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.nama.trim() || !addForm.username.trim() || !addForm.password) {
      setFeedback({ type: "error", message: "Harap isi semua kolom wajib." });
      return;
    }
    setIsSubmitting(true);
    try {
      await createUser(addForm);
      setFeedback({
        type: "success",
        message: `Pengguna '${addForm.username}' dengan role ${addForm.role.toUpperCase()} berhasil ditambahkan!`,
      });
      setIsAddModalOpen(false);
      setAddForm({ username: "", nama: "", password: "", role: "staff_tu" });
      await fetchUsersData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan pengguna.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // HANDLER: Edit User
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await updateUser(selectedUser.id, editForm);
      setFeedback({
        type: "success",
        message: `Profil pengguna '${editForm.username || selectedUser.username}' berhasil diperbarui!`,
      });
      setIsEditModalOpen(false);
      setSelectedUser(null);
      await fetchUsersData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui pengguna.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // HANDLER: Quick / Modal Change Role
  const handleQuickChangeRole = async (targetUser: User, role: string) => {
    if (targetUser.role === role) return;
    try {
      await updateUserRole(targetUser.id, role);
      setFeedback({
        type: "success",
        message: `Role pengguna '${targetUser.nama}' berhasil diubah menjadi ${role === "superadmin" ? "SUPERADMIN" : "STAFF TU"}!`,
      });
      await fetchUsersData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah role akses.";
      setFeedback({ type: "error", message: msg });
    }
  };

  const handleModalSubmitChangeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await updateUserRole(selectedUser.id, newTargetRole);
      setFeedback({
        type: "success",
        message: `Role hak akses '${selectedUser.nama}' berhasil diubah ke ${newTargetRole === "superadmin" ? "SUPERADMIN" : "STAFF TU"}!`,
      });
      setIsRoleModalOpen(false);
      setSelectedUser(null);
      await fetchUsersData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah role akses.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // HANDLER: Delete User
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await deleteUser(selectedUser.id);
      setFeedback({
        type: "success",
        message: `Pengguna '${selectedUser.username}' berhasil dihapus dari sistem.`,
      });
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      await fetchUsersData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus pengguna.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (u: User) => {
    setSelectedUser(u);
    setEditForm({
      nama: u.nama,
      username: u.username,
      role: u.role,
      password: "",
    });
    setIsEditModalOpen(true);
  };

  // Open Role Modal
  const openRoleModal = (u: User) => {
    setSelectedUser(u);
    setNewTargetRole(u.role);
    setIsRoleModalOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (u: User) => {
    setSelectedUser(u);
    setIsDeleteModalOpen(true);
  };

  // Helper Badge Color
  const getRoleBadge = (role: string) => {
    const r = role.toLowerCase();
    if (r === "superadmin" || r === "admin") {
      return {
        bg: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-200",
        dot: "bg-purple-500",
        label: "Superadmin",
      };
    }
    return {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
      label: "Staff TU",
    };
  };

  // If user not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
          <KeyRound className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#0F172A] mb-2">Autentikasi Diperlukan</h2>
        <p className="text-sm text-[#64748B] max-w-md mb-6">
          Anda harus masuk terlebih dahulu untuk mengakses fitur Manajemen Pengguna dan Hak Akses.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition-colors shadow-sm"
        >
          <span>Masuk ke Akun Anda</span>
        </Link>
      </div>
    );
  }

  // If user is authenticated but not superadmin
  if (!authLoading && isAuthenticated && !isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#0F172A] mb-2">Akses Terbatas: Superadmin Saja</h2>
        <p className="text-sm text-[#64748B] max-w-md mb-4">
          Akun Anda saat ini memiliki peran{" "}
          <span className="font-bold uppercase text-[#0F172A]">Staff TU</span>. Halaman
          manajemen pengguna dan pengubahan hak akses hanya dapat dibuka oleh akun Superadmin.
        </p>
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-[#475569] text-sm font-semibold hover:bg-[#F8FAFC]"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border shadow-xl flex items-center space-x-3 animate-in slide-in-from-bottom-5 duration-300 max-w-md ${
            feedback.type === "success"
              ? "bg-white border-emerald-300 text-emerald-800"
              : "bg-white border-rose-300 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 stroke-[2]" />
            </div>
          )}
          <div className="flex-1 text-xs sm:text-sm font-medium">{feedback.message}</div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 stroke-[2]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
              Manajemen Pengguna & Hak Akses
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Kelola akun petugas, tetapkan peran akses (Superadmin dan Staff TU), dan perizinan sistem.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchUsersData}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white font-semibold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pengguna</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#64748B] font-medium">Total Akun</p>
            <p className="text-xl font-bold text-[#0F172A]">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#64748B] font-medium">Superadmin (Akses Penuh)</p>
            <p className="text-xl font-bold text-purple-700">{stats.superadminCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#64748B] font-medium">Staff TU (Operasional)</p>
            <p className="text-xl font-bold text-emerald-700">{stats.staffTuCount}</p>
          </div>
        </div>
      </div>

      {/* Role Explanation Card */}
      <div className="bg-gradient-to-r from-purple-50/50 via-slate-50 to-emerald-50/50 rounded-2xl border border-purple-200/60 p-4 sm:p-5">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                Hak Akses Peran Pengguna (Role-Based Access Control)
              </h3>
              <span className="text-[11px] text-[#64748B] bg-white/80 px-2.5 py-0.5 rounded-full border border-slate-200 font-medium">
                2 Peran Resmi
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="bg-white/90 rounded-xl p-3.5 border border-purple-200/80 shadow-xs">
                <div className="flex items-center space-x-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                  <span className="font-bold text-xs text-purple-900">Superadmin (`superadmin`)</span>
                </div>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Akses penuh ke seluruh sistem: manajemen pengguna, ubah role akses akun lain, master data pegawai & pejabat, buat surat tugas, dan sinkronisasi Google Sheets.
                </p>
              </div>

              <div className="bg-white/90 rounded-xl p-3.5 border border-emerald-200/80 shadow-xs">
                <div className="flex items-center space-x-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span className="font-bold text-xs text-emerald-900">Staff TU (`staff_tu`)</span>
                </div>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Akses operasional: membuat surat tugas, ekstraksi undangan AI, kelola pegawai & pejabat, sinkronisasi Google Sheets, dan unduh dokumen resmi (DOCX/PDF).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E2E8F0]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pengguna atau username..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:bg-white focus:border-[#2563EB] outline-none text-[#0F172A]"
          />
        </div>

        <div className="flex items-center space-x-1.5">
          <Filter className="w-3.5 h-3.5 text-[#64748B] mr-1 hidden sm:inline" />
          {[
            { id: "all", label: "Semua Role" },
            { id: "superadmin", label: "Superadmin" },
            { id: "staff_tu", label: "Staff TU" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedRoleFilter(pill.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedRoleFilter === pill.id
                  ? "bg-[#2563EB] text-white"
                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A]"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                <th className="py-3.5 px-4 sm:px-6">Pengguna</th>
                <th className="py-3.5 px-4">Role Akses</th>
                <th className="py-3.5 px-4">Ubah Role Langsung</th>
                <th className="py-3.5 px-4 text-right pr-6">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs sm:text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-[#64748B]">
                    <div className="inline-flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                      <span>Memuat data pengguna...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[#64748B]">
                    <Users className="w-8 h-8 mx-auto text-[#CBD5E1] mb-2" />
                    <p className="font-semibold text-[#0F172A]">Tidak ada pengguna yang sesuai</p>
                    <p className="text-xs text-[#94A3B8]">Coba sesuaikan kata kunci pencarian atau filter role.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const badge = getRoleBadge(u.role);
                  const isCurrent = currentUser?.id === u.id;
                  const isSuperadminUser = u.role.toLowerCase() === "superadmin" || u.role.toLowerCase() === "admin";

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-[#F8FAFC]/80 transition-colors group"
                    >
                      {/* Column 1: User Profile */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 ${
                              isSuperadminUser
                                ? "bg-purple-100 text-purple-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {u.nama.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-[#0F172A]">{u.nama}</span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                  Akun Anda
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-[#64748B]">@{u.username}</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Column 3: Quick Role Switcher */}
                      <td className="py-3.5 px-4">
                        <select
                          value={isSuperadminUser ? "superadmin" : "staff_tu"}
                          onChange={(e) => handleQuickChangeRole(u, e.target.value)}
                          disabled={isCurrent && isSuperadminUser && stats.superadminCount <= 1}
                          className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-xs font-medium text-[#0F172A] focus:bg-white focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none cursor-pointer transition-all hover:border-[#94A3B8]"
                          title="Pilih role baru untuk mengubah langsung hak akses pengguna"
                        >
                          <option value="superadmin">Superadmin</option>
                          <option value="staff_tu">Staff TU</option>
                        </select>
                      </td>

                      {/* Column 4: Actions */}
                      <td className="py-3.5 px-4 text-right pr-6">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-2 rounded-lg text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                            title="Edit data & reset password"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openRoleModal(u)}
                            className="p-2 rounded-lg text-[#64748B] hover:text-purple-600 hover:bg-purple-50 transition-colors"
                            title="Ubah Role Akses"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openDeleteModal(u)}
                            disabled={isCurrent}
                            className={`p-2 rounded-lg transition-colors ${
                              isCurrent
                                ? "text-slate-300 cursor-not-allowed"
                                : "text-[#64748B] hover:text-rose-600 hover:bg-rose-50"
                            }`}
                            title={isCurrent ? "Tidak dapat menghapus akun sendiri" : "Hapus pengguna"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL 1: TAMBAH PENGGUNA ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-[#0F172A]">Tambah Pengguna Baru</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#475569] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.nama}
                  onChange={(e) => setAddForm({ ...addForm, nama: e.target.value })}
                  placeholder="Contoh: Rilla Rahmawati"
                  className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl focus:bg-white focus:border-[#2563EB] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1">
                  Username Akun *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value.toLowerCase().trim() })}
                  placeholder="Contoh: rilla_pusaka"
                  className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl focus:bg-white focus:border-[#2563EB] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1">
                  Password Awal *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-3.5 pr-10 py-2 text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl focus:bg-white focus:border-[#2563EB] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1.5">
                  Tetapkan Role Akses *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "superadmin", label: "Superadmin", desc: "Akses Penuh Sistem" },
                    { id: "staff_tu", label: "Staff TU", desc: "Operasional Tata Usaha" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setAddForm({ ...addForm, role: r.id })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        addForm.role === r.id
                          ? "bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20"
                          : "bg-[#F8FAFC] border-[#E2E8F0] hover:bg-white"
                      }`}
                    >
                      <span className="block font-bold text-xs text-[#0F172A]">{r.label}</span>
                      <span className="block text-[10px] text-[#64748B]">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] rounded-xl hover:bg-[#F1F5F9]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Simpan Pengguna</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: EDIT PENGGUNA ================= */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-[#0F172A]">Edit Data Pengguna</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#475569] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nama || ""}
                  onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl focus:bg-white focus:border-[#2563EB] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={editForm.username || ""}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase().trim() })}
                  className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl focus:bg-white focus:border-[#2563EB] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1">
                  Password Baru (Kosongkan jika tidak diubah)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    minLength={6}
                    value={editForm.password || ""}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Kosongkan jika tetap"
                    className="w-full pl-3.5 pr-10 py-2 text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl focus:bg-white focus:border-[#2563EB] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1.5">
                  Role Akses
                </label>
                <select
                  value={editForm.role || selectedUser.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl focus:bg-white focus:border-[#2563EB] outline-none"
                >
                  <option value="superadmin">Superadmin</option>
                  <option value="staff_tu">Staff TU</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] rounded-xl hover:bg-[#F1F5F9]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: UBAH ROLE & HAK AKSES ================= */}
      {isRoleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0F172A]">Ubah Role Akses Pengguna</h3>
                  <p className="text-xs text-[#64748B]">
                    Pengguna: <span className="font-semibold text-[#0F172A]">{selectedUser.nama}</span> (@{selectedUser.username})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#475569] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmitChangeRole} className="p-5 space-y-4">
              <p className="text-xs text-[#64748B]">
                Pilih peran hak akses baru untuk pengguna ini:
              </p>

              <div className="space-y-2.5">
                {[
                  {
                    id: "superadmin",
                    label: "Superadmin",
                    badge: "Akses Penuh",
                    badgeClass: "bg-purple-100 text-purple-700",
                    borderClass: "border-purple-300",
                    desc: "Dapat mengelola akun pengguna lain, mengubah role, master data pegawai & pejabat, membuat surat tugas, dan sinkronisasi spreadsheet.",
                  },
                  {
                    id: "staff_tu",
                    label: "Staff TU",
                    badge: "Operasional TU",
                    badgeClass: "bg-emerald-100 text-emerald-700",
                    borderClass: "border-emerald-300",
                    desc: "Dapat membuat surat tugas baru, menggunakan AI ekstraksi undangan, memperbarui data pegawai & pejabat, sinkronisasi Google Sheets, dan unduh dokumen.",
                  },
                ].map((item) => (
                  <label
                    key={item.id}
                    onClick={() => setNewTargetRole(item.id)}
                    className={`block p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                      newTargetRole === item.id
                        ? `${item.borderClass} bg-slate-50/80 shadow-xs`
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="target_role"
                          checked={newTargetRole === item.id}
                          onChange={() => setNewTargetRole(item.id)}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="font-bold text-sm text-[#0F172A]">{item.label}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${item.badgeClass}`}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] pl-6">{item.desc}</p>
                  </label>
                ))}
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] rounded-xl hover:bg-[#F1F5F9]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Terapkan Role Akses</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: HAPUS PENGGUNA ================= */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-sm w-full overflow-hidden p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#0F172A]">Hapus Akun Pengguna?</h3>
              <p className="text-xs text-[#64748B]">
                Apakah Anda yakin ingin menghapus akun{" "}
                <span className="font-bold text-[#0F172A]">@{selectedUser.username}</span> (
                {selectedUser.nama})? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] rounded-xl hover:bg-[#F1F5F9]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
              >
                {isSubmitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Ya, Hapus Pengguna</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
