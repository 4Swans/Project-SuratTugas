import io
from unittest.mock import MagicMock, patch

import docx
import pytest
from fastapi import HTTPException

from app.schemas.ekstraksi import EkstraksiUndanganResponse
from app.services.ekstraksi_service import extract_text_from_docx, extract_undangan


def test_extract_text_from_docx():
    doc = docx.Document()
    doc.add_paragraph("KEMENTERIAN KOMUNIKASI DAN DIGITAL RI")
    doc.add_paragraph("Undangan Rapat Koordinasi Nasional")

    table = doc.add_table(rows=2, cols=2)
    table.rows[0].cells[0].text = "Hari/Tanggal"
    table.rows[0].cells[1].text = "Senin, 10 Oktober 2026"
    table.rows[1].cells[0].text = "Tempat"
    table.rows[1].cells[1].text = "Ruang Rapat Lantai 2"

    bio = io.BytesIO()
    doc.save(bio)
    file_bytes = bio.getvalue()

    extracted = extract_text_from_docx(file_bytes)
    assert "KEMENTERIAN KOMUNIKASI DAN DIGITAL RI" in extracted
    assert "Rapat Koordinasi Nasional" in extracted
    assert "Senin, 10 Oktober 2026" in extracted
    assert "Ruang Rapat Lantai 2" in extracted


def test_extract_undangan_missing_api_key(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    with pytest.raises(HTTPException) as exc_info:
        extract_undangan(b"dummy pdf content", "undangan.pdf")
    assert exc_info.value.status_code == 400
    assert "GEMINI_API_KEY" in exc_info.value.detail


@patch("app.services.ekstraksi_service.genai.Client")
def test_extract_undangan_success_mock(mock_client_cls, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "GEMINI_API_KEY", "dummy_key_for_testing")

    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    mock_response = MagicMock()
    mock_response.text = """{
        "nama_acara": "Rapat Pembahasan Transformasi Digital",
        "tanggal_mulai": "2026-10-15",
        "tanggal_selesai": "2026-10-16",
        "lokasi": "Hotel Borobudur Jakarta",
        "topik": "Percepatan Transformasi Digital",
        "nomor_surat_undangan": "UND-001/KOMDIGI/X/2026",
        "instansi_pengundang": "Pusat Kebijakan Strategis",
        "dasar_surat": "Surat Undangan Nomor UND-001 tanggal 10 Oktober 2026",
        "ringkasan": "Undangan rapat pembahasan transformasi digital."
    }"""

    mock_client.models.generate_content.return_value = mock_response

    result = extract_undangan(b"%PDF-1.4 dummy", "undangan.pdf")

    assert isinstance(result, EkstraksiUndanganResponse)
    assert result.nama_acara == "Rapat Pembahasan Transformasi Digital"
    assert result.tanggal_mulai == "2026-10-15"
    assert result.tanggal_selesai == "2026-10-16"
    assert result.lokasi == "Hotel Borobudur Jakarta"
    assert result.file_name == "undangan.pdf"
