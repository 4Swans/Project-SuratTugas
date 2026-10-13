import os
import sys
import pandas as pd
from datetime import datetime

# Add app directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import SessionLocal
from app.models.nomor_surat import NomorSurat
from app.models.surat_tugas import SuratTugas

BULAN_MAP = {
    'januari': 1, 'februari': 2, 'maret': 3, 'april': 4, 'mei': 5, 'juni': 6,
    'juli': 7, 'agustus': 8, 'september': 9, 'oktober': 10, 'november': 11, 'desember': 12
}

def parse_tgl(tgl_str):
    if not isinstance(tgl_str, str) or not tgl_str.strip():
        return datetime(2026, 1, 1, 8, 0, 0)
    parts = tgl_str.strip().split()
    if len(parts) == 3:
        try:
            d = int(parts[0])
            m = BULAN_MAP.get(parts[1].lower(), 1)
            y = int(parts[2])
            return datetime(y, m, d, 8, 0, 0)
        except Exception:
            pass
    return datetime(2026, 1, 1, 8, 0, 0)

def sync_csv_to_db():
    csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Data', 'Database_Surat_Tugas_PUSAKA.xlsx - Register_2026.csv'))
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return

    df = pd.read_csv(csv_path)
    df_clean = df.dropna(subset=['nomor_urut']).copy()
    df_clean['nomor_urut'] = df_clean['nomor_urut'].astype(int)

    db = SessionLocal()
    try:
        # Check existing numbers in DB
        existing_numbers = {
            r.nomor_urut: r for r in db.query(NomorSurat).filter(NomorSurat.tahun == 2026).all()
        }
        print(f"Existing nomor_surat count in DB: {len(existing_numbers)}")

        inserted_count = 0
        updated_count = 0

        for _, row in df_clean.iterrows():
            n_urut = int(row['nomor_urut'])
            dt = parse_tgl(row['tanggal'])
            tahun = dt.year
            bulan_str = f"{dt.month:02d}"
            nomor_lengkap = f"{n_urut}/SJ.9/KP.01.06/{bulan_str}/{tahun}"
            perihal = str(row['hal']) if pd.notnull(row['hal']) else f"{row.get('jenis', 'Surat')} - {row.get('kepada', '')}"
            dibuat_oleh = f"Register Pusaka ({row.get('topik_tim', 'TU')})"

            if n_urut not in existing_numbers:
                obj = NomorSurat(
                    nomor_urut=n_urut,
                    tahun=tahun,
                    nomor_lengkap=nomor_lengkap,
                    tanggal_dibuat=dt,
                    perihal=perihal[:500] if perihal else None,
                    dibuat_oleh=dibuat_oleh[:100]
                )
                db.add(obj)
                existing_numbers[n_urut] = obj
                inserted_count += 1
            else:
                # Update existing record if it was dummy test data
                rec = existing_numbers[n_urut]
                if rec.dibuat_oleh and "Staf" in rec.dibuat_oleh:
                    rec.perihal = perihal[:500] if perihal else rec.perihal
                    rec.dibuat_oleh = dibuat_oleh[:100]
                    updated_count += 1

        db.commit()
        print(f"Successfully synced: {inserted_count} new records added, {updated_count} records updated.")

        # Check maximum nomor_urut now
        max_urut = db.query(NomorSurat).filter(NomorSurat.tahun == 2026).order_by(NomorSurat.nomor_urut.desc()).first()
        print(f"Current MAX nomor_urut in DB: {max_urut.nomor_urut} ({max_urut.nomor_lengkap})")
        print(f"Next Surat Tugas will be: {max_urut.nomor_urut + 1}/SJ.9/KP.01.06/{datetime.now().month:02d}/2026")

    except Exception as e:
        db.rollback()
        print(f"Error syncing data: {e}")
        raise
    finally:
        db.close()

if __name__ == '__main__':
    sync_csv_to_db()
