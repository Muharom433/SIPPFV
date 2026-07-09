import { useEffect, useState } from 'react';
import { getItems } from '../services/items.service';
import { getPurchases } from '../services/purchases.service';
// import { getProdiLinks } from '../services/prodi.service';
import { useAuth } from '../contexts/AuthContext';
import { rupiah, buildTree } from '../utils/helpers';


export function Dashboard() {
  const { user } = useAuth();
  const [totalRka, setTotalRka] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  // const [prodiLinkedText, setProdiLinkedText] = useState('0 / 0 Prodi');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [itemsData, purchasesData] = await Promise.all([
          getItems('keuangan_rka'),
          getPurchases()
        ]);

        const { roots } = buildTree(itemsData);
        let calculatedTotalRka = 0;
        roots.forEach(r => { calculatedTotalRka += (r.amount || 0); });
        setTotalRka(calculatedTotalRka);

        const calculatedTotalP = purchasesData.reduce((sum, p) => sum + (p.total_amount || 0), 0);
        setTotalPurchases(calculatedTotalP);

        // Standard 7 folders check for dashboard count
        /* const driveFields = [
          'link_perjanjian_kinerja',
          'link_template_kinerja',
          'link_tw1',
          'link_tw2',
          'link_bukti_dukung_tw1',
          'link_bukti_lama',
          'link_contoh_target'
        ] as const; */

        /* const filledProdi = prodiData.filter(p =>
          driveFields.some(f => p[f] && p[f].trim() !== '')
        ).length; */

        // setProdiLinkedText(`${filledProdi} / ${prodiData.length} Prodi`);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  return (
    <div className="view" id="view-dashboard">
      <div className="dash-banner">
        <div className="dash-banner-text">
          <h2>Sistem Informasi Perencanaan & Penganggaran (SIPP)</h2>
          <p>Fakultas Vokasi — Universitas Negeri Yogyakarta | TA 2026</p>
        </div>
        <div className="dash-banner-icon"><i className="fa-solid fa-university"></i></div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon si-blue"><i className="fa-solid fa-money-bill-wave"></i></div>
          <div>
            <div className="stat-label">Total Anggaran RKA</div>
            <div className="stat-val">{loading ? 'Memuat...' : rupiah(totalRka)}</div>
          </div>
        </div>
        
        {/* <div className="stat-card">
          <div className="stat-icon si-green"><i className="fa-solid fa-folder-open"></i></div>
          <div>
            <div className="stat-label">Prodi Dengan Link Drive</div>
            <div className="stat-val">{loading ? 'Memuat...' : prodiLinkedText}</div>
          </div>
        </div> */}

        <div className="stat-card">
          <div className="stat-icon si-purple"><i className="fa-solid fa-cart-shopping"></i></div>
          <div>
            <div className="stat-label">Total Belanja Barang</div>
            <div className="stat-val">{loading ? 'Memuat...' : rupiah(totalPurchases)}</div>
          </div>
        </div>
      </div>

      <div className="info-box">
        <h3><i className="fa-solid fa-circle-info"></i> Panduan Sistem Berkas</h3>
        <ul>
          <li>~</li>
        </ul>
      </div>
    </div>
  );
}
