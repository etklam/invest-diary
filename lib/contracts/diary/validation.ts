/** Hard caps enforced by every diary create/update path. */
export const DIARY_PAYLOAD_LIMITS = {
  transactions: 100,
  alerts: 50,
  title: 500,
  content: 500_000,
} as const
