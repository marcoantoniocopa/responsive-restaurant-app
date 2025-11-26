import { CashierView } from '../components/CashierView';
import { Order } from '../components/OrderCard';

interface CajaPageProps {
  orders: Order[];
  onOrderStatusChange: (orderId: string, newStatus: Order['status']) => void;
  onOrderSubmit: (order: Omit<Order, 'id' | 'timestamp' | 'status'>) => void;
  onRefresh: () => void;
}

export const CajaPage = ({ orders, onOrderStatusChange, onOrderSubmit, onRefresh }: CajaPageProps) => {
  return (
    <CashierView
      orders={orders}
      onOrderStatusChange={onOrderStatusChange}
      onOrderSubmit={onOrderSubmit}
      onRefresh={onRefresh}
    />
  );
};

