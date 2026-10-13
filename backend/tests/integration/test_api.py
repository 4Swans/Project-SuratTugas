from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"


def test_get_pegawai():
    res = client.get("/api/v1/pegawai")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 30
    assert "nama" in data[0]
    assert "nip" in data[0]
    assert "pangkat_golongan_display" in data[0]


def test_get_pejabat():
    res = client.get("/api/v1/pejabat")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 6
    defaults = [p for p in data if p["is_default"] is True]
    assert len(defaults) == 1
    assert "Oki Suryowahono" in defaults[0]["nama"]


def test_preview_nomor_surat():
    res = client.get("/api/v1/nomor-surat/preview")
    assert res.status_code == 200
    data = res.json()
    assert "nomor_urut" in data
    assert "nomor_lengkap" in data
    assert "SJ.9/KP.01.06" in data["nomor_lengkap"]


def test_create_and_download_surat_tugas():
    # Ambil 1 pejabat dan 2 pegawai
    pejabat_res = client.get("/api/v1/pejabat").json()
    pejabat_id = pejabat_res[0]["id"]

    pegawai_res = client.get("/api/v1/pegawai?limit=2").json()
    pegawai_ids = [p["id"] for p in pegawai_res]

    payload = {
        "dasar_surat": "Surat Undangan Nomor B-123/2026 tanggal 1 September 2026",
        "perihal": "Rapat Koordinasi Integrasi Sistem",
        "tanggal_mulai": "2026-10-05",
        "tanggal_selesai": "2026-10-07",
        "lokasi": "Hotel Grand Mercure Bandung",
        "topik": "Koordinasi Strategis",
        "penandatangan_id": pejabat_id,
        "pegawai_ids": pegawai_ids,
        "dibuat_oleh": "Staf TU Pengujian",
    }

    res = client.post("/api/v1/surat-tugas", json=payload)
    assert res.status_code == 201
    surat_data = res.json()
    assert "id" in surat_data
    surat_id = surat_data["id"]
    assert "nomor_surat" in surat_data
    assert len(surat_data["pegawai_list"]) == 2

    # Download file (harus berupa PDF valid)
    download_res = client.get(f"/api/v1/surat-tugas/{surat_id}/download")
    assert download_res.status_code == 200
    assert download_res.content.startswith(b"%PDF")
    assert len(download_res.content) > 10000


@patch("app.services.ekstraksi_service.genai.Client")
def test_upload_ekstraksi_undangan_endpoint(mock_client_cls, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test_key")

    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    mock_response = MagicMock()
    mock_response.text = """{
        "nama_acara": "Sosialisasi Regulasi Kecerdasan Artifisial",
        "tanggal_mulai": "2026-11-01",
        "tanggal_selesai": "2026-11-01",
        "lokasi": "Hotel Mulia Senayan Jakarta",
        "topik": "Regulasi AI Nasional",
        "nomor_surat_undangan": "UND-999/KOMDIGI/XI/2026",
        "instansi_pengundang": "Kementerian Komunikasi dan Digital",
        "dasar_surat": "Surat Undangan Nomor UND-999 tanggal 20 Oktober 2026",
        "ringkasan": "Sosialisasi regulasi AI nasional."
    }"""
    mock_client.models.generate_content.return_value = mock_response

    files = {"file": ("undangan.pdf", b"%PDF-1.4 mock pdf content", "application/pdf")}
    res = client.post("/api/v1/ekstraksi/undangan", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["nama_acara"] == "Sosialisasi Regulasi Kecerdasan Artifisial"
    assert data["tanggal_mulai"] == "2026-11-01"
    assert data["lokasi"] == "Hotel Mulia Senayan Jakarta"
