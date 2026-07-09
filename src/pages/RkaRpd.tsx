import { ComingSoon } from '../components/ComingSoon';
import type { SipItem } from '../types';

interface RkaRpdProps {
  items: SipItem[];
}

export function RkaRpd(_props: RkaRpdProps) {
  return <ComingSoon title="Rencana Kerja & Anggaran (RKA) - RPD" />;
}
