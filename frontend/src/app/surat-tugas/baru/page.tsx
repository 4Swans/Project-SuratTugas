"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Users,
  Search,
  Check,
  Download,
  Calendar,
  UserCheck,
  FileCheck,
  Loader2,
  Trash2,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  getPegawaiList,
  getPejabatList,
  previewNomorSurat,
  uploadDanEkstrakUndangan,
  createSuratTugas,
  downloadSuratTugasFile,
} from "@/lib/api";
import { Pegawai, SuratTugas, SuratTugasCreatePayload } from "@/types";
import { formatPeriodeTanggal } from "@/lib/utils";
import { LiveSuratTugasPreview } from "@/components/document/LiveSuratTugasPreview";

type Step = 1 | 2 | 3 | 4;

export default function BuatSuratTugasPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDownloading, setIsDownloading] = useState(false);

  // Wizard Step State
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Upload & Extraction State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState(false);

  // Form Data Acara (Review & Edit)
  const [formData, setFormData] = useState({
    menimbang:
      "bahwa dalam rangka mendukung pelaksanaan tugas dan fungsi Pusat Kebijakan Strategis serta menindaklanjuti undangan yang diterima, perlu menugaskan pegawai untuk mengikuti kegiatan dimaksud.",
    perihal: "",
    dasar_surat: "",
    tanggal_mulai: "",
    tanggal_selesai: "",
    lokasi: "",
    topik: "TU",
    konseptor: "",
    dibuat_oleh: "Staf Tata Usaha",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Assignment State
  const [selectedPegawaiIds, setSelectedPegawaiIds] = useState<number[]>([]);
  const [selectedPejabatId, setSelectedPejabatId] = useState<number | null>(null);
  const [pegawaiSearch, setPegawaiSearch] = useState("");

  // Split Preview State
  const [showPreview, setShowPreview] = useState(true);
  const [activeField, setActiveField] = useState<string | null>(null);

  // Result State
  const [createdSurat, setCreatedSurat] = useState<SuratTugas | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Queries
  const { data: nomorPreview } = useQuery({
    queryKey: ["nomor-surat-preview"],
    queryFn: previewNomorSurat,
  });

  const { data: pegawaiList = [] } = useQuery({
    queryKey: ["pegawai"],
    queryFn: () => getPegawaiList(),
  });

  const { data: pejabatList = [] } = useQuery({
    queryKey: ["pejabat"],
    queryFn: getPejabatList,
    select: (data) => {
      if (selectedPejabatId === null && data.length > 0) {
        const def = data.find((p) => p.is_default) || data[0];
        setSelectedPejabatId(def.id);
      }
      return data;
    },
  });

  // Handle File Upload & AI Extraction
  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setIsExtracting(true);
    setExtractError(null);

    try {
      const result = await uploadDanEkstrakUndangan(file);
      setExtractSuccess(true);

      setFormData((prev) => ({
        ...prev,
        perihal: result.nama_acara || prev.perihal,
        dasar_surat: result.dasar_surat || prev.dasar_surat,
        tanggal_mulai: result.tanggal_mulai || prev.tanggal_mulai,
        tanggal_selesai: result.tanggal_selesai || result.tanggal_mulai || prev.tanggal_selesai,
        lokasi: result.lokasi || prev.lokasi,
        topik: prev.topik || "TU",
      }));

      // Automatically advance to Step 2 for Review
      setTimeout(() => {
        setCurrentStep(2);
      }, 700);
    } catch (err: any) {
      setExtractError(err.message || "Gagal mengekstrak data dari undangan.");
    } finally {
      setIsExtracting(false);
    }
  };

  // Toggle Pegawai Selection
  const togglePegawai = (id: number) => {
    setSelectedPegawaiIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  // Remove selected pegawai
  const removeSelectedPegawai = (id: number) => {
    setSelectedPegawaiIds((prev) => prev.filter((pId) => pId !== id));
  };

  // Filter Pegawai by Search
  const filteredPegawai = pegawaiList.filter((p) => {
    const term = pegawaiSearch.toLowerCase();
    return (
      p.nama.toLowerCase().includes(term) ||
      p.nip.includes(term) ||
      p.jabatan.toLowerCase().includes(term) ||
      (p.pangkat && p.pangkat.toLowerCase().includes(term))
    );
  });

  // Validate Step 2
  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (!formData.dasar_surat.trim()) {
      errors.dasar_surat = "Dasar surat / rujukan undangan wajib diisi.";
    }
    if (!formData.perihal.trim()) {
      errors.perihal = "Perihal atau nama kegiatan wajib diisi.";
    }
    if (!formData.tanggal_mulai) {
      errors.tanggal_mulai = "Tanggal mulai kegiatan wajib dipilih.";
    }
    if (!formData.lokasi.trim()) {
      errors.lokasi = "Lokasi kegiatan wajib diisi.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Final Submit & Generation
  const handleGenerateSurat = async () => {
    if (!selectedPejabatId) {
      setGenerateError("Pilih pejabat penandatangan.");
      return;
    }
    if (selectedPegawaiIds.length === 0) {
      setGenerateError("Pilih minimal 1 orang pegawai yang ditugaskan.");
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const payload: SuratTugasCreatePayload = {
        menimbang: formData.menimbang,
        dasar_surat: formData.dasar_surat,
        perihal: formData.perihal,
        tanggal_mulai: formData.tanggal_mulai,
        tanggal_selesai: formData.tanggal_selesai || formData.tanggal_mulai,
        lokasi: formData.lokasi,
        topik: formData.topik,
        konseptor: formData.konseptor,
        penandatangan_id: selectedPejabatId,
        pegawai_ids: selectedPegawaiIds,
        dibuat_oleh: formData.dibuat_oleh,
      };

      const result = await createSuratTugas(payload);
      setCreatedSurat(result);
      queryClient.invalidateQueries({ queryKey: ["surat-tugas"] });
      queryClient.invalidateQueries({ queryKey: ["nomor-surat-preview"] });
    } catch (err: any) {
      setGenerateError(err.message || "Gagal menerbitkan surat tugas.");
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedPejabat = pejabatList.find((p) => p.id === selectedPejabatId);
  const selectedPegawaiObjects = selectedPegawaiIds
    .map((id) => pegawaiList.find((p) => p.id === id))
    .filter(Boolean) as Pegawai[];

  return (
    <div className={`space-y-6 transition-all duration-300 ${showPreview ? "max-w-7xl mx-auto" : "max-w-4xl mx-auto"}`}>
      {/* Wizard Header & Steps Progress */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-semibold text-[#0F172A] tracking-tight leading-tight">
              Pembuatan Surat Tugas Baru
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              Alur 4 tahap resmi: Unggah Undangan → Verifikasi Data Acara → Penugasan Pegawai → Terbitkan Dokumen
            </p>
          </div>

          {/* Toggle Split Preview Button */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold min-h-[40px] px-3.5 py-2 rounded-[8px] border transition-all duration-200 ${
                showPreview
                  ? "bg-[#EFF6FF] border-[#2563EB] text-[#2563EB] soft-shadow"
                  : "bg-white border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
              }`}
              title={showPreview ? "Sembunyikan panel preview dokumen" : "Tampilkan split preview dokumen"}
            >
              {showPreview ? (
                <>
                  <EyeOff className="w-4 h-4 stroke-[2]" aria-hidden="true" />
                  <span>Sembunyikan Preview Dokumen</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 stroke-[2]" aria-hidden="true" />
                  <span>Tampilkan Split Preview</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step Indicator Bar */}
        <nav aria-label="Langkah Pembuatan Surat" className="grid grid-cols-4 gap-2 sm:gap-4 pt-2">
          {[
            { num: 1, label: "Upload Undangan", desc: "Ekstraksi AI" },
            { num: 2, label: "Review Data", desc: "Verifikasi Acara" },
            { num: 3, label: "Pilih Pegawai", desc: "Penandatangan" },
            { num: 4, label: "Konfirmasi", desc: "Generate Dokumen" },
          ].map((s) => {
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div
                key={s.num}
                aria-current={isCurrent ? "step" : undefined}
                className={`relative flex flex-col p-3.5 rounded-[12px] border transition-all duration-200 ${
                  isCurrent
                    ? "bg-[#EFF6FF] border-[#2563EB] text-[#2563EB] soft-shadow"
                    : isDone
                    ? "bg-emerald-50 border-emerald-300 text-[#16A34A]"
                    : "bg-white border-[#E2E8F0] text-[#64748B]"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone
                        ? "bg-[#16A34A] text-white"
                        : isCurrent
                        ? "bg-[#2563EB] text-white ring-2 ring-[#DBEAFE]"
                        : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B]"
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" /> : s.num}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold truncate">
                    {s.label}
                  </span>
                </div>
                <span className="text-[11px] text-[#64748B] mt-1 truncate hidden md:inline">
                  {s.desc}
                </span>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Main Split Layout: Form Wizard on Left, Live Preview on Right */}
      <div className={`grid gap-6 items-start transition-all duration-300 ${
        showPreview ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1"
      }`}>
        {/* Form Column */}
        <div className={`space-y-6 ${showPreview ? "lg:col-span-6 xl:col-span-6" : "w-full"}`}>
          {/* STEP 1: UPLOAD & AI EXTRACTION */}
          {currentStep === 1 && (
        <section aria-label="Unggah Dokumen Undangan" className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 sm:p-8 space-y-6 soft-shadow">
          <div className="space-y-1">
            <h2 className="text-[20px] font-semibold text-[#0F172A] flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#2563EB] stroke-[1.8]" aria-hidden="true" />
              <span>Langkah 1: Unggah Dokumen Undangan</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B]">
              Unggah file undangan resmi (PDF, Word .docx, atau Foto/Scan). Gemini AI akan
              membaca nama acara, tanggal, nomor undangan, dan lokasi secara otomatis.
            </p>
          </div>

          {/* Drag & Drop Area */}
          <div className="relative border-2 border-dashed border-[#CBD5E1] hover:border-[#2563EB] rounded-[12px] p-8 sm:p-12 text-center transition-colors bg-[#F8FAFC] hover:bg-[#EFF6FF]/40 group focus-within:ring-2 focus-within:ring-[#2563EB]">
            <input
              type="file"
              id="file-upload-input"
              accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              disabled={isExtracting}
              aria-label="Pilih dokumen undangan untuk diekstrak"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
            />

            <div className="space-y-4 max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-[12px] bg-[#EFF6FF] border border-[#DBEAFE] text-[#2563EB] flex items-center justify-center mx-auto group-hover:scale-105 transition-transform duration-200">
                {isExtracting ? (
                  <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" aria-hidden="true" />
                ) : (
                  <UploadCloud className="w-8 h-8 text-[#2563EB] stroke-[1.8]" aria-hidden="true" />
                )}
              </div>

              {isExtracting ? (
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-[#0F172A]">
                    Menganalisis Dokumen dengan Gemini AI...
                  </h3>
                  <p className="text-xs text-[#2563EB] font-medium animate-pulse">
                    Mengekstrak tanggal, nama kegiatan, lokasi, dan nomor surat undangan...
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold text-[#0F172A]">
                    Pilih atau Tarik File Undangan ke Sini
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Mendukung format PDF, Word (.docx), atau Foto/Scan (Maks. 20 MB)
                  </p>
                  <div className="pt-2">
                    <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#2563EB] bg-white px-3 py-1.5 rounded-[8px] border border-[#DBEAFE] soft-shadow">
                      <span>Buka File Picker</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Extraction Error Alert */}
          {extractError && (
            <div className="p-4 rounded-[8px] bg-red-50 border border-red-200 text-[#DC2626] text-xs sm:text-sm flex items-start space-x-3" role="alert">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#DC2626] mt-0.5 stroke-[1.8]" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-semibold text-[#DC2626]">Ekstraksi Otomatis Gagal:</p>
                <p className="text-[#DC2626]">{extractError}</p>
                <p className="text-[#64748B] text-xs mt-1">
                  Anda tetap dapat melanjutkan dengan mengisi rincian acara secara manual.
                </p>
              </div>
            </div>
          )}

          {/* Action Row / Skip */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
            <span className="text-xs sm:text-sm text-[#64748B] font-medium">
              Tidak memiliki file undangan digital?
            </span>
            <button
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center space-x-2 text-xs sm:text-sm text-[#2563EB] hover:text-[#1D4ED8] font-semibold min-h-[44px] px-3 py-2 rounded-[8px] transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <span>Isi Data Manual</span>
              <ArrowRight className="w-4 h-4 stroke-[2]" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* STEP 2: REVIEW & EDIT DATA ACARA */}
      {currentStep === 2 && (
        <section aria-label="Review Data Acara" className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 sm:p-8 space-y-6 soft-shadow">
          <div className="space-y-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-[20px] font-semibold text-[#0F172A] flex items-center space-x-2">
                <FileText className="w-5 h-5 text-[#2563EB] stroke-[1.8]" aria-hidden="true" />
                <span>Langkah 2: Review & Edit Data Acara</span>
              </h2>
              {extractSuccess && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-[6px] text-xs font-semibold bg-emerald-50 text-[#16A34A] border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] stroke-[2]" aria-hidden="true" />
                  <span>Terisi Otomatis via AI</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#64748B]">
              Periksa dan lengkapi rincian acara penugasan. Informasi ini akan dicetak
              ke dalam naskah dinas resmi surat tugas.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {/* Menimbang */}
            <div className="space-y-1.5">
              <label htmlFor="input-menimbang" className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] flex items-center justify-between">
                <span>Menimbang <span className="text-[#DC2626]">*</span></span>
                <span className="text-[11px] text-[#64748B] lowercase font-normal">dapat diedit / disesuaikan</span>
              </label>
              <textarea
                id="input-menimbang"
                rows={3}
                value={formData.menimbang}
                onFocus={() => setActiveField("menimbang")}
                onBlur={() => setActiveField(null)}
                onChange={(e) => {
                  setFormData({ ...formData, menimbang: e.target.value });
                  if (formErrors.menimbang) setFormErrors({ ...formErrors, menimbang: "" });
                }}
                placeholder="bahwa dalam rangka mendukung pelaksanaan tugas dan fungsi Pusat Kebijakan Strategis serta menindaklanjuti undangan yang diterima, perlu menugaskan pegawai untuk mengikuti kegiatan dimaksud."
                className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-[8px] text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors duration-200"
              />
              <p className="text-[11px] text-[#64748B]">
                Konsideran pertimbangan naskah dinas resmi surat tugas.
              </p>
            </div>

            {/* Dasar Surat */}
            <div className="space-y-1.5">
              <label htmlFor="input-dasar-surat" className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] flex items-center justify-between">
                <span>Dasar Surat (Rujukan Undangan) <span className="text-[#DC2626]">*</span></span>
                <span className="text-[11px] text-[#64748B] lowercase font-normal">wajib diisi</span>
              </label>
              <textarea
                id="input-dasar-surat"
                rows={2}
                value={formData.dasar_surat}
                onFocus={() => setActiveField("dasar_surat")}
                onBlur={() => setActiveField(null)}
                onChange={(e) => {
                  setFormData({ ...formData, dasar_surat: e.target.value });
                  if (formErrors.dasar_surat) setFormErrors({ ...formErrors, dasar_surat: "" });
                }}
                placeholder="Contoh: Undangan Sekretaris Direktorat Jenderal Ekosistem Digital Nomor B-2845/DJED.1/PR.01.01/09/2026 tanggal 18 September 2026"
                aria-invalid={!!formErrors.dasar_surat}
                aria-describedby={formErrors.dasar_surat ? "error-dasar-surat" : undefined}
                className={`w-full px-4 py-2.5 bg-white border rounded-[8px] text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors duration-200 ${
                  formErrors.dasar_surat ? "border-[#DC2626]" : "border-[#E2E8F0]"
                }`}
              />
              {formErrors.dasar_surat && (
                <p id="error-dasar-surat" className="text-xs text-[#DC2626] font-medium">
                  {formErrors.dasar_surat}
                </p>
              )}
              <p className="text-[11px] text-[#64748B]">
                Format baku konsideran dasar surat tugas rujukan undangan pengundang.
              </p>
            </div>

            {/* Perihal / Nama Kegiatan */}
            <div className="space-y-1.5">
              <label htmlFor="input-perihal" className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] flex items-center justify-between">
                <span>Perihal / Nama Kegiatan <span className="text-[#DC2626]">*</span></span>
                <span className="text-[11px] text-[#64748B] lowercase font-normal">wajib diisi</span>
              </label>
              <input
                id="input-perihal"
                type="text"
                value={formData.perihal}
                onFocus={() => setActiveField("perihal")}
                onBlur={() => setActiveField(null)}
                onChange={(e) => {
                  setFormData({ ...formData, perihal: e.target.value });
                  if (formErrors.perihal) setFormErrors({ ...formErrors, perihal: "" });
                }}
                placeholder="Contoh: Rapat Pembahasan Pemetaan Kebijakan dan Regulasi Penyelenggaraan Digital Nasional"
                aria-invalid={!!formErrors.perihal}
                aria-describedby={formErrors.perihal ? "error-perihal" : undefined}
                className={`w-full min-h-[44px] px-4 py-2.5 bg-white border rounded-[8px] text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors duration-200 ${
                  formErrors.perihal ? "border-[#DC2626]" : "border-[#E2E8F0]"
                }`}
              />
              {formErrors.perihal && (
                <p id="error-perihal" className="text-xs text-[#DC2626] font-medium">
                  {formErrors.perihal}
                </p>
              )}
            </div>

            {/* Tanggal Kegiatan (Mulai & Selesai) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="input-tanggal-mulai" className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                  Tanggal Mulai <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  id="input-tanggal-mulai"
                  type="date"
                  value={formData.tanggal_mulai}
                  onFocus={() => setActiveField("tanggal_mulai")}
                  onBlur={() => setActiveField(null)}
                  onChange={(e) => {
                    const newMulai = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      tanggal_mulai: newMulai,
                      tanggal_selesai: prev.tanggal_selesai || newMulai,
                    }));
                    if (formErrors.tanggal_mulai) setFormErrors({ ...formErrors, tanggal_mulai: "" });
                  }}
                  className={`w-full min-h-[44px] px-4 py-2.5 bg-white border rounded-[8px] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors duration-200 ${
                    formErrors.tanggal_mulai ? "border-[#DC2626]" : "border-[#E2E8F0]"
                  }`}
                />
                {formErrors.tanggal_mulai && (
                  <p className="text-xs text-[#DC2626] font-medium">{formErrors.tanggal_mulai}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="input-tanggal-selesai" className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                  Tanggal Selesai <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  id="input-tanggal-selesai"
                  type="date"
                  value={formData.tanggal_selesai}
                  onFocus={() => setActiveField("tanggal_mulai")}
                  onBlur={() => setActiveField(null)}
                  onChange={(e) =>
                    setFormData({ ...formData, tanggal_selesai: e.target.value })
                  }
                  className="w-full min-h-[44px] px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-[8px] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors duration-200"
                />
              </div>
            </div>

            {/* Periode Preview */}
            {formData.tanggal_mulai && (
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-[#2563EB] bg-[#EFF6FF] border border-[#DBEAFE] px-4 py-2.5 rounded-[8px] font-medium">
                <Calendar className="w-4 h-4 flex-shrink-0 text-[#2563EB] stroke-[1.8]" aria-hidden="true" />
                <span>
                  Format pada surat:{" "}
                  <strong className="text-[#0F172A]">
                    {formatPeriodeTanggal(
                      formData.tanggal_mulai,
                      formData.tanggal_selesai
                    )}
                  </strong>
                </span>
              </div>
            )}

            {/* Lokasi */}
            <div className="space-y-1.5">
              <label htmlFor="input-lokasi" className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] flex items-center justify-between">
                <span>Lokasi Kegiatan <span className="text-[#DC2626]">*</span></span>
                <span className="text-[11px] text-[#64748B] lowercase font-normal">wajib diisi</span>
              </label>
              <textarea
                id="input-lokasi"
                rows={2}
                value={formData.lokasi}
                onFocus={() => setActiveField("lokasi")}
                onBlur={() => setActiveField(null)}
                onChange={(e) => {
                  setFormData({ ...formData, lokasi: e.target.value });
                  if (formErrors.lokasi) setFormErrors({ ...formErrors, lokasi: "" });
                }}
                placeholder="Contoh: Hotel Mercure Bandung Nexa Supratman, Jl. Supratman No. 66 – 68, Kota Bandung, Jawa Barat"
                className={`w-full px-4 py-2.5 bg-white border rounded-[8px] text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors duration-200 ${
                  formErrors.lokasi ? "border-[#DC2626]" : "border-[#E2E8F0]"
                }`}
              />
              {formErrors.lokasi && (
                <p className="text-xs text-[#DC2626] font-medium">{formErrors.lokasi}</p>
              )}
            </div>

            {/* Tim Pengusul / Unit Kerja (Kolom Topik Tim di Spreadsheet) */}
            <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
                  <span>Tim Pengusul / Unit Kerja (Topik Tim)</span>
                </label>
                <span className="text-[11px] text-[#64748B]">Kolom G Register Spreadsheet</span>
              </div>
              <p className="text-xs text-[#64748B]">
                Pilih unit kerja atau tim pemilik naskah dinas untuk pencatatan otomatis di Google Spreadsheet:
              </p>

              {/* Quick Select Preset Pills */}
              <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Pilihan Tim Pengusul">
                {[
                  { id: "TU", label: "TU", desc: "Tata Usaha" },
                  { id: "DTO", label: "DTO", desc: "Digital Transformation Office" },
                  { id: "Keuangan", label: "Keuangan", desc: "Bagian Keuangan" },
                  { id: "FE", label: "FE", desc: "Front End / Ekosistem" },
                  { id: "BE", label: "BE", desc: "Back End / Tata Kelola" },
                  { id: "Kapus", label: "Kapus", desc: "Kepala Pusat" },
                  { id: "custom", label: "Lainnya", desc: "Ketik manual..." },
                ].map((tim) => {
                  const isCustom = tim.id === "custom";
                  const standardIds = ["TU", "DTO", "Keuangan", "FE", "BE", "Kapus"];
                  const isSelected = isCustom
                    ? !standardIds.includes(formData.topik) && formData.topik !== ""
                    : formData.topik === tim.id;

                  return (
                    <button
                      key={tim.id}
                      type="button"
                      onClick={() => {
                        if (isCustom) {
                          if (standardIds.includes(formData.topik) || !formData.topik) {
                            setFormData({ ...formData, topik: "" });
                          }
                        } else {
                          setFormData({ ...formData, topik: tim.id });
                        }
                      }}
                      className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-[8px] text-xs font-medium min-h-[38px] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                        isSelected
                          ? "bg-[#2563EB] text-white shadow-sm font-semibold border border-[#2563EB]"
                          : "bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] hover:border-[#CBD5E1]"
                      }`}
                    >
                      <span className="font-bold">{tim.label}</span>
                      <span className={`text-[10px] hidden sm:inline ${isSelected ? "text-blue-100" : "text-[#64748B]"}`}>
                        ({tim.desc})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Input manual jika memilih Lainnya atau mengisi custom */}
              {(!["TU", "DTO", "Keuangan", "FE", "BE", "Kapus"].includes(formData.topik) || formData.topik === "") && (
                <div className="pt-1.5 space-y-1">
                  <input
                    id="input-topik-custom"
                    type="text"
                    value={formData.topik}
                    onChange={(e) => setFormData({ ...formData, topik: e.target.value })}
                    placeholder="Ketik kode/nama tim khusus (Contoh: Pokja AI, Hukum, dsb)"
                    className="w-full min-h-[44px] px-4 py-2.5 bg-white border border-[#2563EB]/40 rounded-[8px] text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors"
                  />
                  <p className="text-[11px] text-[#64748B]">
                    Nilai ini akan langsung disimpan ke kolom Topik Tim di Google Spreadsheet.
                  </p>
                </div>
              )}
            </div>

            {/* Konseptor Surat Tugas (Kolom KONSEPTOR di Spreadsheet) */}
            <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <label htmlFor="input-konseptor" className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] flex items-center space-x-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
                  <span>Nama Konseptor (Pembuat Konsep)</span>
                </label>
                <span className="text-[11px] text-[#64748B]">Kolom KONSEPTOR Spreadsheet</span>
              </div>
              <p className="text-xs text-[#64748B]">
                Masukkan nama pegawai atau staf yang menyusun/mengonsep naskah dinas ini:
              </p>
              <input
                id="input-konseptor"
                type="text"
                value={formData.konseptor}
                onFocus={() => setActiveField("konseptor")}
                onBlur={() => setActiveField(null)}
                onChange={(e) => setFormData({ ...formData, konseptor: e.target.value })}
                placeholder="Contoh: Dimas, Rilla, Dita, atau Staf Tata Usaha"
                className="w-full min-h-[44px] px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-[8px] text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors"
              />

              {/* Quick Suggestion Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-[#64748B] mr-1">Saran Cepat:</span>
                {["Dimas", "Rilla", "Dita", "Esty", "Staf Tata Usaha"].map((suggest) => (
                  <button
                    key={suggest}
                    type="button"
                    onClick={() => setFormData({ ...formData, konseptor: suggest })}
                    className={`text-[11px] px-2.5 py-1 rounded-[6px] border transition-colors ${
                      formData.konseptor === suggest
                        ? "bg-[#2563EB] text-white border-[#2563EB] font-medium shadow-sm"
                        : "bg-white text-[#64748B] hover:text-[#0F172A] border-[#E2E8F0] hover:bg-slate-50"
                    }`}
                  >
                    {suggest}
                  </button>
                ))}
              </div>

              {/* Status Surat Otomatis Card */}
              <div className="flex items-center space-x-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-[8px] text-xs text-emerald-800 mt-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Otomatisasi: Data <strong>KONSEPTOR</strong> akan tercatat di spreadsheet, dan kolom <strong>Status Surat</strong> otomatis terisi <strong>&quot;OK&quot;</strong>.
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
            <button
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center space-x-2 text-xs sm:text-sm text-[#64748B] hover:text-[#0F172A] font-semibold min-h-[44px] px-4 py-2 rounded-[8px] transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2]" aria-hidden="true" />
              <span>Kembali</span>
            </button>

            <button
              onClick={() => {
                if (validateStep2()) {
                  setCurrentStep(3);
                }
              }}
              className="inline-flex items-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs sm:text-sm font-semibold min-h-[44px] px-6 py-2.5 rounded-[8px] soft-shadow transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <span>Lanjut: Pilih Pegawai</span>
              <ArrowRight className="w-4 h-4 stroke-[2]" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* STEP 3: PILIH PEGAWAI & PENANDATANGAN */}
      {currentStep === 3 && (
        <section aria-label="Pilih Pegawai dan Penandatangan" className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 sm:p-8 space-y-6 soft-shadow">
          <div className="space-y-1">
            <h2 className="text-[20px] font-semibold text-[#0F172A] flex items-center space-x-2">
              <Users className="w-5 h-5 text-[#2563EB] stroke-[1.8]" aria-hidden="true" />
              <span>Langkah 3: Pilih Pegawai & Penandatangan</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B]">
              Pilih pegawai yang ditugaskan (NIP, golongan, dan jabatan ditarik otomatis dari database)
              serta pejabat penandatangan.
            </p>
          </div>

          {/* Section: Pejabat Penandatangan */}
          <div className="space-y-2 p-5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0]">
            <label htmlFor="select-pejabat" className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-[#2563EB] stroke-[1.8]" aria-hidden="true" />
                <span>Pejabat Penandatangan <span className="text-[#DC2626]">*</span></span>
              </span>
              <span className="text-[11px] text-[#64748B] lowercase font-normal">
                Default: Kepala Pusat
              </span>
            </label>
            <select
              id="select-pejabat"
              value={selectedPejabatId || ""}
              onFocus={() => setActiveField("pejabat")}
              onBlur={() => setActiveField(null)}
              onChange={(e) => setSelectedPejabatId(Number(e.target.value))}
              aria-label="Pilih Pejabat Penandatangan"
              className="w-full min-h-[44px] px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-[8px] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] font-medium"
            >
              {pejabatList.map((pj) => (
                <option key={pj.id} value={pj.id}>
                  {pj.is_default ? "★ [Default] " : ""}
                  {pj.nama_lengkap_display || pj.nama} — {pj.jabatan}
                </option>
              ))}
            </select>
          </div>

          {/* Section: Dynamic Layout Info */}
          <div
            className={`p-4 rounded-[8px] border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm transition-colors ${
              selectedPegawaiIds.length > 3
                ? "bg-amber-50 border-amber-200 text-[#F59E0B]"
                : "bg-[#EFF6FF] border-[#DBEAFE] text-[#2563EB]"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 flex-shrink-0 stroke-[1.8]" aria-hidden="true" />
              <span className="font-semibold">
                {selectedPegawaiIds.length} Pegawai Dipilih
              </span>
              <span className="text-[#64748B]">•</span>
              <span className="text-[#0F172A]">
                Format Otomatis:{" "}
                <strong className="text-[#0F172A]">
                  {selectedPegawaiIds.length > 3
                    ? "Lampiran Tabel Terpisah (> 3 pegawai)"
                    : "Detail di Badan Surat (≤ 3 pegawai)"}
                </strong>
              </span>
            </div>
          </div>

          {/* Selected Pegawai Chips Stack */}
          {selectedPegawaiObjects.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                Pegawai Terpilih (Urutan Penomoran di Dokumen):
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedPegawaiObjects.map((p, idx) => (
                  <div
                    key={p.id}
                    className="inline-flex items-center space-x-2 bg-white border border-[#DBEAFE] rounded-[8px] px-3 py-1.5 text-xs text-[#0F172A] soft-shadow"
                  >
                    <span className="font-bold text-[#2563EB]">{idx + 1}.</span>
                    <span className="font-medium">{p.nama}</span>
                    <button
                      type="button"
                      onClick={() => removeSelectedPegawai(p.id)}
                      className="min-h-[28px] min-w-[28px] flex items-center justify-center text-[#64748B] hover:text-[#DC2626] transition-colors rounded-[6px]"
                      aria-label={`Hapus ${p.nama} dari daftar`}
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[1.8]" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pegawai Search & Selection Table */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label htmlFor="search-pegawai" className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                Pilih Dari Database Kepegawaian (30 Pegawai)
              </label>
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] stroke-[1.8]" aria-hidden="true" />
                <input
                  id="search-pegawai"
                  type="text"
                  value={pegawaiSearch}
                  onFocus={() => setActiveField("pegawai")}
                  onBlur={() => setActiveField(null)}
                  onChange={(e) => setPegawaiSearch(e.target.value)}
                  placeholder="Cari nama, NIP, jabatan..."
                  aria-label="Cari nama pegawai"
                  className="w-full min-h-[40px] pl-9 pr-3 py-1.5 bg-white border border-[#E2E8F0] rounded-[8px] text-xs sm:text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div
              role="group"
              aria-label="Daftar centang pegawai"
              className="border border-[#E2E8F0] rounded-[12px] overflow-hidden max-h-80 overflow-y-auto divide-y divide-[#E2E8F0] bg-white"
            >
              {filteredPegawai.map((p) => {
                const isSelected = selectedPegawaiIds.includes(p.id);
                const isPjlp = !p.golongan || p.pangkat.includes("PJLP");
                const isPppk = p.golongan === "IX" || p.pangkat.includes("PPPK");
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => togglePegawai(p.id)}
                    aria-pressed={isSelected}
                    className={`w-full p-3.5 min-h-[48px] flex items-center justify-between text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:outline-none ${
                      isSelected
                        ? "bg-[#EFF6FF] hover:bg-[#DBEAFE]/70"
                        : "hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`w-5 h-5 rounded-[4px] border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-[#2563EB] border-[#2563EB] text-white"
                            : "border-[#CBD5E1] bg-white"
                        }`}
                        aria-hidden="true"
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs sm:text-sm text-[#0F172A]">
                            {p.nama_lengkap_display || p.nama}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-[4px] font-mono font-medium ${
                              isPjlp
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : isPppk
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]"
                            }`}
                          >
                            {p.pangkat_golongan_display || p.golongan || "PJLP"}
                          </span>
                        </div>
                        <div className="text-xs text-[#64748B] mt-0.5">
                          NIP. {p.nip} • {p.jabatan}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
            <button
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center space-x-2 text-xs sm:text-sm text-[#64748B] hover:text-[#0F172A] font-semibold min-h-[44px] px-4 py-2 rounded-[8px] transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2]" aria-hidden="true" />
              <span>Kembali</span>
            </button>

            <button
              onClick={() => {
                if (selectedPegawaiIds.length === 0) {
                  alert("Harap pilih minimal 1 orang pegawai yang ditugaskan.");
                  return;
                }
                setCurrentStep(4);
              }}
              className="inline-flex items-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs sm:text-sm font-semibold min-h-[44px] px-6 py-2.5 rounded-[8px] soft-shadow transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <span>Lanjut: Konfirmasi</span>
              <ArrowRight className="w-4 h-4 stroke-[2]" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* STEP 4: KONFIRMASI & GENERATE */}
      {currentStep === 4 && (
        <section aria-label="Konfirmasi Penerbitan Surat" className="bg-white border border-[#E2E8F0] rounded-[12px] p-6 sm:p-8 space-y-6 soft-shadow">
          <div className="space-y-1">
            <h2 className="text-[20px] font-semibold text-[#0F172A] flex items-center space-x-2">
              <FileCheck className="w-5 h-5 text-[#2563EB] stroke-[1.8]" aria-hidden="true" />
              <span>Langkah 4: Konfirmasi & Terbitkan Surat</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B]">
              Periksa ringkasan surat sebelum nomor resmi dialokasikan dan dokumen resmi PDF dibuat.
            </p>
          </div>

          {/* Success State After Generation */}
          {createdSurat ? (
            <div className="p-8 rounded-[12px] bg-emerald-50/70 border border-emerald-200 text-center space-y-6" role="status">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#16A34A] flex items-center justify-center mx-auto border border-emerald-200">
                <Check className="w-8 h-8 stroke-[2.5]" aria-hidden="true" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#16A34A]">
                  Surat Tugas Berhasil Diterbitkan
                </span>
                <h3 className="text-2xl font-bold text-[#0F172A] font-mono">
                  {createdSurat.nomor_surat.nomor_lengkap}
                </h3>
                <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto">
                  Nomor surat telah disimpan transaksional di database MySQL dan disiapkan
                  untuk mirror Google Sheets. Dokumen resmi PDF telah diterbitkan dan siap diunduh.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={async () => {
                    try {
                      setIsDownloading(true);
                      await downloadSuratTugasFile(createdSurat.id);
                    } catch (err: any) {
                      alert(err.message || "Gagal mengunduh dokumen");
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                  disabled={isDownloading}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] disabled:bg-[#93C5FD] text-white font-semibold min-h-[44px] px-6 py-2.5 rounded-[8px] soft-shadow transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#2563EB] cursor-pointer"
                >
                  <Download className="w-5 h-5 stroke-[1.8]" aria-hidden="true" />
                  <span>{isDownloading ? "Mengunduh..." : "Unduh Dokumen (PDF)"}</span>
                </button>

                <button
                  onClick={() => router.push("/")}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white hover:bg-[#F8FAFC] text-[#0F172A] font-semibold min-h-[44px] px-5 py-2.5 rounded-[8px] border border-[#E2E8F0] transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <span>Kembali ke Dashboard</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Review Card */}
              <div className="rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-6 space-y-4 text-xs sm:text-sm">
                <div>
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Perihal Kegiatan
                  </span>
                  <p className="text-[#0F172A] font-semibold text-base mt-1">
                    {formData.perihal}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E2E8F0]">
                  <div>
                    <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Tanggal Pelaksanaan
                    </span>
                    <p className="text-[#0F172A] font-medium mt-1">
                      {formatPeriodeTanggal(
                        formData.tanggal_mulai,
                        formData.tanggal_selesai
                      )}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Lokasi Kegiatan
                    </span>
                    <p className="text-[#0F172A] font-medium mt-1">
                      {formData.lokasi}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0]">
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Dasar Surat
                  </span>
                  <p className="text-[#0F172A] mt-1 leading-relaxed">
                    {formData.dasar_surat}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[#E2E8F0]">
                  <div>
                    <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Penandatangan
                    </span>
                    <p className="text-[#0F172A] font-semibold mt-1">
                      {selectedPejabat?.nama}
                    </p>
                    <p className="text-xs text-[#2563EB] font-medium">
                      {selectedPejabat?.jabatan}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Format Penugasan
                    </span>
                    <p className="text-[#2563EB] font-semibold mt-1">
                      {selectedPegawaiIds.length} Pegawai (
                      {selectedPegawaiIds.length > 3
                        ? "Lampiran Tabel"
                        : "Badan Surat"}
                      )
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Tim Pengusul (Topik Tim)
                    </span>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
                        {formData.topik || "TU"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Kolom G Spreadsheet
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Box */}
              {generateError && (
                <div className="p-4 rounded-[8px] bg-red-50 border border-red-200 text-[#DC2626] text-xs sm:text-sm flex items-center space-x-2" role="alert">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#DC2626] stroke-[1.8]" aria-hidden="true" />
                  <span>{generateError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={isGenerating}
                  className="inline-flex items-center space-x-2 text-xs sm:text-sm text-[#64748B] hover:text-[#0F172A] font-semibold min-h-[44px] px-4 py-2 rounded-[8px] transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2]" aria-hidden="true" />
                  <span>Kembali</span>
                </button>

                <button
                  onClick={handleGenerateSurat}
                  disabled={isGenerating}
                  className="inline-flex items-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs sm:text-sm font-semibold min-h-[44px] px-6 py-2.5 rounded-[8px] soft-shadow transition-colors duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Menerbitkan Surat...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4 stroke-[2]" aria-hidden="true" />
                      <span>Terbitkan Surat Tugas Resmi</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
        </div>

        {/* Right Column: Live Document Preview */}
        {showPreview && (
          <div className="lg:col-span-6 xl:col-span-6 sticky top-6 max-h-[calc(100vh-5rem)] flex flex-col">
            <LiveSuratTugasPreview
              formData={formData}
              selectedPegawai={selectedPegawaiObjects}
              selectedPejabat={selectedPejabat}
              nomorSuratPreview={nomorPreview?.nomor_lengkap}
              activeField={activeField}
              onTogglePreview={() => setShowPreview(false)}
              showToggleBtn={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
