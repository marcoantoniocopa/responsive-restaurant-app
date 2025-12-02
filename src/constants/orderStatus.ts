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
} as const;

export type OrderStatusId = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

/**
 * Helper function to check if a status can transition to another status
 */
export function canTransitionTo(currentStatus: number, newStatus: number): boolean {
  const validTransitions: Record<number, number[]> = {
    [ORDER_STATUS.RESERVA]: [ORDER_STATUS.EN_PROGRESO, ORDER_STATUS.CANCELADO],
    [ORDER_STATUS.NUEVO]: [ORDER_STATUS.EN_PROGRESO, ORDER_STATUS.CANCELADO],
    [ORDER_STATUS.EN_PROGRESO]: [ORDER_STATUS.COMPLETADO, ORDER_STATUS.CANCELADO],
    [ORDER_STATUS.COMPLETADO]: [], // Cannot change from completed
    [ORDER_STATUS.CANCELADO]: [], // Cannot change from cancelled
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Get available next statuses for a current status
 */
export function getAvailableTransitions(currentStatus: number): number[] {
  const validTransitions: Record<number, number[]> = {
    [ORDER_STATUS.RESERVA]: [ORDER_STATUS.EN_PROGRESO, ORDER_STATUS.CANCELADO],
    [ORDER_STATUS.NUEVO]: [ORDER_STATUS.EN_PROGRESO, ORDER_STATUS.CANCELADO],
    [ORDER_STATUS.EN_PROGRESO]: [ORDER_STATUS.COMPLETADO, ORDER_STATUS.CANCELADO],
    [ORDER_STATUS.COMPLETADO]: [],
    [ORDER_STATUS.CANCELADO]: [],
  };

  return validTransitions[currentStatus] || [];
}

