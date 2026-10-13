"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  PlusCircle,
  Download,
  Calendar,
  MapPin,
  Users,
  Search,
  RefreshCw,
  Clock,
  Sparkles,
  ExternalLink,
  FileCheck2,
} from "lucide-react";
import {
  getSuratTugasList,
  previewNomorSurat,
  getPegawaiList,
  getSheetsSyncStatus,
  retrySheetsSync,
  downloadSuratTugasFile,
} from "@/lib/api";
import { formatPeriodeTanggal } from "@/lib/utils";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownload = async (suratId: number) => {
    try {
      setDownloadingId(suratId);
      await downloadSuratTugasFile(suratId);
    } catch (err: any) {
      alert(err.message || "Gagal mengunduh dokumen");
    } finally {
      setDownloadingId(null);
    }
  };

  const { data: suratList = [], isLoading: isLoadingSurat } = useQuery({
    queryKey: ["surat-tugas"],
    queryFn: getSuratTugasList,
  });

  const { data: nomorPreview } = useQuery({
    queryKey: ["nomor-surat-preview"],
    queryFn: previewNomorSurat,
  });

  const { data: pegawaiList = [] } = useQuery({
    queryKey: ["pegawai"],
    queryFn: () => getPegawaiList(),
  });

  const { data: syncStatus } = useQuery({
    queryKey: ["sheets-sync-status"],
    queryFn: getSheetsSyncStatus,
  });

  const retryMutation = useMutation({
    mutationFn: retrySheetsSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sheets-sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["surat-tugas"] });
    },
  });

  // Filtered surat
  const filteredSurat = suratList.filter((s) => {
    const term = searchTerm.toLowerCase();
    const nomor = s.nomor_surat.nomor_lengkap.toLowerCase();
    const perihal = s.perihal.toLowerCase();
    const lokasi = s.lokasi.toLowerCase();
    const penandatangan = s.penandatangan?.nama?.toLowerCase() || "";
    return (
      nomor.includes(term) ||
      perihal.includes(term) ||
      lokasi.includes(term) ||
      penandatangan.includes(term)
    );
  });

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome Card */}
      <section
        aria-label="Informasi Sistem"
        className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 sm:p-8 soft-shadow relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-[6px] bg-[#EFF6FF] border border-[#DBEAFE] text-xs font-semibold text-[#2563EB]">
              <Sparkles className="w-3.5 h-3.5 stroke-[2]" aria-hidden="true" />
              <span>Sistem Otomatisasi Terintegrasi AI</span>
            </div>
            <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-[#0F172A] leading-tight">
              Sistem Surat Tugas Elektronik
            </h1>
            <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
              Buat surat tugas resmi Pusat Kebijakan Strategis Komdigi dengan penomoran
              transaksional instan, dan ekstraksi data undangan otomatis.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/surat-tugas/baru"
              className="inline-flex items-center justify-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white font-semibold min-h-[44px] px-5 py-2.5 rounded-[8px] soft-shadow transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:outline-none"
            >
              <PlusCircle className="w-4 h-4 stroke-[2]" aria-hidden="true" />
              <span>Buat Surat Tugas Baru</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Metric Cards Grid */}
      <section aria-label="Ringkasan Statistik" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Surat */}
        <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-5 soft-shadow transition-all duration-200 hover:border-[#DBEAFE]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Total Surat Terbit
            </span>
            <div className="w-8 h-8 rounded-[8px] bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center" aria-hidden="true">
              <FileText className="w-4 h-4 stroke-[1.8]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
              {suratList.length}
            </span>
            <span className="text-xs text-[#64748B] font-medium">dokumen</span>
          </div>
        </div>

        {/* Card 2: Nomor Surat Terakhir / Preview */}
        <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-5 soft-shadow transition-all duration-200 hover:border-[#DBEAFE]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Nomor Urut Berikutnya
            </span>
            <div className="w-8 h-8 rounded-[8px] bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center" aria-hidden="true">
              <Clock className="w-4 h-4 stroke-[1.8]" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-sm sm:text-base font-semibold text-[#2563EB] font-mono tracking-tight block truncate">
              {nomorPreview?.nomor_lengkap || "Memuat..."}
            </span>
            <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
              <span className="text-xs text-[#64748B]">
                Urut #{nomorPreview?.nomor_urut || 1}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
                Terakhir: #{nomorPreview?.latest_nomor_urut || 883}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Pegawai */}
        <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-5 soft-shadow transition-all duration-200 hover:border-[#DBEAFE]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Database Pegawai
            </span>
            <div className="w-8 h-8 rounded-[8px] bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center" aria-hidden="true">
              <Users className="w-4 h-4 stroke-[1.8]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
              {pegawaiList.length}
            </span>
            <span className="text-xs text-[#64748B] font-medium">pegawai terdata</span>
          </div>
        </div>

        {/* Card 4: Status Sinkronisasi Sheets */}
        <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-5 soft-shadow transition-all duration-200 hover:border-[#DBEAFE]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Google Spreadsheet
              </span>
              <a
                href={syncStatus?.sheet_url || "https://docs.google.com/spreadsheets/d/1E3pMrc5I8QQEtIicvoGtHJQEFXB9nm8OfTqeVQHu2TM/edit?gid=599707024#gid=599707024"}
                target="_blank"
                rel="noreferrer"
                title="Buka Spreadsheet di Tab Baru"
                className="text-[#64748B] hover:text-[#2563EB] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <button
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              aria-label="Sinkronisasi Ulang Google Sheets"
              title="Sinkronkan data dengan spreadsheet"
              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-[8px] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#EFF6FF] text-[#64748B] hover:text-[#2563EB] transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 stroke-[1.8] ${
                  retryMutation.isPending ? "animate-spin text-[#2563EB]" : ""
                }`}
                aria-hidden="true"
              />
            </button>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex items-center space-x-2">
              {syncStatus?.apps_script_url_configured ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-xs font-semibold bg-emerald-50 text-[#16A34A] border border-emerald-200">
                  Apps Script Aktif
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-xs font-medium bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
                  Register_2026 (gid=599707024)
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#64748B] truncate" title={syncStatus?.connection_message || "Tersinkron dengan nomor register 883"}>
              {syncStatus?.connection_message || "Tersinkron dengan register terakhir (#883)"}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content: Table of Surat Tugas */}
      <section
        aria-label="Tabel Riwayat Surat Tugas"
        className="bg-white border border-[#E2E8F0] rounded-[12px] soft-shadow overflow-hidden"
      >
        {/* Table Header & Search */}
        <div className="p-5 sm:p-6 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-semibold text-[#0F172A] flex items-center space-x-2">
              <FileCheck2 className="w-5 h-5 text-[#2563EB] stroke-[1.8]" aria-hidden="true" />
              <span>Daftar Riwayat Surat Tugas</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1">
              Semua surat tugas resmi yang telah diterbitkan dan tersimpan di database
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] stroke-[1.8]" aria-hidden="true" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nomor, perihal, lokasi..."
              aria-label="Pencarian Surat Tugas"
              className="w-full min-h-[44px] pl-10 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-[8px] text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors duration-200"
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          {isLoadingSurat ? (
            <div className="py-20 text-center space-y-3" role="status">
              <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-[#64748B] font-medium">Memuat riwayat surat tugas...</p>
            </div>
          ) : filteredSurat.length === 0 ? (
            <div className="py-16 text-center space-y-4 max-w-md mx-auto px-4">
              <div className="w-14 h-14 rounded-[12px] bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center mx-auto text-[#2563EB]">
                <FileText className="w-7 h-7 stroke-[1.8]" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#0F172A]">
                  {searchTerm
                    ? "Tidak ada surat yang cocok dengan pencarian"
                    : "Belum Ada Surat Tugas"}
                </h3>
                <p className="text-xs sm:text-sm text-[#64748B]">
                  {searchTerm
                    ? "Coba gunakan kata kunci pencarian yang lain."
                    : "Mulai pembuatan surat tugas baru dengan upload dokumen undangan atau input data acara."}
                </p>
              </div>
              {!searchTerm && (
                <Link
                  href="/surat-tugas/baru"
                  className="inline-flex items-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold min-h-[44px] px-5 py-2.5 rounded-[8px] soft-shadow transition-colors duration-200"
                >
                  <PlusCircle className="w-4 h-4 stroke-[2]" aria-hidden="true" />
                  <span>Buat Surat Pertama</span>
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] uppercase tracking-wider font-semibold text-[#64748B]">
                  <th scope="col" className="py-3 px-4">Nomor Surat</th>
                  <th scope="col" className="py-3 px-4">Perihal & Lokasi</th>
                  <th scope="col" className="py-3 px-4">Tanggal Kegiatan</th>
                  <th scope="col" className="py-3 px-4">Pegawai Ditugaskan</th>
                  <th scope="col" className="py-3 px-4">Penandatangan</th>
                  <th scope="col" className="py-3 px-4 text-center">Aksi Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredSurat.map((surat) => {
                  const pegawaiCount = surat.pegawai_list.length;
                  return (
                    <tr
                      key={surat.id}
                      className="hover:bg-[#F8FAFC] transition-colors duration-150 group"
                    >
                      {/* Nomor Surat */}
                      <td className="py-4 px-4 font-mono font-semibold text-[#2563EB] whitespace-nowrap">
                        <Link
                          href={`/surat-tugas/${surat.id}`}
                          className="hover:underline flex items-center space-x-1.5 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:outline-none rounded-[6px] py-1"
                        >
                          <span>{surat.nomor_surat.nomor_lengkap}</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                        </Link>
                      </td>

                      {/* Perihal & Lokasi */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-semibold text-[#0F172A] truncate" title={surat.perihal}>
                          {surat.perihal}
                        </div>
                        <div className="flex items-center space-x-1 text-[#64748B] text-xs mt-1 truncate" title={surat.lokasi}>
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-[#64748B] stroke-[1.8]" aria-hidden="true" />
                          <span className="truncate">{surat.lokasi}</span>
                        </div>
                        {surat.konseptor && (
                          <div className="text-[11px] text-emerald-700 font-medium mt-1 truncate">
                            Konseptor: <span className="font-semibold">{surat.konseptor}</span>
                          </div>
                        )}
                      </td>

                      {/* Tanggal Kegiatan */}
                      <td className="py-4 px-4 whitespace-nowrap text-[#0F172A]">
                        <div className="flex items-center space-x-1.5 font-medium text-xs sm:text-sm">
                          <Calendar className="w-3.5 h-3.5 text-[#64748B] stroke-[1.8]" aria-hidden="true" />
                          <span>
                            {formatPeriodeTanggal(
                              surat.tanggal_mulai,
                              surat.tanggal_selesai
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Pegawai */}
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-[6px] text-xs font-semibold ${
                              pegawaiCount > 3
                                ? "bg-amber-50 text-[#F59E0B] border border-amber-200"
                                : "bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]"
                            }`}
                          >
                            {pegawaiCount} Pegawai
                          </span>
                          {pegawaiCount > 3 && (
                            <span className="text-[11px] text-[#64748B] font-medium">
                              (Lampiran)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#64748B] mt-1 truncate max-w-[200px]" title={surat.pegawai_list.map((p) => p.nama).join(", ")}>
                          {surat.pegawai_list.map((p) => p.nama).join(", ")}
                        </div>
                      </td>

                      {/* Penandatangan */}
                      <td className="py-4 px-4 whitespace-nowrap text-[#0F172A]">
                        <div className="font-semibold text-xs sm:text-sm text-[#0F172A]">
                          {surat.penandatangan?.nama}
                        </div>
                        <div className="text-xs text-[#64748B] mt-0.5">
                          {surat.penandatangan?.jabatan}
                        </div>
                      </td>

                      {/* Aksi Unduh */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDownload(surat.id)}
                          disabled={downloadingId === surat.id}
                          aria-label={`Unduh file PDF untuk surat ${surat.nomor_surat.nomor_lengkap}`}
                          className="inline-flex items-center justify-center space-x-1.5 bg-[#EFF6FF] hover:bg-[#DBEAFE] disabled:bg-[#F1F5F9] text-[#2563EB] disabled:text-[#94A3B8] border border-[#DBEAFE] min-h-[44px] px-3.5 py-2 rounded-[8px] text-xs font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:outline-none cursor-pointer"
                        >
                          <Download className="w-4 h-4 stroke-[1.8]" aria-hidden="true" />
                          <span>{downloadingId === surat.id ? "Unduh..." : ".PDF"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
