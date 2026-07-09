import React, { useState, useEffect, useRef } from 'react';
import { useAuth, useApp } from '../contexts/AuthContext';
import { getItems } from '../services/items.service';
import { getRenstraProgress } from '../services/renstra.service';
import { buildTree } from '../utils/helpers';
import type { SipItem, RenstraProgress, TreeNode } from '../types';
import Chart from 'chart.js/auto';

export function Dashboard() {
  const { user } = useAuth();
  const { prodiLinks } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  const [selectedProdi, setSelectedProdi] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [prodiSearch, setProdiSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<{
    items: SipItem[];
    progress: RenstraProgress[];
    totalIku: number;
    totalCompleted: number;
    totalIncomplete: number;
    overallPct: number;
    twStats: Record<number, { completed: number; dataDukung: number; pct: number }>;
  } | null>(null);

  const [activeTwBreakdown, setActiveTwBreakdown] = useState<number | null>(null);
  const [expandedBidangs, setExpandedBidangs] = useState<Record<number, boolean>>({});
  const breakdownRef = useRef<HTMLDivElement>(null);

  const toggleBidang = (id: number) => {
    setExpandedBidangs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const isAdmin = user?.role === 'admin';

  // Set default selected prodi on mount or when user context changes
  useEffect(() => {
    if (!isAdmin && user?.prodi_code) {
      setSelectedProdi(user.prodi_code);
    }
  }, [user, isAdmin]);

  // Load report data automatically for standard user
  useEffect(() => {
    if (!isAdmin && selectedProdi) {
      handleTampilkanLaporan();
    }
  }, [selectedProdi, isAdmin]);

  const handleTampilkanLaporan = async () => {
    const prodiCode = isAdmin ? selectedProdi : user?.prodi_code;
    if (!prodiCode) {
      alert('Pilih Program Studi terlebih dahulu.');
      return;
    }

    setLoading(true);
    try {
      const [items, progressData] = await Promise.all([
        getItems('renstra'),
        getRenstraProgress(prodiCode)
      ]);

      const ikuItems = items.filter(it => it.level === 4);
      const totalIkuCount = ikuItems.length;

      if (totalIkuCount === 0) {
        alert('Belum ada data indikator (Level 4) pada Renstra.');
        setLoading(false);
        return;
      }

      const isComplete = (itemId: number, tw: number) => {
        const p = progressData.find(x => x.item_id === itemId && x.triwulan === tw);
        if (!p) return false;
        return !!(p.capaian?.trim() && 
                  p.progress?.trim() && 
                  p.issues?.trim() && 
                  p.strategy?.trim() && 
                  p.supporting_data_link?.trim());
      };

      const countDataDukung = (itemId: number, tw: number) => {
        const p = progressData.find(x => x.item_id === itemId && x.triwulan === tw);
        return (p && p.supporting_data_link?.trim()) ? 1 : 0;
      };

      const twStats: Record<number, { completed: number; dataDukung: number; pct: number }> = {
        1: { completed: 0, dataDukung: 0, pct: 0 },
        2: { completed: 0, dataDukung: 0, pct: 0 },
        3: { completed: 0, dataDukung: 0, pct: 0 },
        4: { completed: 0, dataDukung: 0, pct: 0 }
      };

      let totalCompletedAllTws = 0;

      for (let tw = 1; tw <= 4; tw++) {
        let completedCount = 0;
        let dataDukungCount = 0;

        ikuItems.forEach(iku => {
          if (isComplete(iku.id, tw)) completedCount++;
          dataDukungCount += countDataDukung(iku.id, tw);
        });

        const pct = Math.round((completedCount / totalIkuCount) * 100);
        twStats[tw] = {
          completed: completedCount,
          dataDukung: dataDukungCount,
          pct: pct
        };

        totalCompletedAllTws += completedCount;
      }

      const overallPct = Math.round((totalCompletedAllTws / (totalIkuCount * 4)) * 100);

      setReportData({
        items,
        progress: progressData,
        totalIku: totalIkuCount,
        totalCompleted: totalCompletedAllTws,
        totalIncomplete: (totalIkuCount * 4) - totalCompletedAllTws,
        overallPct,
        twStats
      });

      setActiveTwBreakdown(null);
    } catch (err: any) {
      alert('Gagal memuat laporan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-render chart whenever reportData changes
  useEffect(() => {
    if (!reportData || !canvasRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(2, 132, 199, 0.25)');
    gradient.addColorStop(1, 'rgba(2, 132, 199, 0.00)');

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['TW 1', 'TW 2', 'TW 3', 'TW 4'],
        datasets: [{
          label: 'Kelengkapan (%)',
          data: [
            reportData.twStats[1].pct,
            reportData.twStats[2].pct,
            reportData.twStats[3].pct,
            reportData.twStats[4].pct
          ],
          borderColor: '#0284c7',
          borderWidth: 3,
          pointBackgroundColor: '#0284c7',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          tension: 0.35,
          fill: true,
          backgroundColor: gradient
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: (v: any) => v + '%', font: { size: 11, weight: 500 } },
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11, weight: 600 } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            padding: 10,
            backgroundColor: '#0f172a',
            titleFont: { size: 12, weight: 700 },
            bodyFont: { size: 12 },
            callbacks: {
              label: (ctx: any) => `Kelengkapan: ${ctx.parsed.y}%`
            }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [reportData]);

  // Handle triwulan breakdown rendering
  const getBreakdownRows = () => {
    if (!reportData || activeTwBreakdown === null) return [];

    const progressData = reportData.progress.filter(x => x.triwulan === activeTwBreakdown);
    const { map } = buildTree(reportData.items);

    const bidangNodes = Object.values(map).filter(node => node.level === 2);
    bidangNodes.sort((a, b) => {
      const aNum = parseInt(a.description) || a.id;
      const bNum = parseInt(b.description) || b.id;
      return aNum - bNum;
    });

    const progressMap: Record<number, RenstraProgress> = {};
    progressData.forEach(p => { progressMap[p.item_id] = p; });

    const isIKUComplete = (itemId: number) => {
      const p = progressMap[itemId];
      if (!p) return false;
      return !!(p.capaian?.trim() && p.progress?.trim() &&
                p.issues?.trim() && p.strategy?.trim() &&
                p.supporting_data_link?.trim());
    };

    const getNodeStats = (node: TreeNode): { total: number; filled: number; ikuItems: any[] } => {
      if (node.level === 4) {
        const complete = isIKUComplete(node.id);
        return { total: 1, filled: complete ? 1 : 0, ikuItems: [{ node, complete, prog: progressMap[node.id] }] };
      }
      let total = 0, filled = 0, ikuItems: any[] = [];
      (node.children || []).forEach(child => {
        const cs = getNodeStats(child);
        total += cs.total;
        filled += cs.filled;
        ikuItems = ikuItems.concat(cs.ikuItems);
      });
      return { total, filled, ikuItems };
    };

    return bidangNodes.map((bidang, i) => {
      const stats = getNodeStats(bidang);
      const pct = stats.total > 0 ? Math.round((stats.filled / stats.total) * 100) : 0;
      return {
        id: bidang.id,
        name: bidang.description,
        code: bidang.code || `B${i + 1}`,
        total: stats.total,
        filled: stats.filled,
        pct,
        ikuItems: stats.ikuItems,
      };
    });
  };

  const handleLihatRincian = (tw: number) => {
    setExpandedBidangs({});
    setActiveTwBreakdown(tw);
    setTimeout(() => {
      breakdownRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const pctColor = (pct: number) => 
    pct === 100 ? '#22c55e' : pct >= 75 ? '#3b82f6' : pct >= 50 ? '#f97316' : pct > 0 ? '#ef4444' : '#94a3b8';

  return (
    <div className="view" id="view-dashboard">
      {/* 1. Page Title */}
      <div className="section-head" style={{ marginBottom: '24px' }}>
        <div>
          <h2><i className="fa-solid fa-chart-bar"></i> Dashboard Kinerja</h2>
          <p className="sub-text">
            {isAdmin 
              ? 'Pantau progress pengisian data Renstra per Prodi' 
              : `Grafik dan progress capaian Renstra untuk ${user?.prodi_name || user?.prodi_code || 'Program Studi Anda'}`
            }
          </p>
        </div>
      </div>

      {/* 2. ALWAYS VISIBLE BANNER (Vibrant Ocean Blue Gradient, Rounded Corners, Soft Shadow) */}
      <div className="lap-banner" style={{
        background: 'linear-gradient(135deg, #0072ff 0%, #00bfff 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '24px',
        padding: '32px 40px',
        color: 'var(--white)',
        position: 'relative',
        marginBottom: '24px',
        boxShadow: '0 20px 40px -15px rgba(0, 114, 255, 0.4)',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '24px',
        flexWrap: 'wrap'
      }}>
        {/* Highly Visible SVG Decorative Vector Circle Pattern (matching reference) */}
        <svg 
          viewBox="0 0 1000 200" 
          preserveAspectRatio="xMaxYMid slice"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1
          }}
        >
          {/* Overlapping Vector Circles with High Visibility */}
          <circle cx="850" cy="100" r="180" fill="none" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="3" />
          <circle cx="730" cy="180" r="220" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.28)" strokeWidth="2.5" />
          <circle cx="920" cy="-20" r="160" fill="none" stroke="rgba(255, 255, 255, 0.22)" strokeWidth="2" />
          <circle cx="620" cy="40" r="100" fill="none" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="1.5" />
        </svg>

        <div style={{ flex: 1, minWidth: '280px', zIndex: 2 }}>
          <span style={{ 
            fontSize: '0.72rem', 
            letterSpacing: '0.12em', 
            textTransform: 'uppercase', 
            background: 'rgba(255,255,255,0.06)', 
            padding: '6px 14px', 
            borderRadius: '99px', 
            border: '1px solid rgba(255,255,255,0.1)', 
            fontWeight: 600, 
            color: '#64ffda' 
          }}>
            {isAdmin ? 'Dashboard Kinerja' : `Dashboard Kinerja • ${user?.prodi_code || ''}`} &bull; Periode Aktif
          </span>
          <h2 style={{ fontSize: '1.9rem', margin: '16px 0 10px', fontWeight: 700, color: '#fff', fontFamily: 'Outfit' }}>
            Pelaporan Capaian Kinerja Utama
          </h2>
          <p style={{ fontSize: '0.98rem', maxWidth: '600px', lineHeight: 1.65, marginBottom: '24px', color: '#ffffff', fontWeight: 500 }}>
            Pantau dan lengkapi pelaporan realisasi IKU Anda secara bertahap. Pastikan setiap data dukung sesuai dengan standar validasi nasional.
          </p>
          <div style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ffffff' }}>
              <span>Penyelesaian Laporan Tahunan</span>
              <span style={{ color: '#64ffda', fontWeight: 700 }}>{reportData ? reportData.overallPct : 0}%</span>
            </div>
            <div className="progress-bar-wrap" style={{ background: 'rgba(255,255,255,0.12)', height: '10px', borderRadius: '99px' }}>
              <div className="progress-bar-fill" style={{ width: `${reportData ? reportData.overallPct : 0}%`, background: '#64ffda', borderRadius: '99px', boxShadow: '0 0 8px #64ffda' }}></div>
            </div>
          </div>
        </div>
        <div style={{ zIndex: 2, minWidth: '220px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', color: '#ffffff', opacity: 0.9, fontWeight: 700 }}>Tahun Anggaran</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e3a8a', background: '#ffffff', padding: '12px 24px', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)' }}>
            <i className="fa-solid fa-calendar-days" style={{ color: '#0284c7' }}></i> PERIODE 2026
          </div>
        </div>
      </div>

      {/* 3. ALWAYS VISIBLE FILTER BAR (Modern Searchable Dropdown style, 100% width) */}
      {isAdmin && (
        <div className="filter-bar-inner" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          marginBottom: '28px',
          padding: '16px 28px',
          background: 'var(--white)',
          borderRadius: '20px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 16px -6px rgba(0, 0, 0, 0.03)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          width: '100%'
        }}>
          {/* Custom Searchable Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, position: 'relative' }} ref={dropdownRef}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>Program Studi:</span>
            <div style={{ flex: 1, position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  padding: '0 12px',
                  fontWeight: 500,
                  color: 'var(--text)',
                  background: '#f8fafc',
                  outline: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedProdi ? `${selectedProdi} — ${prodiLinks.find(p => p.prodi_code === selectedProdi)?.prodi_name || ''}` : '— Pilih Prodi —'}
                </span>
                <i className={`fa-solid fa-chevron-down`} style={{ fontSize: '0.8rem', color: 'var(--muted)', transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'none' }}></i>
              </button>

              {/* Dropdown Options */}
              {isDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '46px',
                  left: 0,
                  width: '320px',
                  background: '#fff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)',
                  border: '1px solid var(--border)',
                  padding: '12px',
                  zIndex: 999,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {/* Dropdown Search Input */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Cari program studi..."
                      value={prodiSearch}
                      onChange={(e) => setProdiSearch(e.target.value)}
                      autoFocus
                      style={{
                        width: '100%',
                        height: '36px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        padding: '0 10px 0 30px',
                        fontSize: '0.85rem',
                        outline: 'none',
                        background: '#f8fafc',
                        color: 'var(--text)'
                      }}
                    />
                    <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.8rem' }}></i>
                  </div>

                  {/* Options List */}
                  <div style={{ 
                    maxHeight: '220px', 
                    overflowY: 'auto', 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '4px',
                    paddingRight: '4px'
                  }}>
                    <div
                      onClick={() => {
                        setSelectedProdi('');
                        setIsDropdownOpen(false);
                        setProdiSearch('');
                      }}
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        padding: '12px 16px',
                        textAlign: 'left',
                        background: selectedProdi === '' ? '#e0f2fe' : 'transparent',
                        color: selectedProdi === '' ? '#0369a1' : 'var(--text)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: selectedProdi === '' ? 600 : 500,
                        fontSize: '0.88rem',
                        lineHeight: '1.5',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        boxSizing: 'border-box',
                        userSelect: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedProdi !== '') e.currentTarget.style.background = '#f1f5f9';
                      }}
                      onMouseLeave={(e) => {
                        if (selectedProdi !== '') e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      — Pilih Prodi —
                    </div>

                    {prodiLinks.filter(p => 
                      p.prodi_name.toLowerCase().includes(prodiSearch.toLowerCase()) || 
                      p.prodi_code.toLowerCase().includes(prodiSearch.toLowerCase())
                    ).map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedProdi(p.prodi_code);
                          setIsDropdownOpen(false);
                          setProdiSearch('');
                        }}
                        style={{
                          width: '100%',
                          minHeight: '44px',
                          padding: '12px 16px',
                          textAlign: 'left',
                          background: selectedProdi === p.prodi_code ? '#e0f2fe' : 'transparent',
                          color: selectedProdi === p.prodi_code ? '#0369a1' : 'var(--text)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: selectedProdi === p.prodi_code ? 600 : 500,
                          fontSize: '0.88rem',
                          lineHeight: '1.5',
                          transition: 'all 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          boxSizing: 'border-box',
                          userSelect: 'none'
                        }}
                        title={`${p.prodi_code} — ${p.prodi_name}`}
                        onMouseEnter={(e) => {
                          if (selectedProdi !== p.prodi_code) {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.color = '#0284c7';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedProdi !== p.prodi_code) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text)';
                          }
                        }}
                      >
                        {p.prodi_code} — {p.prodi_name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button 
            id="btn-tampilkan-laporan" 
            className="btn btn-primary" 
            disabled={loading}
            onClick={handleTampilkanLaporan}
            style={{
              height: '40px',
              width: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              padding: 0,
              flexShrink: 0,
              background: '#1e40af',
              borderColor: '#1e40af',
              boxShadow: '0 4px 12px rgba(30, 64, 175, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title="Tampilkan Laporan"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1d4ed8';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1e40af';
              e.currentTarget.style.transform = 'none';
            }}
          >
            {loading ? (
              <i className="fa-solid fa-spinner fa-spin" style={{ color: '#fff' }}></i>
            ) : (
              <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '1rem', color: '#fff' }}></i>
            )}
          </button>
        </div>
      )}

      {/* 4. EMPTY STATE */}
      {!reportData && !loading && (
        <div id="lap-empty-state" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '280px',
          color: 'var(--muted)',
          textAlign: 'center',
          padding: '48px 24px',
          background: 'var(--white)',
          borderRadius: '24px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 16px -6px rgba(0, 0, 0, 0.03)',
          border: '1px solid rgba(226, 232, 240, 0.8)'
        }}>
          <i className="fa-solid fa-filter" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.25, color: 'var(--blue)' }}></i>
          <h3 style={{ marginBottom: '8px', color: 'var(--text)', opacity: 0.75, fontSize: '1.25rem', fontWeight: 600 }}>Pilih Program Studi</h3>
          <p style={{ maxWidth: '420px', lineHeight: 1.65, fontSize: '0.9rem', color: 'var(--muted)' }}>
            Silakan pilih Program Studi di atas, lalu klik ikon pencarian untuk memuat dashboard kelengkapan laporan Renstra.
          </p>
        </div>
      )}

      {/* 5. LOADING STATE */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '280px', color: 'var(--blue)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', marginBottom: '16px' }}></i>
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Memuat data laporan...</span>
        </div>
      )}

      {/* 6. CONTENT WHEN reportData IS READY */}
      {reportData && !loading && (
        <div id="lap-content">
          {/* Stats Grid with premium styling */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            <div className="stat-card" style={{
              background: 'var(--white)',
              borderRadius: '20px',
              padding: '20px 24px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 16px -6px rgba(0, 0, 0, 0.03)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'transform 0.2s'
            }}>
              <div className="stat-icon" style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', borderRadius: '12px', color: '#fff' }}><i className="fa-solid fa-list-check"></i></div>
              <div>
                <div className="stat-label">Total IKU</div>
                <div className="stat-val">{reportData.totalIku}</div>
              </div>
            </div>
            <div className="stat-card" style={{
              background: 'var(--white)',
              borderRadius: '20px',
              padding: '20px 24px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 16px -6px rgba(0, 0, 0, 0.03)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'transform 0.2s'
            }}>
              <div className="stat-icon" style={{ background: 'linear-gradient(135deg,#22c55e,#15803d)', borderRadius: '12px', color: '#fff' }}><i className="fa-solid fa-circle-check"></i></div>
              <div>
                <div className="stat-label">Sudah Dilaporkan (Lengkap)</div>
                <div className="stat-val">{reportData.totalCompleted}</div>
              </div>
            </div>
            <div className="stat-card" style={{
              background: 'var(--white)',
              borderRadius: '20px',
              padding: '20px 24px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 16px -6px rgba(0, 0, 0, 0.03)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'transform 0.2s'
            }}>
              <div className="stat-icon" style={{ background: 'linear-gradient(135deg,#ef4444,#b91c1c)', borderRadius: '12px', color: '#fff' }}><i className="fa-solid fa-circle-xmark"></i></div>
              <div>
                <div className="stat-label">Belum Lengkap</div>
                <div className="stat-val">{reportData.totalIncomplete}</div>
              </div>
            </div>
          </div>

          {/* Line Chart card with premium styling */}
          <div style={{
            background: 'var(--white)',
            borderRadius: '24px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            padding: '24px 32px',
            marginBottom: '28px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 16px -6px rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text)', fontWeight: 700, fontFamily: 'Outfit' }}>Trend Capaian Tahunan</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Progress per Triwulan Dalam Persentase</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', background: 'var(--surface)', padding: '6px 12px', borderRadius: '99px', border: '1px solid var(--border)' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--blue)' }}></span> Capaian Real (%)
              </div>
            </div>
            <div style={{ position: 'relative', height: '280px' }}>
              <canvas ref={canvasRef}></canvas>
            </div>
          </div>

          {/* Triwulans Cards Grid */}
          <div style={{ margin: '28px 0 16px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text)', fontWeight: 700 }}>Kelengkapan per Triwulan</h3>
          </div>
          
          <div className="lap-tw-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '28px' }}>
            {[1, 2, 3, 4].map(tw => {
              const stats = reportData.twStats[tw];
              const circumference = 213.6;
              const offset = circumference - (stats.pct / 100) * circumference;

              return (
                <div key={tw} className="lap-tw-card" style={{
                  background: 'var(--white)',
                  borderRadius: '24px',
                  padding: '24px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 16px -6px rgba(0, 0, 0, 0.03)',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  position: 'relative'
                }}>
                  <div style={{ flex: 1, paddingRight: '16px' }}>
                    <h4 style={{ fontSize: '1.15rem', font: 'Outfit', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>Triwulan {tw}</h4>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="fa-regular fa-clock"></i> {tw === 1 ? '01 Jan - 31 Mar' : tw === 2 ? '01 Apr - 30 Jun' : tw === 3 ? '01 Jul - 30 Sep' : '01 Oct - 31 Dec'} 2026
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: stats.pct === 100 ? '#eff6ff' : '#f1f5f9', color: stats.pct === 100 ? '#1d4ed8' : '#475569', border: stats.pct === 100 ? '1px solid #bfdbfe' : '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px' }}>
                        {stats.pct === 100 ? `TW${tw} SELESAI` : 'DRAF'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>
                      DATA DUKUNG TERKUMPUL
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--blue)', marginTop: '2px' }}>{stats.dataDukung} / {reportData.totalIku} Indikator</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', minWidth: '120px' }}>
                    {/* Circle SVG */}
                    <div className="circular-progress-wrap" style={{ position: 'relative', width: '80px', height: '80px' }}>
                      <svg width="80" height="80" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" stroke="#e2e8f0" strokeWidth="6" fill="transparent" />
                        <circle cx="40" cy="40" r="34" stroke="var(--blue)" strokeWidth="6" fill="transparent" 
                                strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset .5s ease' }} />
                      </svg>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>
                        {stats.pct}%
                      </div>
                    </div>
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={() => handleLihatRincian(tw)}
                      style={{ width: '100%', justifyContent: 'center', fontWeight: 600, fontSize: '0.78rem', padding: '6px 12px', background: '#0f172a', borderColor: '#0f172a', borderRadius: '6px' }}
                    >
                      LIHAT RINCIAN <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px', fontSize: '0.7rem' }}></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Breakdown Section */}
          {activeTwBreakdown !== null && (
            <div ref={breakdownRef} id="lap-breakdown-section" style={{ scrollMarginTop: '80px' }}>
              <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '32px 0 24px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--text)', fontWeight: 700 }}>Rincian Ketidaklengkapan Triwulan {activeTwBreakdown}</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '2px' }}>Daftar IKU yang belum diisi lengkap beserta field yang masih kosong</p>
                </div>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
                  style={{ fontSize: '0.75rem', borderRadius: '6px' }}
                >
                  <i className="fa-solid fa-arrow-up"></i> Kembali ke Atas
                </button>
              </div>

              <div className="tbl-wrap" style={{
                background: 'var(--white)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 16px -6px rgba(0, 0, 0, 0.03)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                marginBottom: '32px'
              }}>
                <table className="htable" id="tbl-laporan-breakdown">
                  <thead>
                    <tr>
                      <th style={{ width: '32px' }}></th>
                      <th className="text-left">Bidang</th>
                      <th style={{ width: '220px' }} className="text-left">Progress</th>
                      <th style={{ width: '80px' }} className="text-center">%</th>
                      <th style={{ width: '90px' }} className="text-center">Terisi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getBreakdownRows().map(bidang => {
                      const clr = pctColor(bidang.pct);
                      const icon = bidang.pct === 100
                        ? <i className="fa-solid fa-circle-check" style={{ color: '#22c55e' }}></i>
                        : <i className="fa-solid fa-circle-half-stroke" style={{ color: '#f97316' }}></i>;

                      const incomplete = bidang.ikuItems.filter(it => !it.complete);
                      const isExpanded = !!expandedBidangs[bidang.id];

                      return (
                        <React.Fragment key={bidang.id}>
                          <tr 
                            className="lap-row-bidang" 
                            onClick={() => toggleBidang(bidang.id)}
                            style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                          >
                            <td className="text-center">{icon}</td>
                            <td className="text-left">
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                <strong>{bidang.code} — {bidang.name}</strong>
                                <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ color: 'var(--muted)', fontSize: '0.75rem' }}></i>
                              </span>
                            </td>
                            <td>
                              <div className="progress-bar-wrap">
                                <div className="progress-bar-fill" style={{ width: `${bidang.pct}%`, background: clr }}></div>
                              </div>
                            </td>
                            <td className="text-center" style={{ color: clr, fontWeight: 700 }}>{bidang.pct}%</td>
                            <td className="text-center" style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{bidang.filled}/{bidang.total}</td>
                          </tr>
                          
                          {isExpanded && incomplete.map(({ node, prog }: any) => {
                            const missing: string[] = [];
                            if (!prog?.capaian?.trim())               missing.push('Capaian');
                            if (!prog?.progress?.trim())              missing.push('Progress');
                            if (!prog?.issues?.trim())                missing.push('Kendala');
                            if (!prog?.strategy?.trim())              missing.push('Strategi');
                            if (!prog?.supporting_data_link?.trim())  missing.push('Data Dukung');

                            return (
                              <tr key={node.id} className="lap-row-iku">
                                <td className="text-center"><i className="fa-solid fa-triangle-exclamation" style={{ color: '#f97316', fontSize: '0.8rem' }}></i></td>
                                <td className="text-left" style={{ paddingLeft: '24px' }}>
                                  {node.code ? <span style={{ color: 'var(--muted)', marginRight: '6px' }}>{node.code}</span> : ''}
                                  {node.description}
                                </td>
                                <td colSpan={3} className="text-left">
                                  <span style={{ color: 'var(--muted)' }}>Belum diisi: </span>
                                  <strong style={{ color: '#ef4444' }}>{missing.join(', ')}</strong>
                                </td>
                              </tr>
                            );
                          })}

                          {isExpanded && incomplete.length === 0 && bidang.total > 0 && (
                            <tr className="lap-row-iku">
                              <td></td>
                              <td colSpan={4} className="text-left" style={{ paddingLeft: '24px', color: '#22c55e', fontSize: '0.82rem' }}>
                                <i className="fa-solid fa-check"></i> Semua IKU sudah diisi lengkap!
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
