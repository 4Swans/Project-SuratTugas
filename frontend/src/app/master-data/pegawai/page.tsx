"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, CheckCircle2 } from "lucide-react";
import { getPegawaiList } from "@/lib/api";

export default function MasterPegawaiPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<"ALL" | "PNS" | "PPPK" | "PJLP">("ALL");

  const { data: pegawaiList = [], isLoading } = useQuery({
    queryKey: ["pegawai"],
    queryFn: () => getPegawaiList(),
  });

  const filteredPegawai = pegawaiList.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      p.nama.toLowerCase().includes(term) ||
      p.nip.includes(term) ||
      p.jabatan.toLowerCase().includes(term) ||
      (p.jurusan && p.jurusan.toLowerCase().includes(term));

    if (!matchSearch) return false;

    if (selectedGroup === "ALL") return true;
    if (selectedGroup === "PJLP") return !p.golongan || p.pangkat.includes("PJLP");
    if (selectedGroup === "PPPK") return p.golongan === "IX" || p.pangkat.includes("PPPK");
    if (selectedGroup === "PNS") return p.golongan && p.golongan !== "IX" && !p.pangkat.includes("PJLP");

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-semibold text-[#0F172A] tracking-tight flex items-center space-x-2 leading-tight">
            <Users className="w-7 h-7 text-[#2563EB] stroke-[1.8]" />
            <span>Database Kepegawaian</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Data 30 pegawai Pusat Kebijakan Strategis (PNS, PPPK, PJLP) terverifikasi
          </p>
        </div>

        {/* Group Filter Tabs */}
        <div className="flex items-center p-1 rounded-[8px] bg-white border border-[#E2E8F0] text-xs soft-shadow">
          {(["ALL", "PNS", "PPPK", "PJLP"] as const).map((grp) => (
            <button
              key={grp}
              onClick={() => setSelectedGroup(grp)}
              className={`px-3 py-1.5 rounded-[6px] font-semibold transition-all duration-200 min-h-[32px] ${
                selectedGroup === grp
                  ? "bg-[#2563EB] text-white soft-shadow"
                  : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
              }`}
            >
              {grp === "ALL" ? "Semua (30)" : grp}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] stroke-[1.8]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari nama, NIP, jabatan, jurusan..."
          aria-label="Cari data pegawai"
          className="w-full min-h-[44px] pl-10 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-[8px] text-xs sm:text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors duration-200"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-[12px] soft-shadow overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-[#64748B]">Memuat data pegawai...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] uppercase tracking-wider font-semibold text-[#64748B]">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Lengkap & NIP</th>
                  <th className="py-3 px-4">Pangkat / Golongan</th>
                  <th className="py-3 px-4">Jabatan</th>
                  <th className="py-3 px-4">Pendidikan & Jurusan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredPegawai.map((p, idx) => {
                  const isPjlp = !p.golongan || p.pangkat.includes("PJLP");
                  const isPppk = p.golongan === "IX" || p.pangkat.includes("PPPK");
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[#F8FAFC] transition-colors duration-150"
                    >
                      <td className="py-3.5 px-4 text-center text-[#64748B] font-mono">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#0F172A]">
                          {p.nama_lengkap_display || p.nama}
                        </div>
                        <div className="text-[11px] font-mono text-[#64748B] mt-0.5">
                          NIP. {p.nip}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${
                            isPjlp
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : isPppk
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]"
                          }`}
                        >
                          {p.pangkat_golongan_display || p.pangkat}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#0F172A] max-w-xs">
                        {p.jabatan}
                      </td>

                      <td className="py-3.5 px-4 text-[#64748B] text-xs max-w-xs truncate" title={p.jurusan || ""}>
                        <div className="font-medium text-[#0F172A]">
                          {p.pendidikan_terakhir || "-"}
                        </div>
                        <div className="truncate">{p.jurusan || "-"}</div>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-[6px] text-[11px] font-semibold bg-emerald-50 text-[#16A34A] border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 stroke-[2]" />
                          <span>{p.status}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
