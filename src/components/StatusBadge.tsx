import { Badge } from "./ui/badge";
import { useConfig } from "../contexts/ConfigContext";

interface StatusBadgeProps {
  statusId: number;
  className?: string;
}

export function StatusBadge({ statusId, className = "" }: StatusBadgeProps) {
  const { getOrderStatusName } = useConfig();

  const getStatusColor = (id: number) => {
    switch (id) {
      case 1: // Reserva
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case 2: // Nuevo
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case 3: // En Progreso
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case 4: // Completado
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case 5: // Cancelado
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <Badge className={`${getStatusColor(statusId)} ${className}`}>
      {getOrderStatusName(statusId)}
    </Badge>
  );
}

