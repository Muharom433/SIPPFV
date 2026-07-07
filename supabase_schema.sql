-- ─── Users ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL CHECK(role IN ('admin','user')),
    prodi_code  TEXT
);

-- ─── RKA / Pembelajaran items ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sip_items (
    id            SERIAL PRIMARY KEY,
    parent_id     INTEGER REFERENCES sip_items(id) ON DELETE CASCADE,
    level         INTEGER NOT NULL DEFAULT 1,
    code          TEXT    NOT NULL DEFAULT '',
    description   TEXT    NOT NULL DEFAULT '',
    volume        TEXT,
    unit          TEXT,
    price         REAL,
    amount        REAL DEFAULT 0,
    source_of_fund TEXT,
    performance_incentive REAL,
    receipt_link  TEXT,
    supporting_data_link TEXT,
    type          TEXT NOT NULL DEFAULT 'keuangan_rka',
    satuan        TEXT,
    target_univ   TEXT,
    target_unit   TEXT,
    capaian       TEXT,
    capaian_pct   TEXT,
    progress      TEXT,
    issues        TEXT,
    strategy      TEXT,
    jan REAL DEFAULT 0, feb REAL DEFAULT 0, mar REAL DEFAULT 0,
    apr REAL DEFAULT 0, mei REAL DEFAULT 0, jun REAL DEFAULT 0,
    jul REAL DEFAULT 0, aug REAL DEFAULT 0, sep REAL DEFAULT 0,
    oct REAL DEFAULT 0, nov REAL DEFAULT 0, dec REAL DEFAULT 0,
    prodi_code    TEXT,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Departemen ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departemen (
    id               SERIAL PRIMARY KEY,
    kode_departemen  TEXT UNIQUE NOT NULL,
    nama_departemen  TEXT NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Prodi Drive Links ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prodi_drive_links (
    id             SERIAL PRIMARY KEY,
    prodi_name     TEXT NOT NULL,
    prodi_code     TEXT NOT NULL,
    departemen_id  INTEGER REFERENCES departemen(id) ON DELETE SET NULL,
    link_perjanjian_kinerja   TEXT,
    link_template_kinerja     TEXT,
    link_tw1                  TEXT,
    link_tw2                  TEXT,
    link_bukti_dukung_tw1     TEXT,
    link_bukti_lama           TEXT,
    link_contoh_target        TEXT,
    keterangan TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Renstra Progress (per Prodi per Triwulan) ──────────────────────────
CREATE TABLE IF NOT EXISTS renstra_progress (
    id                    SERIAL PRIMARY KEY,
    item_id               INTEGER NOT NULL REFERENCES sip_items(id) ON DELETE CASCADE,
    prodi_code            TEXT NOT NULL,
    triwulan              INTEGER NOT NULL CHECK(triwulan IN (1, 2, 3, 4)),
    target_unit           TEXT,
    capaian               TEXT,
    capaian_pct           TEXT,
    progress              TEXT,
    issues                TEXT,
    strategy              TEXT,
    supporting_data_link  TEXT,
    amount                REAL DEFAULT 0,
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(item_id, prodi_code, triwulan)
);

-- ─── Purchases ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchases (
    id          SERIAL PRIMARY KEY,
    item_name   TEXT NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1,
    price       REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL DEFAULT 0,
    drive_link  TEXT NOT NULL,
    keterangan  TEXT,
    prodi_code  TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Loans ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
    id            SERIAL PRIMARY KEY,
    borrower_name TEXT NOT NULL,
    item_name     TEXT NOT NULL,
    quantity      INTEGER NOT NULL DEFAULT 1,
    loan_date     DATE NOT NULL,
    return_date   DATE,
    status        TEXT DEFAULT 'Dipinjam' CHECK(status IN ('Dipinjam','Kembali')),
    drive_link    TEXT NOT NULL,
    keterangan    TEXT,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Seed Initial Users ──────────────────────────────────────────────────
INSERT INTO users (username, password, role, prodi_code) VALUES
('admin', '$2b$10$L0gkd1u8aMUy6onfaLbs/.vyCf2G0Y4sTqt9pcv1/.1y.2/1O.qz.', 'admin', null),
('d4-te', '$2b$10$UD4AQRAq50vI8cE1wGoq5.kysL1990Lngc9xCXAYQzIanrk9fNnnK', 'user', 'D4-TE'),
('d4-tm', '$2b$10$UD4AQRAq50vI8cE1wGoq5.kysL1990Lngc9xCXAYQzIanrk9fNnnK', 'user', 'D4-TM'),
('d4-ti', '$2b$10$UD4AQRAq50vI8cE1wGoq5.kysL1990Lngc9xCXAYQzIanrk9fNnnK', 'user', 'D4-TI'),
('d4-ak', '$2b$10$UD4AQRAq50vI8cE1wGoq5.kysL1990Lngc9xCXAYQzIanrk9fNnnK', 'user', 'D4-AK'),
('d4-mp', '$2b$10$UD4AQRAq50vI8cE1wGoq5.kysL1990Lngc9xCXAYQzIanrk9fNnnK', 'user', 'D4-MP'),
('d4-ts', '$2b$10$UD4AQRAq50vI8cE1wGoq5.kysL1990Lngc9xCXAYQzIanrk9fNnnK', 'user', 'D4-TS'),
('d3-te', '$2b$10$UD4AQRAq50vI8cE1wGoq5.kysL1990Lngc9xCXAYQzIanrk9fNnnK', 'user', 'D3-TE'),
('d4-to', '$2b$10$UD4AQRAq50vI8cE1wGoq5.kysL1990Lngc9xCXAYQzIanrk9fNnnK', 'user', 'D4-TO'),
('d4-ap', '$2b$10$UD4AQRAq50vI8cE1wGoq5.kysL1990Lngc9xCXAYQzIanrk9fNnnK', 'user', 'D4-AP'),
('d4-tb', '$2b$10$UD4AQRAq50vI8cE1wGoq5.kysL1990Lngc9xCXAYQzIanrk9fNnnK', 'user', 'D4-TB'),
('d4-tbu', '$2b$10$UD4AQRAq50vI8cE1wGoq5.kysL1990Lngc9xCXAYQzIanrk9fNnnK', 'user', 'D4-TBU'),
('d4-trk', '$2b$10$UD4AQRAq50vI8cE1wGoq5.kysL1990Lngc9xCXAYQzIanrk9fNnnK', 'user', 'D4-TRK'),
('d4-pur', '$2b$10$UD4AQRAq50vI8cE1wGoq5.kysL1990Lngc9xCXAYQzIanrk9fNnnK', 'user', 'D4-PUR'),
('d4-pti', '$2b$10$UD4AQRAq50vI8cE1wGoq5.kysL1990Lngc9xCXAYQzIanrk9fNnnK', 'user', 'D4-PTI'),
('d4-pk', '$2b$10$UD4AQRAq50vI8cE1wGoq5.kysL1990Lngc9xCXAYQzIanrk9fNnnK', 'user', 'D4-PK')
ON CONFLICT DO NOTHING;

-- ─── Seed Initial Prodi Drive Links ──────────────────────────────────────
INSERT INTO prodi_drive_links (prodi_name, prodi_code) VALUES
('D4 Teknik Elektro', 'D4-TE'),
('D4 Teknik Mesin', 'D4-TM'),
('D4 Teknik Informatika', 'D4-TI'),
('D4 Akuntansi', 'D4-AK'),
('D4 Manajemen Pemasaran', 'D4-MP'),
('D4 Teknik Sipil', 'D4-TS'),
('D3 Teknik Elektronika', 'D3-TE'),
('D4 Teknik Otomotif', 'D4-TO'),
('D4 Administrasi Perkantoran', 'D4-AP'),
('D4 Tata Boga', 'D4-TB'),
('D4 Tata Busana', 'D4-TBU'),
('D4 Tata Rias dan Kecantikan', 'D4-TRK'),
('D4 Pengelolaan Usaha Rekreasi', 'D4-PUR'),
('D4 Pengobatan Tradisional Indonesia', 'D4-PTI'),
('D4 Promosi Kesehatan', 'D4-PK');
