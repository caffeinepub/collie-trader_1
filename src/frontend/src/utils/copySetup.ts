import type { Trade } from '../types/trade';

/**
 * Formats a trade setup for copying to clipboard
 * @param trade - The trade object
 * @param currentPrice - Optional current price for calculating R:R
 * @returns Formatted string ready to paste
 */
export function copyTradeSetup(trade: Trade, currentPrice?: number): string {
  const isLong = trade.direction === 'LONG';
  const emoji = isLong ? '📈' : '📉';

  // Calculate risk/reward if current price is available
  const riskAmount = Math.abs(trade.entry - trade.stopLoss);
  const rewardTP1 = Math.abs(trade.tp1 - trade.entry);
  const rewardTP3 = Math.abs(trade.tp3 - trade.entry);
  const rrRatio = (rewardTP3 / riskAmount).toFixed(1);

  // Calculate risk percentage (assuming from position size)
  const riskPercent = ((riskAmount / trade.entry) * 100).toFixed(2);

  return `${emoji} ${trade.symbol} ${trade.direction}
Entry: ${formatPrice(trade.entry)}
TP1: ${formatPrice(trade.tp1)} | TP2: ${formatPrice(trade.tp2)} | TP3: ${formatPrice(trade.tp3)}
SL: ${formatPrice(trade.stopLoss)}
Risk: ${riskPercent}% | R:R: 1:${rrRatio}
${trade.entryReason ? `\n💡 ${trade.entryReason}` : ''}`;
}

/**
 * Formats a single price value
 * @param price - The price to format
 * @returns Formatted price string
 */
export function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

/**
 * Copies text to clipboard with fallback for older browsers
 * @param text - Text to copy
 * @returns Promise that resolves when copied
 */
export async function copyToClipboard(text: string): Promise<void> {
  // Modern Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback for older browsers
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand('copy');
  } finally {
    textArea.remove();
  }
}

/**
 * Copies a single price to clipboard
 * @param price - The price value
 * @returns Promise that resolves when copied
 */
export async function copyPrice(price: number): Promise<void> {
  await copyToClipboard(formatPrice(price));
}
