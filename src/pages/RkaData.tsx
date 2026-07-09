import { ComingSoon } from '../components/ComingSoon';
import type { SipItem } from '../types';

interface RkaDataProps {
  onEditItem: (id: number) => void;
  onAddSubItem: (parentId: number, level: number) => void;
  onOpenDriveModal: (itemId: number, field: string) => void;
  items: SipItem[];
  onRefresh: () => void;
}

export function RkaData(_props: RkaDataProps) {
  return <ComingSoon title="Rencana Kerja & Anggaran (RKA) - Data" />;
}
