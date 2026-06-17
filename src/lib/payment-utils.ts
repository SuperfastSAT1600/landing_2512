export function netAmount(p: { amount: number; tax_type?: string | null }): number {
  return p.tax_type === '과세' ? Math.round(p.amount * 0.9) : p.amount;
}
