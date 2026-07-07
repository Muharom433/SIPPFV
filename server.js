require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'sipp_fallback_secret_key_vokasi_uny_2026';

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL atau SUPABASE_ANON_KEY tidak ditemukan di .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── MIDDLEWARE Auth ──────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
    
    if (!token) {
        return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
        if (err) {
            return res.status(403).json({ error: 'Token tidak valid atau telah kedaluwarsa.' });
        }
        req.user = decodedUser;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    authenticateToken(req, res, () => {
        if (req.user.role === 'admin') return next();
        res.status(403).json({ error: 'Akses ditolak. Hanya Admin yang dapat melakukan tindakan ini.' });
    });
};

const requireAdminOrMatchingProdi = (req, res, next) => {
    authenticateToken(req, res, async () => {
        const { role, username, prodi_code } = req.user;
        if (role === 'admin') return next();
        
        try {
            const prodiId = req.params.id;
            const { data: prodi } = await supabase.from('prodi_drive_links').select('prodi_code').eq('id', prodiId).single();
            
            if (prodi && prodi.prodi_code && prodi_code === prodi.prodi_code) {
                return next();
            }
        } catch (e) {
            console.error('Auth check error:', e.message);
        }
        
        res.status(403).json({ error: 'Akses ditolak. Anda hanya dapat mengedit data prodi Anda sendiri.' });
    });
};

