# Written Verification Scheme – RU III Plaju

Aplikasi web untuk memonitor pelaksanaan Written Verification Scheme (WVS) terhadap Inspection, Testing, Preventive & Predictive Maintenance Equipment RU III Plaju.

## Akses

Aplikasi dibuka melalui halaman login (password). Seluruh data aplikasi di folder `data/` tersimpan dalam bentuk terenkripsi (AES-256-GCM, kunci diturunkan dari password dengan PBKDF2). Tanpa password yang benar, data tidak dapat dibaca, termasuk oleh orang yang membuka repository ini.

Password tidak disimpan di repository. Jika ingin mengganti password, data harus dienkripsi ulang dengan password baru.

## Isi aplikasi

- **Beranda**: jumlah GMS, EMS, PS dan WVS, serta breakdown peralatan IH08 berdasarkan Criticality dan kategori SECE.
- **GMS, EMS, PS, WVS**: pustaka dokumen beserta download Excel.
- **Reference**: TKO, TKI dan Pedoman.
- **Input Verifikasi**: checklist verifikasi dengan evidence, Good Practice, Verification Finding dan Recommendation, serta Generate Report Word.

## Evidence

Evidence dapat berupa foto, screenshot, PDF, Word (.doc/.docx) atau Excel (.xls/.xlsx), maksimal 5 MB per file.

## Penyimpanan data

Hasil verifikasi, evidence dan status WVS tersimpan di browser masing-masing pengguna (localStorage dan IndexedDB), tidak dibagikan ke pengguna lain. Data bisa hilang jika data situs di browser dihapus.

## Publikasi (GitHub Pages)

Settings → Pages → Source: *Deploy from a branch* → Branch: `main` / folder `/ (root)` → Save.

© Reliability RU III Plaju 2026
