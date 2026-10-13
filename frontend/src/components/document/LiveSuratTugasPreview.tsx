"use client";

import { useState } from "react";
import { Pegawai, Pejabat } from "@/types";
import { formatTanggalIndonesia, formatPeriodeTanggal } from "@/lib/utils";
import {
  FileText,
  Maximize2,
  ZoomIn,
  ZoomOut,
  EyeOff,
  X,
  Printer,
} from "lucide-react";

interface LiveSuratTugasPreviewProps {
  formData: {
    menimbang?: string;
    perihal: string;
    dasar_surat: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
    lokasi: string;
    topik?: string;
    konseptor?: string;
  };
  selectedPegawai: Pegawai[];
  selectedPejabat?: Pejabat | null;
  nomorSuratPreview?: string;
  activeField?: string | null;
  onTogglePreview?: () => void;
  showToggleBtn?: boolean;
}

export function LiveSuratTugasPreview({
  formData,
  selectedPegawai,
  selectedPejabat,
  nomorSuratPreview,
  activeField,
  onTogglePreview,
  showToggleBtn = true,
}: LiveSuratTugasPreviewProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [activePage, setActivePage] = useState<1 | 2>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const pegawaiCount = selectedPegawai.length;
  const isMultiLampiran = pegawaiCount > 3;

  const todayStr = formatTanggalIndonesia(new Date().toISOString().split("T")[0]);
  const periodeStr =
    formData.tanggal_mulai && formData.tanggal_selesai
      ? formatPeriodeTanggal(formData.tanggal_mulai, formData.tanggal_selesai)
      : formData.tanggal_mulai
      ? formatTanggalIndonesia(formData.tanggal_mulai)
      : "[Tanggal Kegiatan]";

  const defaultMenimbang =
    "bahwa dalam rangka mendukung pelaksanaan tugas dan fungsi Pusat Kebijakan Strategis serta menindaklanjuti undangan yang diterima, perlu menugaskan pegawai untuk mengikuti kegiatan dimaksud.";
  const menimbangText = formData.menimbang?.trim() || defaultMenimbang;

  const lokasiText = formData.lokasi?.trim() ? formData.lokasi.trim().replace(/\.+$/, "") : "[Lokasi Kegiatan]";
  const perihalText = formData.perihal?.trim() ? formData.perihal.trim().replace(/\.+$/, "") : "[Nama Kegiatan / Perihal]";
  const dasarText = formData.dasar_surat?.trim() ? formData.dasar_surat.trim().replace(/\.+$/, "") + "." : "Undangan Kementerian Komunikasi dan Digital RI.";

  const untukText =
    perihalText.toLowerCase().startsWith("mengikuti") || perihalText.toLowerCase().startsWith("menghadiri")
      ? `${perihalText} yang dilaksanakan pada ${periodeStr} di ${lokasiText}.`
      : `Mengikuti kegiatan ${perihalText} yang dilaksanakan pada ${periodeStr} di ${lokasiText}.`;

  const tahunAnggaran = formData.tanggal_mulai
    ? new Date(formData.tanggal_mulai).getFullYear()
    : new Date().getFullYear();

  const nomorDisplay = nomorSuratPreview || ".../SJ.9/KP.01.06/09/2026";
  const pejabatNama = selectedPejabat?.nama_lengkap_display || selectedPejabat?.nama || "Oki Suryowahono, S.T., M.T.";
  const pejabatJabatan = selectedPejabat?.jabatan?.replace(/,+$/, "") || "Kepala Pusat Kebijakan Strategis";

  // Document Page 1 (Badan Surat — 100% Mirroring Naskah Dinas Resmi Komdigi)
  const renderPage1 = () => (
    <div
      className="bg-white text-black shadow-[0_4px_24px_rgba(0,0,0,0.14)] border border-slate-300/80 rounded-[2px] p-8 sm:p-11 w-full max-w-[680px] mx-auto min-h-[960px] text-[11.5px] leading-[1.45] relative flex flex-col justify-between select-text"
      style={{ fontFamily: "'Arial', 'Helvetica', sans-serif" }}
    >
      <div>
        {/* KOP SURAT ASLI (Mirroring Header Word/PDF Komdigi) */}
        <div className="pb-1 relative">
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Logo Resmi Komdigi */}
            <div className="w-[72px] sm:w-[80px] flex-shrink-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-komdigi-kop.png"
                alt="Logo Kementerian Komunikasi dan Digital RI"
                className="w-full h-auto object-contain max-h-[58px]"
                loading="eager"
              />
            </div>
            {/* Teks Kop Resmi */}
            <div className="flex-1 text-left">
              <h1 className="font-bold text-[12.5px] sm:text-[13px] tracking-[0.03em] uppercase leading-tight text-[#334155]">
                Kementerian Komunikasi dan Digital RI
              </h1>
              <h2 className="font-bold text-[11.5px] sm:text-[12px] tracking-[0.02em] uppercase leading-tight text-[#334155] mt-0.5">
                Sekretariat Jenderal
              </h2>
              <h3 className="font-bold text-[11.5px] sm:text-[12px] tracking-[0.02em] uppercase leading-tight text-[#334155] mt-0.5">
                Pusat Kebijakan Strategis
              </h3>
              <p className="text-[9px] sm:text-[9.5px] text-[#475569] mt-1 leading-tight font-normal">
                Jl. Medan Merdeka Barat No. 9, Jakarta 10110 Telp./Fax. (021) 3503735{" "}
                <span className="underline decoration-1">www.komdigi.go.id</span>
              </p>
            </div>
          </div>
          {/* Garis Pembatas Kop Surat Resmi (3pt Stroke Solid Grey Sesuai Dokumen Asli) */}
          <div className="w-full border-b-[2.5px] border-[#4B5563] mt-2 mb-4"></div>
        </div>

        {/* JUDUL SURAT TUGAS */}
        <div className="text-center my-3.5 space-y-0.5">
          <h4 className="font-bold text-[13px] sm:text-[13.5px] tracking-wide text-black uppercase underline decoration-[1.5px] underline-offset-[3px]">
            SURAT TUGAS
          </h4>
          <p className="text-[11px] sm:text-[11.5px] text-black">
            Nomor: <span className="font-normal">{nomorDisplay}</span>
          </p>
        </div>

        {/* BADAN SURAT / TABEL NASKAH DINAS */}
        <div className="space-y-2 mt-4 text-[11px] sm:text-[11.5px] leading-[1.45]">
          {/* Menimbang */}
          <div
            className={`flex items-start transition-all rounded px-1 -mx-1 ${
              activeField === "menimbang"
                ? "bg-blue-50/60 ring-1 ring-blue-300"
                : ""
            }`}
          >
            <div className="w-[88px] sm:w-[95px] flex-shrink-0 text-black">
              Menimbang
            </div>
            <div className="w-[16px] flex-shrink-0 text-center text-black">
              :
            </div>
            <div className="flex-1 text-justify text-black">
              {menimbangText}
            </div>
          </div>

          {/* Dasar */}
          <div
            className={`flex items-start transition-all rounded px-1 -mx-1 ${
              activeField === "dasar_surat"
                ? "bg-blue-50/60 ring-1 ring-blue-300"
                : ""
            }`}
          >
            <div className="w-[88px] sm:w-[95px] flex-shrink-0 text-black">
              Dasar
            </div>
            <div className="w-[16px] flex-shrink-0 text-center text-black">
              :
            </div>
            <div className="flex-1 text-justify text-black">
              {dasarText}
            </div>
          </div>

          {/* Memberi Tugas (Tengah) */}
          <div className="text-center font-bold text-[11.5px] my-3 tracking-[0.05em] text-black">
            MEMBERI TUGAS:
          </div>

          {/* Kepada */}
          <div
            className={`flex items-start transition-all rounded px-1 -mx-1 ${
              activeField === "pegawai"
                ? "bg-blue-50/60 ring-1 ring-blue-300"
                : ""
            }`}
          >
            <div className="w-[88px] sm:w-[95px] flex-shrink-0 text-black">
              Kepada
            </div>
            <div className="w-[16px] flex-shrink-0 text-center text-black">
              :
            </div>
            <div className="flex-1">
              {pegawaiCount === 0 ? (
                <div className="text-slate-400 italic text-[10.5px]">
                  (Belum ada pegawai yang dipilih — silakan pilih pada form)
                </div>
              ) : isMultiLampiran ? (
                <div className="text-black italic">
                  (Daftar Terlampir)
                </div>
              ) : pegawaiCount === 1 ? (
                // 1 Pegawai
                <div className="space-y-0.5">
                  <div className="flex">
                    <span className="w-[130px] flex-shrink-0 text-black">Nama</span>
                    <span className="w-[14px] flex-shrink-0 text-center text-black">:</span>
                    <span className="flex-1 text-black font-normal">
                      {selectedPegawai[0].nama_lengkap_display || selectedPegawai[0].nama}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-[130px] flex-shrink-0 text-black">NIP</span>
                    <span className="w-[14px] flex-shrink-0 text-center text-black">:</span>
                    <span className="flex-1 text-black">{selectedPegawai[0].nip}</span>
                  </div>
                  <div className="flex">
                    <span className="w-[130px] flex-shrink-0 text-black">Pangkat, Gol/Ruang</span>
                    <span className="w-[14px] flex-shrink-0 text-center text-black">:</span>
                    <span className="flex-1 text-black">
                      {selectedPegawai[0].pangkat_golongan_display ||
                        selectedPegawai[0].golongan ||
                        "Penyedia Jasa Lainnya Perorangan (PJLP)"}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-[130px] flex-shrink-0 text-black">Jabatan</span>
                    <span className="w-[14px] flex-shrink-0 text-center text-black">:</span>
                    <span className="flex-1 text-black">{selectedPegawai[0].jabatan}</span>
                  </div>
                </div>
              ) : (
                // 2 atau 3 Pegawai: Persis seperti Word dokumen asli (Tanpa Nomor)
                <div className="space-y-2">
                  {selectedPegawai.map((p, pIdx) => (
                    <div
                      key={p.id}
                      className={`space-y-0.5 ${
                        pIdx > 0 ? "pt-1.5" : ""
                      }`}
                    >
                      <div className="flex">
                        <span className="w-[130px] flex-shrink-0 text-black">Nama</span>
                        <span className="w-[14px] flex-shrink-0 text-center text-black">:</span>
                        <span className="flex-1 text-black font-normal">
                          {p.nama_lengkap_display || p.nama}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-[130px] flex-shrink-0 text-black">NIP</span>
                        <span className="w-[14px] flex-shrink-0 text-center text-black">:</span>
                        <span className="flex-1 text-black">{p.nip}</span>
                      </div>
                      <div className="flex">
                        <span className="w-[130px] flex-shrink-0 text-black">Pangkat, Gol/Ruang</span>
                        <span className="w-[14px] flex-shrink-0 text-center text-black">:</span>
                        <span className="flex-1 text-black">
                          {p.pangkat_golongan_display ||
                            p.golongan ||
                            "Penyedia Jasa Lainnya Perorangan (PJLP)"}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-[130px] flex-shrink-0 text-black">Jabatan</span>
                        <span className="w-[14px] flex-shrink-0 text-center text-black">:</span>
                        <span className="flex-1 text-black">{p.jabatan}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Untuk */}
          <div
            className={`flex items-start transition-all rounded px-1 -mx-1 pt-1 ${
              activeField === "perihal" ||
              activeField === "lokasi" ||
              activeField === "tanggal_mulai"
                ? "bg-blue-50/60 ring-1 ring-blue-300"
                : ""
            }`}
          >
            <div className="w-[88px] sm:w-[95px] flex-shrink-0 text-black">
              Untuk
            </div>
            <div className="w-[16px] flex-shrink-0 text-center text-black">
              :
            </div>
            <div className="flex-1 text-justify text-black">
              {untukText}
            </div>
          </div>
        </div>

        {/* PARAGRAF BIAYA & PENUTUP */}
        <div className="space-y-2 mt-4 text-[11px] sm:text-[11.5px] text-justify text-black leading-[1.45]">
          <p>
            Biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Sekretariat Jenderal Kementerian Komunikasi dan Digital Tahun Anggaran {tahunAnggaran} sesuai ketentuan yang berlaku.
          </p>
          <p>
            Demikian Surat Tugas ini dibuat untuk dilaksanakan dengan seksama dan penuh tanggung jawab.
          </p>
        </div>
      </div>

      {/* BLOK TANDA TANGAN (Kolom Kanan — Posisi Resmi Sesuai Tata Naskah Dinas) */}
      <div
        className={`mt-5 ml-auto w-[215px] sm:w-[225px] text-left space-y-0.5 transition-all rounded p-1 ${
          activeField === "pejabat"
            ? "bg-blue-50/60 ring-1 ring-blue-300"
            : ""
        }`}
      >
        <p className="text-[11px] sm:text-[11.5px] text-black">
          Jakarta, {todayStr}
        </p>
        <p className="text-[11px] sm:text-[11.5px] text-black">
          {pejabatJabatan},
        </p>
        {/* Ruang Bersih Tanda Tangan Fisik / Digital (Sesuai Word Template Asli) */}
        <div
          className={`${
            pegawaiCount > 1 && !isMultiLampiran ? "h-16" : "h-20"
          } transition-all`}
        />
        <p className="text-[11.5px] sm:text-[12px] text-black font-normal">
          {pejabatNama}
        </p>
      </div>

      {/* Footer Catatan Kertas */}
      <div className="text-[9px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between items-center mt-3">
        <span>Format Naskah Dinas Resmi Komdigi (A4)</span>
        <span>Halaman 1 {isMultiLampiran ? "dari 2" : "dari 1"}</span>
      </div>
    </div>
  );

  // Document Page 2 (Lampiran I jika > 3 Pegawai — Sesuai Dokumen Resmi)
  const renderPage2 = () => (
    <div
      className="bg-white text-black shadow-[0_4px_24px_rgba(0,0,0,0.14)] border border-slate-300/80 rounded-[2px] p-8 sm:p-11 w-full max-w-[680px] mx-auto min-h-[960px] text-[10.5px] leading-relaxed relative flex flex-col justify-between select-text"
      style={{ fontFamily: "'Arial', 'Helvetica', sans-serif" }}
    >
      <div>
        {/* Header Lampiran (Pojok Kiri Atas Sesuai Dokumen Hasil Generator) */}
        <div className="mb-4 text-left space-y-0.5 text-black">
          <h4 className="font-bold text-[11px] text-black">
            Lampiran I Surat Tugas
          </h4>
          <div className="flex text-[10.5px]">
            <span className="w-16 text-black">Nomor</span>
            <span className="text-black">: {nomorDisplay}</span>
          </div>
          <div className="flex text-[10.5px]">
            <span className="w-16 text-black">Tanggal</span>
            <span className="text-black">: {todayStr}</span>
          </div>
        </div>

        {/* Tabel 5 Kolom Lampiran (Border 1px Hitam Resmi Sesuai Word Asli) */}
        <div className="overflow-x-auto mt-3">
          <table className="w-full border-collapse border border-black text-[10px]">
            <thead>
              <tr className="bg-transparent">
                <th className="border border-black px-2 py-1.5 text-center font-bold w-9 text-black">
                  No
                </th>
                <th className="border border-black px-2 py-1.5 text-left font-bold w-40 text-black">
                  Nama
                </th>
                <th className="border border-black px-2 py-1.5 text-left font-bold w-36 text-black">
                  NIP
                </th>
                <th className="border border-black px-2 py-1.5 text-left font-bold w-32 text-black">
                  Pangkat/Gol<br />Ruang
                </th>
                <th className="border border-black px-2 py-1.5 text-left font-bold text-black">
                  Jabatan
                </th>
              </tr>
            </thead>
            <tbody>
              {selectedPegawai.map((p, idx) => (
                <tr key={p.id}>
                  <td className="border border-black px-2 py-1 text-center align-top text-black">
                    {idx + 1}
                  </td>
                  <td className="border border-black px-2 py-1 align-top text-black">
                    {p.nama_lengkap_display || p.nama}
                  </td>
                  <td className="border border-black px-2 py-1 align-top text-black">
                    {p.nip}
                  </td>
                  <td className="border border-black px-2 py-1 align-top text-black">
                    {p.pangkat_golongan_display || p.golongan || "PJLP"}
                  </td>
                  <td className="border border-black px-2 py-1 align-top text-black">
                    {p.jabatan}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Halaman 2 */}
      <div className="text-[9px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between items-center mt-4">
        <span>Lampiran Tabel Pegawai Resmi (Komdigi)</span>
        <span>Halaman 2 dari 2</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#E2E8F0]/70 rounded-[12px] border border-[#CBD5E1] p-3 sm:p-4 overflow-hidden shadow-sm">
      {/* PREVIEW TOP BAR & CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#CBD5E1] bg-white/80 backdrop-blur-sm -mx-3 -mt-3 sm:-mx-4 sm:-mt-4 p-3 rounded-t-[12px]">
        {/* Status Badge */}
        <div className="flex items-center space-x-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563EB] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2563EB]"></span>
          </span>
          <span className="text-xs font-bold text-[#0F172A] tracking-tight flex items-center space-x-1.5">
            <FileText className="w-3.5 h-3.5 text-[#2563EB] inline stroke-[2]" />
            <span>Pratinjau Naskah Dinas Resmi (A4)</span>
          </span>
          <span className="text-[10px] bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded-[4px] font-semibold border border-[#DBEAFE] hidden md:inline">
            {isMultiLampiran ? "2 Halaman (>3 Pegawai)" : "1 Halaman (Badan Surat)"}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5">
          {/* Multi-page switcher if > 3 pegawai */}
          {isMultiLampiran && (
            <div className="inline-flex items-center rounded-[6px] border border-[#CBD5E1] bg-white p-0.5 text-xs shadow-xs">
              <button
                type="button"
                onClick={() => setActivePage(1)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  activePage === 1
                    ? "bg-[#2563EB] text-white"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Hal 1
              </button>
              <button
                type="button"
                onClick={() => setActivePage(2)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  activePage === 2
                    ? "bg-[#2563EB] text-white"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Hal 2 (Lampiran)
              </button>
            </div>
          )}

          {/* Zoom In / Zoom Out */}
          <div className="inline-flex items-center rounded-[6px] border border-[#CBD5E1] bg-white text-xs shadow-xs">
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(70, prev - 10))}
              className="p-1.5 text-[#64748B] hover:text-[#0F172A] transition-colors"
              title="Perkecil Pratinjau"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-[10px] font-mono text-[#64748B] min-w-[34px] text-center">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(130, prev + 10))}
              className="p-1.5 text-[#64748B] hover:text-[#0F172A] transition-colors"
              title="Perbesar Pratinjau"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 bg-white border border-[#CBD5E1] rounded-[6px] text-[#64748B] hover:text-[#2563EB] transition-colors shadow-xs"
            title="Lihat Pratinjau Layar Penuh"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Button to Hide Preview */}
          {showToggleBtn && onTogglePreview && (
            <button
              type="button"
              onClick={onTogglePreview}
              className="inline-flex items-center space-x-1 text-xs font-semibold text-[#64748B] hover:text-[#DC2626] bg-white border border-[#CBD5E1] hover:border-[#DC2626]/30 px-2 py-1 rounded-[6px] transition-colors shadow-xs"
              title="Tutup Panel Pratinjau"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tutup</span>
            </button>
          )}
        </div>
      </div>

      {/* DOCUMENT PREVIEW CONTAINER (SCROLLABLE & ZOOMABLE) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 flex items-start justify-center bg-[#E2E8F0]/40 rounded-b-[8px]">
        <div
          className="transition-transform duration-150 origin-top w-full"
          style={{ transform: `scale(${zoomLevel / 100})` }}
        >
          {activePage === 1 ? renderPage1() : renderPage2()}
        </div>
      </div>

      {/* FULLSCREEN MODAL OVERLAY */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col p-4 sm:p-6 overflow-hidden">
          <div className="flex items-center justify-between text-white max-w-4xl mx-auto w-full mb-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-sm sm:text-base">
                Pratinjau Layar Penuh Naskah Dinas Surat Tugas
              </span>
            </div>
            <div className="flex items-center space-x-3">
              {isMultiLampiran && (
                <div className="inline-flex bg-slate-800 border border-slate-700 rounded-[6px] p-0.5 text-xs">
                  <button
                    onClick={() => setActivePage(1)}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      activePage === 1
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Hal 1: Badan Surat
                  </button>
                  <button
                    onClick={() => setActivePage(2)}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      activePage === 2
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Hal 2: Lampiran I
                  </button>
                </div>
              )}
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors"
                title="Tutup Layar Penuh"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-start justify-center p-2">
            <div className="w-full max-w-3xl">
              {activePage === 1 ? renderPage1() : renderPage2()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
