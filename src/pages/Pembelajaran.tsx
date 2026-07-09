import { ComingSoon } from '../components/ComingSoon';
import type { SipItem } from '../types';

interface PembelajaranProps {
  items: SipItem[];
  onRefresh: () => void;
  onEditItem: (id: number) => void;
  onAddSubItem: (parentId: number, level: number) => void;
  onOpenDriveModal: (itemId: number, field: string) => void;
}

export function Pembelajaran(_props: PembelajaranProps) {
  return <ComingSoon title="Data Pembelajaran (CPL)" />;
}
