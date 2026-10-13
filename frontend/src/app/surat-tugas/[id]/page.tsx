"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Calendar,
  MapPin,
  Users,
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { getSuratTugasDetail, downloadSuratTugasFile } from "@/lib/api";
import { formatPeriodeTanggal, formatTanggalIndonesia } from "@/lib/utils";

export default function SuratTugasDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const suratId = Number(resolvedParams.id);
  const [isDownloading, setIsDownloading] = useState(false);

  const {
    data: surat,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["surat-tugas", suratId],
    queryFn: () => getSuratTugasDetail(suratId),
    enabled: !isNaN(suratId),
  });

  const handleDownload = async () => {
    if (!surat) return;
    try {
      setIsDownloading(true);
      await downloadSuratTugasFile(surat.id);
    } catch (err: any) {
      alert(err.message || "Gagal mengunduh dokumen");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-[#64748B]">Memuat rincian surat tugas...</p>
      </div>
    );
  }

  if (isError || !surat) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-[12px] bg-red-50 text-[#DC2626] flex items-center justify-center mx-auto border border-red-200">
          <AlertTriangle className="w-6 h-6 stroke-[1.8]" />
        </div>
        <h2 className="text-lg font-semibold text-[#0F172A]">Surat Tidak Ditemukan</h2>
        <p className="text-xs text-[#64748B]">
          Surat tugas dengan ID {resolvedParams.id} tidak ditemukan di database.
        </p>
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs text-[#2563EB] hover:underline"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2]" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>
    );
  }

  const pegawaiCount = surat.pegawai_list.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs text-[#64748B] hover:text-[#0F172A] font-medium transition-colors duration-200 min-h-[44px] py-2"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2]" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 sm:p-8 soft-shadow flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-semibold tracking-wider px-2.5 py-0.5 rounded-[6px] bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
              Surat Tugas Resmi
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-[6px] font-semibold ${
                surat.sheets_sync_status === "synced"
                  ? "bg-emerald-50 text-[#16A34A] border border-emerald-200"
                  : surat.sheets_sync_status === "pending"
                  ? "bg-amber-50 text-[#F59E0B] border border-amber-200"
                  : "bg-red-50 text-[#DC2626] border border-red-200"
              }`}
            >
              Sheets: {surat.sheets_sync_status}
            </span>
          </div>

          <h1 className="text-[28px] sm:text-[32px] font-semibold text-[#0F172A] font-mono tracking-tight leading-tight">
            {surat.nomor_surat.nomor_lengkap}
          </h1>

          <p className="text-xs text-[#64748B] flex items-center space-x-3">
            <span>Diterbitkan: {formatTanggalIndonesia(surat.created_at)}</span>
            <span>•</span>
            <span>Dibuat oleh: {surat.nomor_surat.dibuat_oleh || "Staf TU"}</span>
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="inline-flex items-center justify-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] disabled:bg-[#93C5FD] text-white font-semibold px-6 py-2.5 rounded-[8px] min-h-[44px] soft-shadow transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:outline-none cursor-pointer"
        >
          <Download className="w-5 h-5 stroke-[1.8]" />
          <span>{isDownloading ? "Mengunduh..." : "Unduh Dokumen (PDF)"}</span>
        </button>
      </div>

      {/* Detail Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Rincian Kegiatan */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 space-y-4 soft-shadow">
            <h2 className="text-[20px] font-semibold text-[#0F172A]">
              Rincian Penugasan
            </h2>

            <div>
              <span className="text-xs text-[#64748B] font-semibold uppercase tracking-wider">Perihal Acara:</span>
              <p className="text-[#0F172A] font-medium text-base mt-1">
                {surat.perihal}
              </p>
            </div>

            {surat.menimbang && (
              <div className="pt-3 border-t border-[#E2E8F0]">
                <span className="text-xs text-[#64748B] font-semibold uppercase tracking-wider">Menimbang:</span>
                <p className="text-[#0F172A] text-xs sm:text-sm mt-1 leading-relaxed text-justify">
                  {surat.menimbang}
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-[#E2E8F0]">
              <span className="text-xs text-[#64748B] font-semibold uppercase tracking-wider">Dasar Surat:</span>
              <p className="text-[#0F172A] text-xs sm:text-sm mt-1 leading-relaxed">
                {surat.dasar_surat}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E2E8F0] text-xs sm:text-sm">
              <div>
                <span className="text-[#64748B] font-semibold uppercase tracking-wider text-xs">Tanggal Pelaksanaan:</span>
                <p className="text-[#0F172A] font-medium mt-1 flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-[#2563EB] stroke-[1.8]" />
                  <span>
                    {formatPeriodeTanggal(surat.tanggal_mulai, surat.tanggal_selesai)}
                  </span>
                </p>
              </div>

              <div>
                <span className="text-[#64748B] font-semibold uppercase tracking-wider text-xs">Lokasi Kegiatan:</span>
                <p className="text-[#0F172A] font-medium mt-1 flex items-start space-x-1.5">
                  <MapPin className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5 stroke-[1.8]" />
                  <span>{surat.lokasi}</span>
                </p>
              </div>
            </div>

            {(surat.topik || surat.konseptor) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E2E8F0] text-xs sm:text-sm">
                {surat.topik && (
                  <div>
                    <span className="text-[#64748B] font-semibold uppercase tracking-wider text-xs">Tim Pengusul (Topik Tim):</span>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
                        {surat.topik}
                      </span>
                    </div>
                  </div>
                )}
                {surat.konseptor && (
                  <div>
                    <span className="text-[#64748B] font-semibold uppercase tracking-wider text-xs">Konseptor:</span>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {surat.konseptor}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pegawai List Table */}
          <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 space-y-4 soft-shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-semibold text-[#0F172A] flex items-center space-x-2">
                <Users className="w-5 h-5 text-[#2563EB] stroke-[1.8]" />
                <span>Pegawai Ditugaskan ({pegawaiCount})</span>
              </h2>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-[6px] ${
                  pegawaiCount > 3
                    ? "bg-amber-50 text-[#F59E0B] border border-amber-200"
                    : "bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]"
                }`}
              >
                {pegawaiCount > 3 ? "Lampiran Tabel" : "Badan Surat"}
              </span>
            </div>

            <div className="border border-[#E2E8F0] rounded-[8px] overflow-hidden divide-y divide-[#E2E8F0]">
              {surat.pegawai_list.map((p, idx) => (
                <div key={p.id} className="p-3.5 flex items-start space-x-3 text-xs sm:text-sm">
                  <span className="font-bold text-[#64748B] w-5 text-center mt-0.5">
                    {idx + 1}.
                  </span>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-[#0F172A]">
                        {p.nama_lengkap_display || p.nama}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] font-mono">
                        {p.pangkat_golongan_display || p.golongan || "PJLP"}
                      </span>
                    </div>
                    <div className="text-xs text-[#64748B]">
                      NIP. {p.nip} • {p.jabatan}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Pejabat Penandatangan */}
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 space-y-4 soft-shadow">
            <h2 className="text-[20px] font-semibold text-[#0F172A] flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-[#2563EB] stroke-[1.8]" />
              <span>Penandatangan</span>
            </h2>

            <div className="p-4 rounded-[8px] bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-xs sm:text-sm">
              <div className="font-semibold text-[#0F172A] text-base">
                {surat.penandatangan?.nama}
              </div>
              <div className="text-xs text-[#2563EB] font-medium">
                {surat.penandatangan?.jabatan}
              </div>
              <div className="text-[11px] text-[#64748B] pt-2 border-t border-[#E2E8F0]">
                NIP. {surat.penandatangan?.nip}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
