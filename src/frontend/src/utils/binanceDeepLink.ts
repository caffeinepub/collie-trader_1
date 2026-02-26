/**
 * Generates a Binance deep link for manual order entry
 * @param symbol - Trading pair symbol (e.g., 'BTCUSDT')
 * @param side - Order side ('BUY' or 'SELL')
 * @param quantity - Optional quantity to pre-fill
 * @returns Deep link string that opens Binance app on mobile or web on desktop
 */
export function generateBinanceDeepLink(
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity?: number
): string {
  const params = new URLSearchParams({
    symbol,
    side,
    ...(quantity && { quantity: quantity.toString() }),
  });

  // Mobile app deep link format
  const deepLink = `binance://futures/trade?${params.toString()}`;

  return deepLink;
}

/**
 * Opens Binance in the appropriate format (app on mobile, web on desktop)
 * @param symbol - Trading pair symbol
 * @param side - Order side ('BUY' or 'SELL')
 * @param quantity - Optional quantity
 */
export function openBinanceTrade(
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity?: number
): void {
  const deepLink = generateBinanceDeepLink(symbol, side, quantity);

  // Try to open the app first (works on mobile)
  window.location.href = deepLink;

  // Fallback to web after a short delay if app doesn't open
  setTimeout(() => {
    const webUrl = `https://www.binance.com/en/futures/${symbol}`;
    window.open(webUrl, '_blank', 'noopener,noreferrer');
  }, 1500);
}