// ─── API: AUTH LOGIN ──────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username dan password wajib diisi.' });
        }
        
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username.toLowerCase())
            .single();
            
        if (userError || !user) {
            return res.status(401).json({ error: 'Username atau password salah.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Username atau password salah.' });
        }
        
        let prodi_name = null;
        if (user.prodi_code) {
            const { data: prodi } = await supabase
                .from('prodi_drive_links')
                .select('prodi_name')
                .eq('prodi_code', user.prodi_code)
                .single();
            if (prodi) prodi_name = prodi.prodi_name;
        }
        
        const tokenPayload = {
            id: user.id,
            username: user.username,
            role: user.role,
            prodi_code: user.prodi_code,
            prodi_name: prodi_name
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({
            token,
            user: tokenPayload
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const validateDriveLink = (url) => {
    if (!url) return false;
    const str = String(url).trim();
    if (str.startsWith('{') && str.endsWith('}')) {
        try {
            const obj = JSON.parse(str);
            if (typeof obj === 'object' && obj !== null) {
                for (const key in obj) {
                    const link = obj[key];
                    if (link && link.trim() !== '') {
                        if (!link.startsWith('http://') && !link.startsWith('https://')) {
                            return false;
                        }
                    }
                }
                return true;
            }
        } catch (e) {
            return false;
        }
    }
    return str.startsWith('http://') || str.startsWith('https://');
};

// ─── API: SIPP ITEMS ───────────────────────────────────────────────────────────
app.get('/api/items', authenticateToken, async (req, res) => {
    try {
        const type = req.query.type || 'keuangan_rka';
        const { data, error } = await supabase
            .from('sip_items')
            .select('*')
            .eq('type', type)
            .order('id', { ascending: true });
        
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/items', authenticateToken, async (req, res) => {
    try {
        const b = req.body;
        if (!b.description) return res.status(400).json({ error: 'Uraian/Deskripsi wajib diisi.' });
        if (b.receipt_link && !validateDriveLink(b.receipt_link))
            return res.status(400).json({ error: 'Kuitansi harus berupa URL (http/https).' });
        if (b.supporting_data_link && !validateDriveLink(b.supporting_data_link))
            return res.status(400).json({ error: 'Data Dukung harus berupa URL (http/https).' });

        let prodiCode = b.prodi_code || null;

        // Validasi Otorisasi (Otoritas Peran)
        if (req.user.role !== 'admin') {
            // User prodi hanya bisa membuat sub-item (wajib parent_id)
            if (!b.parent_id) {
                return res.status(403).json({ error: 'Akses ditolak. Hanya Admin yang dapat membuat indikator/kegiatan utama (Level 1).' });
            }
            // Periksa apakah parent_id valid dan dimiliki oleh prodi yang sama
            const { data: parentItem, error: parentError } = await supabase
                .from('sip_items')
                .select('*')
                .eq('id', b.parent_id)
                .single();

            if (parentError || !parentItem) {
                return res.status(400).json({ error: 'Item induk tidak ditemukan.' });
            }

            if (parentItem.prodi_code !== req.user.prodi_code) {
                return res.status(403).json({ error: 'Akses ditolak. Anda hanya bisa membuat sub-item di bawah kegiatan milik prodi Anda sendiri.' });
            }

            // Sub-item otomatis mewarisi prodi_code dari induknya
            prodiCode = parentItem.prodi_code;
        }

        const insertObj = {
            parent_id: b.parent_id || null,
            level: b.level || 1,
            code: b.code || '',
            description: b.description,
            volume: b.volume || null,
            unit: b.unit || null,
            price: b.price || null,
            amount: b.amount || 0,
            source_of_fund: b.source_of_fund || null,
            performance_incentive: b.performance_incentive || null,
            receipt_link: b.receipt_link || null,
            supporting_data_link: b.supporting_data_link || null,
            type: b.type || 'keuangan_rka',
            satuan: b.satuan || null,
            target_univ: b.target_univ || null,
            target_unit: b.target_unit || null,
            capaian: b.capaian || null,
            capaian_pct: b.capaian_pct || null,
            progress: b.progress || null,
            issues: b.issues || null,
            strategy: b.strategy || null,
            prodi_code: prodiCode,
            jan: b.jan || 0, feb: b.feb || 0, mar: b.mar || 0,
            apr: b.apr || 0, mei: b.mei || 0, jun: b.jun || 0,
            jul: b.jul || 0, aug: b.aug || 0, sep: b.sep || 0,
            oct: b.oct || 0, nov: b.nov || 0, dec: b.dec || 0
        };
        if (b.created_at) insertObj.created_at = b.created_at;

        const { data, error } = await supabase.from('sip_items').insert([insertObj]).select();
        
        if (error) throw error;
        res.json({ id: data[0].id, message: 'Item berhasil ditambahkan.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/items/import-renstra', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { items, year } = req.body;
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Data items tidak valid.' });
        }

        const startDate = `${year}-01-01T00:00:00.000Z`;
        const endDate = `${year}-12-31T23:59:59.999Z`;

        // 1. Delete existing renstra items for the selected year
        const { error: deleteError } = await supabase
            .from('sip_items')
            .delete()
            .eq('type', 'renstra')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        if (deleteError) throw deleteError;

        // 2. Insert items level by level
        const tempToDbIdMap = {};

        // Insert Level 1
        const level1Items = items.filter(item => item.level === 1);
        for (const item of level1Items) {
            const { data, error } = await supabase
                .from('sip_items')
                .insert({
                    level: 1,
                    code: item.code,
                    description: item.description,
                    satuan: item.satuan,
                    target_univ: item.target_univ || null,
                    target_unit: item.target_unit || null,
                    amount: item.amount || 0,
                    type: 'renstra',
                    created_at: new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString()
                })
                .select();

            if (error) throw error;
            tempToDbIdMap[item.tempId] = data[0].id;
        }

        // Insert Level 2
        const level2Items = items.filter(item => item.level === 2);
        for (const item of level2Items) {
            const dbParentId = tempToDbIdMap[item.tempParentId];
            const { data, error } = await supabase
                .from('sip_items')
                .insert({
                    level: 2,
                    parent_id: dbParentId || null,
                    code: item.code,
                    description: item.description,
                    satuan: item.satuan,
                    target_univ: item.target_univ || null,
                    target_unit: item.target_unit || null,
                    amount: item.amount || 0,
                    type: 'renstra',
                    created_at: new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString()
                })
                .select();

            if (error) throw error;
            tempToDbIdMap[item.tempId] = data[0].id;
        }

        // Insert Level 3
        const level3Items = items.filter(item => item.level === 3);
        for (const item of level3Items) {
            const dbParentId = tempToDbIdMap[item.tempParentId];
            const { data, error } = await supabase
                .from('sip_items')
                .insert({
                    level: 3,
                    parent_id: dbParentId || null,
                    code: item.code,
                    description: item.description,
                    satuan: item.satuan,
                    target_univ: item.target_univ || null,
                    target_unit: item.target_unit || null,
                    amount: item.amount || 0,
                    type: 'renstra',
                    created_at: new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString()
                })
                .select();

            if (error) throw error;
            tempToDbIdMap[item.tempId] = data[0].id;
        }

        // Insert Level 4
        const level4Items = items.filter(item => item.level === 4);
        for (const item of level4Items) {
            const dbParentId = tempToDbIdMap[item.tempParentId];
            const { data, error } = await supabase
                .from('sip_items')
                .insert({
                    level: 4,
                    parent_id: dbParentId || null,
                    code: item.code,
                    description: item.description,
                    satuan: item.satuan,
                    target_univ: item.target_univ || null,
                    target_unit: item.target_unit || null,
                    amount: item.amount || 0,
                    type: 'renstra',
                    created_at: new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString()
                })
                .select();

        }

        // Insert Level 5
        const level5Items = items.filter(item => item.level === 5);
        for (const item of level5Items) {
            const dbParentId = tempToDbIdMap[item.tempParentId];
            const { data, error } = await supabase
                .from('sip_items')
                .insert({
                    level: 5,
                    parent_id: dbParentId || null,
                    code: item.code || '',
                    description: item.description,
                    satuan: item.satuan || null,
                    target_univ: item.target_univ || null,
                    target_unit: item.target_unit || null,
                    amount: item.amount || 0,
                    type: 'renstra',
                    created_at: new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString()
                })
                .select();

            if (error) throw error;
            tempToDbIdMap[item.tempId] = data[0].id;
        }

        res.json({ message: 'Import Renstra dari Excel berhasil.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/items/:id', authenticateToken, async (req, res) => {
    try {
        const b = req.body;
        if (b.receipt_link && !validateDriveLink(b.receipt_link))
            return res.status(400).json({ error: 'Kuitansi harus berupa URL.' });
        if (b.supporting_data_link && !validateDriveLink(b.supporting_data_link))
            return res.status(400).json({ error: 'Data Dukung harus berupa URL.' });

        // Dapatkan data item lama dari database
        const { data: existingItem, error: getError } = await supabase
            .from('sip_items')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (getError || !existingItem) {
            return res.status(404).json({ error: 'Item tidak ditemukan.' });
        }

        let updateObj = {};

        if (req.user.role === 'admin') {
            // Admin bisa mengedit segalanya
            updateObj = {
                parent_id: b.parent_id !== undefined ? b.parent_id : existingItem.parent_id,
                level: b.level !== undefined ? b.level : existingItem.level,
                code: b.code !== undefined ? b.code : existingItem.code,
                description: b.description !== undefined ? b.description : existingItem.description,
                volume: b.volume !== undefined ? b.volume : existingItem.volume,
                unit: b.unit !== undefined ? b.unit : existingItem.unit,
                price: b.price !== undefined ? b.price : existingItem.price,
                amount: b.amount !== undefined ? b.amount : existingItem.amount,
                source_of_fund: b.source_of_fund !== undefined ? b.source_of_fund : existingItem.source_of_fund,
                performance_incentive: b.performance_incentive !== undefined ? b.performance_incentive : existingItem.performance_incentive,
                receipt_link: b.receipt_link !== undefined ? b.receipt_link : existingItem.receipt_link,
                supporting_data_link: b.supporting_data_link !== undefined ? b.supporting_data_link : existingItem.supporting_data_link,
                satuan: b.satuan !== undefined ? b.satuan : existingItem.satuan,
                target_univ: b.target_univ !== undefined ? b.target_univ : existingItem.target_univ,
                target_unit: b.target_unit !== undefined ? b.target_unit : existingItem.target_unit,
                capaian: b.capaian !== undefined ? b.capaian : existingItem.capaian,
                capaian_pct: b.capaian_pct !== undefined ? b.capaian_pct : existingItem.capaian_pct,
                progress: b.progress !== undefined ? b.progress : existingItem.progress,
                issues: b.issues !== undefined ? b.issues : existingItem.issues,
                strategy: b.strategy !== undefined ? b.strategy : existingItem.strategy,
                prodi_code: b.prodi_code !== undefined ? b.prodi_code : existingItem.prodi_code,
                jan: b.jan !== undefined ? b.jan : existingItem.jan,
                feb: b.feb !== undefined ? b.feb : existingItem.feb,
                mar: b.mar !== undefined ? b.mar : existingItem.mar,
                apr: b.apr !== undefined ? b.apr : existingItem.apr,
                mei: b.mei !== undefined ? b.mei : existingItem.mei,
                jun: b.jun !== undefined ? b.jun : existingItem.jun,
                jul: b.jul !== undefined ? b.jul : existingItem.jul,
                aug: b.aug !== undefined ? b.aug : existingItem.aug,
                sep: b.sep !== undefined ? b.sep : existingItem.sep,
                oct: b.oct !== undefined ? b.oct : existingItem.oct,
                nov: b.nov !== undefined ? b.nov : existingItem.nov,
                dec: b.dec !== undefined ? b.dec : existingItem.dec
            };
        } else {
            // User prodi hanya bisa mengedit item miliknya sendiri, kecuali jika tipenya 'renstra'
            // dimana mereka bisa mengisi target_unit
            const isRenstra = existingItem.type === 'renstra';
            const isOwner = existingItem.prodi_code === req.user.prodi_code;

            if (!isOwner && !isRenstra) {
                return res.status(403).json({ error: 'Akses ditolak. Anda hanya dapat mengedit kegiatan milik prodi Anda sendiri.' });
            }

            updateObj = {
                description: (isOwner && b.description !== undefined) ? b.description : existingItem.description,
                volume: (isOwner && b.volume !== undefined) ? b.volume : existingItem.volume,
                unit: (isOwner && b.unit !== undefined) ? b.unit : existingItem.unit,
                price: (isOwner && b.price !== undefined) ? b.price : existingItem.price,
                amount: (isOwner && b.amount !== undefined) ? b.amount : existingItem.amount,
                source_of_fund: (isOwner && b.source_of_fund !== undefined) ? b.source_of_fund : existingItem.source_of_fund,
                performance_incentive: (isOwner && b.performance_incentive !== undefined) ? b.performance_incentive : existingItem.performance_incentive,
                receipt_link: (isOwner && b.receipt_link !== undefined) ? b.receipt_link : existingItem.receipt_link,
                supporting_data_link: (isOwner && b.supporting_data_link !== undefined) ? b.supporting_data_link : existingItem.supporting_data_link,
                satuan: (isOwner && b.satuan !== undefined) ? b.satuan : existingItem.satuan,
                capaian: (isOwner && b.capaian !== undefined) ? b.capaian : existingItem.capaian,
                capaian_pct: (isOwner && b.capaian_pct !== undefined) ? b.capaian_pct : existingItem.capaian_pct,
                progress: (isOwner && b.progress !== undefined) ? b.progress : existingItem.progress,
                issues: (isOwner && b.issues !== undefined) ? b.issues : existingItem.issues,
                strategy: (isOwner && b.strategy !== undefined) ? b.strategy : existingItem.strategy,
                jan: (isOwner && b.jan !== undefined) ? b.jan : existingItem.jan,
                feb: (isOwner && b.feb !== undefined) ? b.feb : existingItem.feb,
                mar: (isOwner && b.mar !== undefined) ? b.mar : existingItem.mar,
                apr: (isOwner && b.apr !== undefined) ? b.apr : existingItem.apr,
                mei: (isOwner && b.mei !== undefined) ? b.mei : existingItem.mei,
                jun: (isOwner && b.jun !== undefined) ? b.jun : existingItem.jun,
                jul: (isOwner && b.jul !== undefined) ? b.jul : existingItem.jul,
                aug: (isOwner && b.aug !== undefined) ? b.aug : existingItem.aug,
                sep: (isOwner && b.sep !== undefined) ? b.sep : existingItem.sep,
                oct: (isOwner && b.oct !== undefined) ? b.oct : existingItem.oct,
                nov: (isOwner && b.nov !== undefined) ? b.nov : existingItem.nov,
                dec: (isOwner && b.dec !== undefined) ? b.dec : existingItem.dec,
                
                // Target Unit bisa diisi oleh prodi untuk data renstra manapun
                target_unit: b.target_unit !== undefined ? b.target_unit : existingItem.target_unit,
                
                // Target Fakultas tidak boleh diubah oleh prodi
                target_univ: existingItem.target_univ
            };
        }
        if (b.created_at) updateObj.created_at = b.created_at;

        const { error } = await supabase.from('sip_items').update(updateObj).eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Item diperbarui.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/items/:id/drive-link', authenticateToken, async (req, res) => {
    try {
        const { field, link } = req.body;
        const allowed = ['supporting_data_link', 'receipt_link'];
        if (!allowed.includes(field)) return res.status(400).json({ error: 'Field tidak valid.' });
        if (!validateDriveLink(link)) return res.status(400).json({ error: 'Link harus berupa URL (http/https).' });
        
        // Otorisasi
        if (req.user.role !== 'admin') {
            const { data: existingItem, error: getError } = await supabase
                .from('sip_items')
                .select('prodi_code')
                .eq('id', req.params.id)
                .single();

            if (getError || !existingItem) {
                return res.status(404).json({ error: 'Item tidak ditemukan.' });
            }

            if (existingItem.prodi_code !== req.user.prodi_code) {
                return res.status(403).json({ error: 'Akses ditolak. Anda hanya dapat memperbarui data milik prodi Anda sendiri.' });
            }
        }

        const { error } = await supabase.from('sip_items').update({ [field]: link }).eq('id', req.params.id);
        if (error) throw error;
        
        res.json({ message: 'Link Drive disimpan.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/items/:id', authenticateToken, async (req, res) => {
    try {
        // Otorisasi
        if (req.user.role !== 'admin') {
            const { data: existingItem, error: getError } = await supabase
                .from('sip_items')
                .select('*')
                .eq('id', req.params.id)
                .single();

            if (getError || !existingItem) {
                return res.status(404).json({ error: 'Item tidak ditemukan.' });
            }

            if (existingItem.prodi_code !== req.user.prodi_code) {
                return res.status(403).json({ error: 'Akses ditolak. Anda hanya dapat menghapus data milik prodi Anda sendiri.' });
            }

            // User prodi tidak boleh menghapus item utama (Level 1)
            if (existingItem.level <= 1) {
                return res.status(403).json({ error: 'Akses ditolak. Hanya Admin yang dapat menghapus kegiatan/sasaran utama (Level 1).' });
            }
        }

        const { error } = await supabase.from('sip_items').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Item dihapus.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: RENSTRA PROGRESS (per Prodi per Triwulan) ──────────────────────────
app.get('/api/renstra-progress', authenticateToken, async (req, res) => {
    try {
        const { prodi_code, triwulan } = req.query;
        if (!prodi_code || !triwulan) {
            return res.status(400).json({ error: 'prodi_code dan triwulan wajib diisi.' });
        }

        const { data, error } = await supabase
            .from('renstra_progress')
            .select('*')
            .eq('prodi_code', prodi_code)
            .eq('triwulan', parseInt(triwulan))
            .order('item_id', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/renstra-progress', authenticateToken, async (req, res) => {
    try {
        const b = req.body;
        if (!b.item_id || !b.prodi_code || !b.triwulan) {
            return res.status(400).json({ error: 'item_id, prodi_code, dan triwulan wajib diisi.' });
        }

        // Authorization: admin can edit all, user can only edit their own prodi
        if (req.user.role !== 'admin') {
            if (req.user.prodi_code !== b.prodi_code) {
                return res.status(403).json({ error: 'Akses ditolak. Anda hanya dapat mengedit data prodi Anda sendiri.' });
            }
        }

        const upsertObj = {
            item_id: parseInt(b.item_id),
            prodi_code: b.prodi_code,
            triwulan: parseInt(b.triwulan),
            target_unit: b.target_unit !== undefined ? b.target_unit : null,
            capaian: b.capaian !== undefined ? b.capaian : null,
            capaian_pct: b.capaian_pct !== undefined ? b.capaian_pct : null,
            progress: b.progress !== undefined ? b.progress : null,
            issues: b.issues !== undefined ? b.issues : null,
            strategy: b.strategy !== undefined ? b.strategy : null,
            supporting_data_link: b.supporting_data_link !== undefined ? b.supporting_data_link : null,
            amount: b.amount !== undefined ? parseFloat(b.amount) || 0 : 0,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('renstra_progress')
            .upsert(upsertObj, { onConflict: 'item_id,prodi_code,triwulan' })
            .select();

        if (error) throw error;
        res.json({ message: 'Progress Renstra disimpan.', data: data ? data[0] : null });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: PRODI DRIVE LINKS ──────────────────────────────────────────────────
app.get('/api/prodi-links', authenticateToken, async (req, res) => {
    try {
        const role = req.user.role;
        const username = req.user.username;
        
        let query = supabase.from('prodi_drive_links').select('*, departemen(id, kode_departemen, nama_departemen)').order('prodi_name', { ascending: true });
        
        if (role !== 'admin') {
            const { data: user } = await supabase.from('users').select('prodi_code').eq('username', username).single();
            if (user && user.prodi_code) {
                query = query.eq('prodi_code', user.prodi_code);
            } else {
                return res.json([]);
            }
        }
        
        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/prodi-links/:id', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from('prodi_drive_links').select('*, departemen(id, kode_departemen, nama_departemen)').eq('id', req.params.id).single();
        if (error || !data) return res.status(404).json({ error: 'Prodi tidak ditemukan.' });
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/prodi-links', requireAdmin, async (req, res) => {
    try {
        const b = req.body;
        if (!b.prodi_name || !b.prodi_code)
            return res.status(400).json({ error: 'Nama Prodi dan Kode Prodi wajib diisi.' });

        const linkFields = ['link_perjanjian_kinerja','link_template_kinerja','link_tw1','link_tw2',
                            'link_bukti_dukung_tw1','link_bukti_lama','link_contoh_target'];
        for (const f of linkFields) {
            if (b[f] && !validateDriveLink(b[f]))
                return res.status(400).json({ error: `${f} harus berupa URL Google Drive (http/https).` });
        }

        const { data, error } = await supabase.from('prodi_drive_links').insert([{
            prodi_name: b.prodi_name,
            prodi_code: b.prodi_code,
            departemen_id: b.departemen_id || null,
            link_perjanjian_kinerja: b.link_perjanjian_kinerja || '',
            link_template_kinerja: b.link_template_kinerja || '',
            link_tw1: b.link_tw1 || '',
            link_tw2: b.link_tw2 || '',
            link_bukti_dukung_tw1: b.link_bukti_dukung_tw1 || '',
            link_bukti_lama: b.link_bukti_lama || '',
            link_contoh_target: b.link_contoh_target || '',
            keterangan: b.keterangan || ''
        }]).select();

        if (error) throw error;

        // Auto-create user for new prodi
        const newUsername = b.prodi_code.toLowerCase();
        const { data: existingUser, error: checkErr } = await supabase.from('users')
            .select('id')
            .eq('username', newUsername)
            .maybeSingle();
        if (checkErr) throw checkErr;

        if (!existingUser) {
            const { error: insertErr } = await supabase.from('users').insert([{
                username: newUsername,
                password: 'vokasi123',
                role: 'user',
                prodi_code: b.prodi_code
            }]);
            if (insertErr) throw insertErr;
        }

        res.json({ id: data[0].id, message: 'Data prodi berhasil ditambahkan.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/prodi-links/:id', requireAdminOrMatchingProdi, async (req, res) => {
    try {
        const b = req.body;
        const role = req.user.role;
        
        const linkFields = ['link_perjanjian_kinerja','link_template_kinerja','link_tw1','link_tw2',
                            'link_bukti_dukung_tw1','link_bukti_lama','link_contoh_target'];
        for (const f of linkFields) {
            if (b[f] && !validateDriveLink(b[f]))
                return res.status(400).json({ error: `${f} harus berupa URL (http/https).` });
        }

        let updateData = {
            link_perjanjian_kinerja: b.link_perjanjian_kinerja || '',
            link_template_kinerja: b.link_template_kinerja || '',
            link_tw1: b.link_tw1 || '',
            link_tw2: b.link_tw2 || '',
            link_bukti_dukung_tw1: b.link_bukti_dukung_tw1 || '',
            link_bukti_lama: b.link_bukti_lama || '',
            link_contoh_target: b.link_contoh_target || '',
            keterangan: b.keterangan || '',
            updated_at: new Date().toISOString()
        };

        if (role === 'admin') {
            updateData.prodi_name = b.prodi_name;
            updateData.prodi_code = b.prodi_code;
            updateData.departemen_id = b.departemen_id !== undefined ? (b.departemen_id || null) : undefined;
            // Remove undefined keys
            Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);
        }

        // Get old prodi_code before updating (needed to sync users table)
        const { data: existing, error: fetchErr } = await supabase.from('prodi_drive_links')
            .select('prodi_code')
            .eq('id', req.params.id)
            .single();
        if (fetchErr) throw fetchErr;

        const { error } = await supabase.from('prodi_drive_links').update(updateData).eq('id', req.params.id);
        if (error) throw error;

        // If admin changed prodi_code or we want to ensure the user is synced/created
        if (role === 'admin' && b.prodi_code) {
            const newCode = b.prodi_code;
            const newUsername = newCode.toLowerCase();
            const oldCode = existing ? existing.prodi_code : null;

            // 1. Check if user already exists with the new prodi_code
            const { data: userByNewCode, error: errNewCode } = await supabase.from('users')
                .select('*')
                .eq('prodi_code', newCode)
                .maybeSingle();
            if (errNewCode) throw errNewCode;

            if (userByNewCode) {
                // User exists with new code, make sure username matches
                if (userByNewCode.username !== newUsername) {
                    const { error: updateErr } = await supabase.from('users')
                        .update({ username: newUsername })
                        .eq('id', userByNewCode.id);
                    if (updateErr) throw updateErr;
                }
            } else {
                // No user has the new prodi_code. 
                // Let's check if a user has the old prodi_code (if we changed it)
                let userToUpdate = null;
                if (oldCode && oldCode !== newCode) {
                    const { data: userByOldCode, error: errOldCode } = await supabase.from('users')
                        .select('*')
                        .eq('prodi_code', oldCode)
                        .maybeSingle();
                    if (errOldCode) throw errOldCode;
                    userToUpdate = userByOldCode;
                }

                if (userToUpdate) {
                    // Update the existing user to the new code and username
                    const { error: updateErr } = await supabase.from('users')
                        .update({ username: newUsername, prodi_code: newCode })
                        .eq('id', userToUpdate.id);
                    if (updateErr) throw updateErr;
                } else {
                    // No user found with old code either.
                    // Check if a user with the new username exists (perhaps created manually or without prodi_code)
                    const { data: userByUsername, error: errUsername } = await supabase.from('users')
                        .select('*')
                        .eq('username', newUsername)
                        .maybeSingle();
                    if (errUsername) throw errUsername;

                    if (userByUsername) {
                        // Update this user's prodi_code
                        const { error: updateErr } = await supabase.from('users')
                            .update({ prodi_code: newCode })
                            .eq('id', userByUsername.id);
                        if (updateErr) throw updateErr;
                    } else {
                        // Create a brand new user
                        const { error: insertErr } = await supabase.from('users')
                            .insert([{
                                username: newUsername,
                                password: 'vokasi123',
                                role: 'user',
                                prodi_code: newCode
                            }]);
                        if (insertErr) throw insertErr;
                    }
                }
            }
        }

        res.json({ message: 'Data prodi diperbarui.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/prodi-links/:id', requireAdmin, async (req, res) => {
    try {
        const { data: prodi } = await supabase.from('prodi_drive_links').select('prodi_code').eq('id', req.params.id).single();
        if (!prodi) return res.status(404).json({ error: 'Prodi tidak ditemukan.' });

        const { error } = await supabase.from('prodi_drive_links').delete().eq('id', req.params.id);
        if (error) throw error;
        
        await supabase.from('users').delete().eq('prodi_code', prodi.prodi_code);
        res.json({ message: 'Prodi dan user terkait berhasil dihapus.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── API: DEPARTEMEN (Admin Only) ─────────────────────────────────────────────
app.get('/api/departemen', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('departemen')
            .select('*')
            .order('kode_departemen', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/departemen', requireAdmin, async (req, res) => {
    try {
        const { kode_departemen, nama_departemen } = req.body;
        if (!kode_departemen || !nama_departemen)
            return res.status(400).json({ error: 'Kode Departemen dan Nama Departemen wajib diisi.' });

        const { data, error } = await supabase.from('departemen').insert([{
            kode_departemen,
            nama_departemen
        }]).select();

        if (error) throw error;
        res.json({ id: data[0].id, message: 'Departemen berhasil ditambahkan.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/departemen/:id', requireAdmin, async (req, res) => {
    try {
        const { kode_departemen, nama_departemen } = req.body;
        if (!kode_departemen || !nama_departemen)
            return res.status(400).json({ error: 'Kode Departemen dan Nama Departemen wajib diisi.' });

        const { error } = await supabase.from('departemen').update({
            kode_departemen,
            nama_departemen,
            updated_at: new Date().toISOString()
        }).eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Departemen berhasil diperbarui.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/departemen/:id', requireAdmin, async (req, res) => {
    try {
        // Check if any prodi is linked to this departemen
        const { data: linkedProdi, error: checkErr } = await supabase
            .from('prodi_drive_links')
            .select('id, prodi_name')
            .eq('departemen_id', req.params.id);
        if (checkErr) throw checkErr;

        if (linkedProdi && linkedProdi.length > 0) {
            const names = linkedProdi.map(p => p.prodi_name).join(', ');
            return res.status(400).json({ 
                error: `Tidak dapat menghapus departemen. Masih ada ${linkedProdi.length} prodi terkait: ${names}. Pindahkan atau hapus prodi tersebut terlebih dahulu.` 
            });
        }

        const { error } = await supabase.from('departemen').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Departemen berhasil dihapus.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: PURCHASES ───────────────────────────────────────────────────────────
app.get('/api/purchases', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from('purchases').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/purchases', authenticateToken, async (req, res) => {
    try {
        const { item_name, quantity, price, drive_link, keterangan, prodi_code } = req.body;
        if (!item_name || !quantity || !price || !drive_link)
            return res.status(400).json({ error: 'Nama barang, kuantitas, harga, dan link Drive wajib diisi.' });
        if (!validateDriveLink(drive_link))
            return res.status(400).json({ error: 'Dokumentasi pembelian WAJIB berupa link Drive (http/https). Tidak ada upload file lokal.' });

        // Otorisasi & Penetapan Prodi
        let finalProdiCode = prodi_code || null;
        if (req.user.role !== 'admin') {
            finalProdiCode = req.user.prodi_code; // Paksa prodi_code milik user
        }

        const total = parseFloat(price) * parseInt(quantity);
        const { data, error } = await supabase.from('purchases').insert([{
            item_name, quantity, price, total_amount: total, drive_link, keterangan: keterangan || '', prodi_code: finalProdiCode
        }]).select();
        
        if (error) throw error;
        res.json({ id: data[0].id, message: 'Data pembelian disimpan.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/purchases/:id', authenticateToken, async (req, res) => {
    try {
        const { item_name, quantity, price, drive_link, keterangan, prodi_code } = req.body;
        if (!item_name || !quantity || !price || !drive_link)
            return res.status(400).json({ error: 'Nama barang, kuantitas, harga, dan link Drive wajib diisi.' });
        if (!validateDriveLink(drive_link))
            return res.status(400).json({ error: 'Dokumentasi pembelian WAJIB berupa link Drive (http/https).' });

        // Dapatkan data pembelian lama
        const { data: existingPurchase, error: getError } = await supabase
            .from('purchases')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (getError || !existingPurchase) {
            return res.status(404).json({ error: 'Data pembelian tidak ditemukan.' });
        }

        // Otorisasi & Penetapan Prodi
        let finalProdiCode = prodi_code || null;
        if (req.user.role !== 'admin') {
            if (existingPurchase.prodi_code !== req.user.prodi_code) {
                return res.status(403).json({ error: 'Akses ditolak. Anda hanya dapat mengedit data pembelian milik prodi Anda sendiri.' });
            }
            finalProdiCode = req.user.prodi_code; // Paksa prodi_code milik user
        }

        const total = parseFloat(price) * parseInt(quantity);
        const { error } = await supabase.from('purchases').update({
            item_name, quantity, price, total_amount: total, drive_link, keterangan: keterangan || '', prodi_code: finalProdiCode
        }).eq('id', req.params.id);
        
        if (error) throw error;
        res.json({ message: 'Data pembelian diperbarui.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/purchases/:id', authenticateToken, async (req, res) => {
    try {
        // Otorisasi
        if (req.user.role !== 'admin') {
            const { data: existingPurchase, error: getError } = await supabase
                .from('purchases')
                .select('*')
                .eq('id', req.params.id)
                .single();

            if (getError || !existingPurchase) {
                return res.status(404).json({ error: 'Data pembelian tidak ditemukan.' });
            }

            if (existingPurchase.prodi_code !== req.user.prodi_code) {
                return res.status(403).json({ error: 'Akses ditolak. Anda hanya dapat menghapus data pembelian milik prodi Anda sendiri.' });
            }
        }

        const { error } = await supabase.from('purchases').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Data pembelian dihapus.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n✅  Server SIPP berjalan di: http://localhost:${PORT}\n`);
});
