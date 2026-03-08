/**
 * Order Status Constants
 * 
 * These numeric IDs map to the backend order statuses
 */

export const ORDER_STATUS = {
  RESERVA: 1,
  NUEVO: 2,
  EN_PROGRESO: 3,
  COMPLETADO: 4,
  CANCELADO: 5,
  SERVIR_SOPA: 6,
} as const;

export type OrderStatusId = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

/**
 * Check if an order qualifies for the "Servir Sopa" intermediate status.
 * Applies to dine-in orders (orderType 2) that have at least one sopa item.
 */
export function orderHasSopaFlow(
  orderType: number,
  items: Array<{ name: string; isCompleto?: boolean; components?: string[] }>
): boolean {
  if (orderType !== 2) return false;
  return items.some(item => {
    if (item.name.toLowerCase().includes('sopa')) return true;
    if (item.isCompleto && item.components) {
      return item.components.some(c => c.toLowerCase().includes('sopa'));
    }
    return false;
  });
}

/**
 * Helper function to check if a status can transition to another status
 */
export function canTransitionTo(currentStatus: number, newStatus: number): boolean {
  const validTransitions: Record<number, number[]> = {
    [ORDER_STATUS.RESERVA]: [ORDER_STATUS.EN_PROGRESO, ORDER_STATUS.CANCELADO],
    [ORDER_STATUS.NUEVO]: [ORDER_STATUS.EN_PROGRESO, ORDER_STATUS.CANCELADO],
    [ORDER_STATUS.EN_PROGRESO]: [ORDER_STATUS.COMPLETADO, ORDER_STATUS.CANCELADO, ORDER_STATUS.SERVIR_SOPA],
    [ORDER_STATUS.COMPLETADO]: [],
    [ORDER_STATUS.CANCELADO]: [],
    [ORDER_STATUS.SERVIR_SOPA]: [ORDER_STATUS.COMPLETADO, ORDER_STATUS.CANCELADO],
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Get available next statuses for an order.
 * When the order is "En Progreso" and qualifies for sopa flow,
 * returns "Servir Sopa" instead of "Completado".
 */
export function getAvailableTransitions(
  currentStatus: number,
  order?: { orderType: number; items: Array<{ name: string }> }
): number[] {
  const validTransitions: Record<number, number[]> = {
    [ORDER_STATUS.RESERVA]: [ORDER_STATUS.EN_PROGRESO, ORDER_STATUS.CANCELADO],
    [ORDER_STATUS.NUEVO]: [ORDER_STATUS.EN_PROGRESO, ORDER_STATUS.CANCELADO],
    [ORDER_STATUS.EN_PROGRESO]: [ORDER_STATUS.COMPLETADO, ORDER_STATUS.CANCELADO],
    [ORDER_STATUS.COMPLETADO]: [],
    [ORDER_STATUS.CANCELADO]: [],
    [ORDER_STATUS.SERVIR_SOPA]: [ORDER_STATUS.COMPLETADO, ORDER_STATUS.CANCELADO],
  };

  const transitions = validTransitions[currentStatus] || [];

  if (currentStatus === ORDER_STATUS.EN_PROGRESO && order && orderHasSopaFlow(order.orderType, order.items)) {
    return transitions.map(t => t === ORDER_STATUS.COMPLETADO ? ORDER_STATUS.SERVIR_SOPA : t);
  }

  return transitions;
}

