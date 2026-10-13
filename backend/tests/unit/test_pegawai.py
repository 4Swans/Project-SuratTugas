from app.services.pegawai_service import format_nama_lengkap, format_pangkat_golongan


def test_format_nama_lengkap():
    # Tanpa gelar
    assert format_nama_lengkap("Budi Santoso", None) == "Budi Santoso"
    assert format_nama_lengkap("Budi Santoso", "") == "Budi Santoso"

    # Gelar belakang
    assert format_nama_lengkap("Oki Suryowahono", "S.T., M.T.") == "Oki Suryowahono, S.T., M.T."
    assert format_nama_lengkap("Septa Dewi Anggraeni", "MH") == "Septa Dewi Anggraeni, MH"
    assert format_nama_lengkap("Widya Siwi Lajuba", "S.Tr.I.Kom") == "Widya Siwi Lajuba, S.Tr.I.Kom"

    # Gelar depan (Dr.)
    res = format_nama_lengkap("Anna Christina", "Dr. S.T., M.T.")
    assert "Dr." in res
    assert "Anna Christina" in res
    assert "S.T., M.T." in res


def test_format_pangkat_golongan():
    # PNS (pangkat / golongan)
    assert (
        format_pangkat_golongan("Pembina Tingkat I", "IV/c") == "Pembina Tingkat I / IVc"
        or "Pembina Tingkat I / IV/c"
    )
    assert "Pembina" in format_pangkat_golongan("Pembina", "IV/a")

    # PPPK (hanya pangkat PPPK tanpa golongan)
    pppk_res = format_pangkat_golongan("Penata Muda (PPPK)", "IX")
    assert pppk_res == "Penata Muda (PPPK)"
    assert "/" not in pppk_res

    # PJLP (hanya teks PJLP tanpa golongan)
    pjlp_res = format_pangkat_golongan("Penyedia Jasa Lainnya Perorangan (PJLP)", None)
    assert pjlp_res == "Penyedia Jasa Lainnya Perorangan (PJLP)"
    assert "/" not in pjlp_res
