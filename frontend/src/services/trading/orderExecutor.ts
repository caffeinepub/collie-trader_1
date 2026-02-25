import { placeOrder } from '../binance/binanceAccountService';
import { hasCredentials } from '../binance/binanceAuth';
import type { Trade } from '../../types/trade';
import { TradeDirection } from '../../types/trade';

export function isLiveModeAllowed(): boolean {
  const globalLive = localStorage.getItem('live_trading_enabled') === 'true';
  return globalLive && hasCredentials();
}

export async function executeTradeOpen(
  trade: Trade,
  isLive: boolean
): Promise<{ success: boolean; orderId?: number; error?: string }> {
  if (!isLive || !isLiveModeAllowed()) {
    return { success: true }; // Simulated
  }

  try {
    const side = trade.direction === TradeDirection.LONG ? 'BUY' : 'SELL';
    const quantity = (trade.positionSize / trade.entry).toFixed(3);

    const order = await placeOrder({
      symbol: trade.symbol,
      side,
      type: 'MARKET',
      quantity,
    });

    return { success: true, orderId: order.orderId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Order failed' };
  }
}

export async function executeTradeClose(
  trade: Trade,
  currentPrice: number,
  isLive: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!isLive || !isLiveModeAllowed()) {
    return { success: true }; // Simulated
  }

  try {
    const side = trade.direction === TradeDirection.LONG ? 'SELL' : 'BUY';
    const quantity = (trade.positionSize / trade.entry).toFixed(3);

    await placeOrder({
      symbol: trade.symbol,
      side,
      type: 'MARKET',
      quantity,
      reduceOnly: true,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Close order failed' };
  }
}
