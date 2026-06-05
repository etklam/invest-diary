import type { AlertType } from '@prisma/client'

const PRICE_ALERT_TYPES: AlertType[] = [
  'PRICE_ABOVE',
  'PRICE_BELOW',
  'CHANGE_PERCENT',
  'MOVING_AVG',
]

const SUPPORTED_PRICE_ALERT_TYPES: AlertType[] = [
  'PRICE_ABOVE',
  'PRICE_BELOW',
]

export function isPriceAlertType(type: unknown): type is AlertType {
  return PRICE_ALERT_TYPES.includes(type as AlertType)
}

export function isSupportedPriceAlertType(type: AlertType): boolean {
  return SUPPORTED_PRICE_ALERT_TYPES.includes(type)
}

export function evaluatePriceAlertCondition(
  type: AlertType,
  currentPrice: number,
  threshold: number,
): boolean {
  switch (type) {
    case 'PRICE_ABOVE':
      return currentPrice >= threshold
    case 'PRICE_BELOW':
      return currentPrice <= threshold
    case 'CHANGE_PERCENT':
    case 'MOVING_AVG':
      return false
  }
}
