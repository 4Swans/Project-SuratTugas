"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Star } from "lucide-react";
import { getPejabatList } from "@/lib/api";

export default function MasterPejabatPage() {
  const { data: pejabatList = [], isLoading } = useQuery({
    queryKey: ["pejabat"],
    queryFn: getPejabatList,
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-semibold text-[#0F172A] tracking-tight flex items-center space-x-2 leading-tight">
          <ShieldCheck className="w-7 h-7 text-[#2563EB] stroke-[1.8]" />
          <span>Daftar Pejabat Penandatangan</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] mt-1">
          6 Pejabat yang berwenang menandatangani Surat Tugas (1 Kepala Pusat sebagai default + 5 Koordinator Tim)
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#64748B]">Memuat data pejabat...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pejabatList.map((pj) => (
            <div
              key={pj.id}
              className={`p-5 rounded-[12px] border transition-all duration-200 soft-shadow ${
                pj.is_default
                  ? "bg-[#EFF6FF]/40 border-[#2563EB]"
                  : "bg-white border-[#E2E8F0] hover:border-[#DBEAFE]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-[#0F172A] text-base">
                      {pj.nama_lengkap_display || pj.nama}
                    </span>
                    {pj.is_default && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
                        <Star className="w-3 h-3 fill-[#2563EB] text-[#2563EB]" />
                        <span>Default</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#2563EB] font-medium">
                    {pj.jabatan}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
                <span className="font-mono">NIP. {pj.nip}</span>
                <span className="px-2 py-0.5 rounded-[4px] bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] text-[11px] font-medium">
                  {pj.pangkat_golongan_display || pj.pangkat}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
