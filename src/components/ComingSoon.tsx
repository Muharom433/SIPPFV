interface ComingSoonProps {
  title: string;
}

export function ComingSoon({ title }: ComingSoonProps) {
  return (
    <div className="view" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '450px', background: 'var(--white)', borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', border: '1px solid rgba(226, 232, 240, 0.8)', margin: '24px', textAlign: 'center', padding: '40px' }}>
      <div style={{ background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.1), rgba(124, 58, 237, 0.1))', width: '96px', height: '96px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: 'var(--blue)' }}>
        <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: '3rem', display: 'flex', alignItems: 'center' }}></i>
      </div>
      <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'Outfit', marginBottom: '12px' }}>Segera Hadir</h2>
      <p style={{ fontSize: '0.95rem', color: 'var(--muted)', maxWidth: '460px', lineHeight: 1.65, margin: '0 auto 24px' }}>
        Fitur <strong>{title}</strong> sedang dalam tahap pengembangan sistem penganggaran & perencanaan terbaru. Terima kasih atas kesabaran Anda.
      </p>
      <div style={{ background: '#f8fafc', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        SIPP TA 2026 &bull; Fakultas Vokasi UNY
      </div>
    </div>
  );
}
