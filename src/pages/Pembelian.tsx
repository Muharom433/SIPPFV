import { ComingSoon } from '../components/ComingSoon';
import type { Purchase } from '../types';

interface PembelianProps {
  purchases: Purchase[];
  onRefresh: () => void;
  onAddPurchase: () => void;
  onEditPurchase: (id: number) => void;
}

export function Pembelian(_props: PembelianProps) {
  return <ComingSoon title="Transaksi Pembelian" />;
}
