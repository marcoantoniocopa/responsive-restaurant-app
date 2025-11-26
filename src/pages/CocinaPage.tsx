import { KitchenView } from '../components/KitchenView';
import { Order } from '../components/OrderCard';

interface CocinaPageProps {
  orders: Order[];
  onOrderStatusChange: (orderId: string, newStatus: Order['status']) => void;
  onRefresh: () => void;
}

export const CocinaPage = ({ orders, onOrderStatusChange, onRefresh }: CocinaPageProps) => {
  return (
    <KitchenView
      orders={orders}
      onOrderStatusChange={onOrderStatusChange}
      onRefresh={onRefresh}
    />
  );
};

