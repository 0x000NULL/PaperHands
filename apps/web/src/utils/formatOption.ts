/**
 * Format an option order for human-readable display.
 * Converts option data to format like "GOOGL 12/12/24 PUT $169"
 */
export function formatOptionDisplay(order: {
  underlyingSymbol?: string | null;
  expirationDate?: string | null;
  optionType?: 'call' | 'put' | null;
  strikePrice?: number | null;
}): string | null {
  if (
    !order.underlyingSymbol ||
    !order.expirationDate ||
    !order.optionType ||
    order.strikePrice == null
  ) {
    return null;
  }

  const date = new Date(order.expirationDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear() % 100;
  const dateStr = `${month}/${day}/${year.toString().padStart(2, '0')}`;

  const type = order.optionType.toUpperCase();
  const strike = `$${order.strikePrice}`;

  return `${order.underlyingSymbol} ${dateStr} ${type} ${strike}`;
}
