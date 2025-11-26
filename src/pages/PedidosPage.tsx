import { OnlineOrder } from '../components/OnlineOrder';
import { Order } from '../components/OrderCard';

interface PedidosPageProps {
  onOrderSubmit: (order: Omit<Order, 'id' | 'timestamp' | 'status'>) => void;
}

export const PedidosPage = ({ onOrderSubmit }: PedidosPageProps) => {
  return <OnlineOrder onOrderSubmit={onOrderSubmit} />;
};

