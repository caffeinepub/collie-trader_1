import { publicFetch, BINANCE_FUTURES_BASE } from './binanceAuth';
import type { ExchangeInfo, ExchangeSymbol, TickerPrice, Kline, LeverageBracketInfo } from '../../types/binance';

export async function getExchangeInfo(): Promise<ExchangeSymbol[]> {
  const response = await publicFetch(`${BINANCE_FUTURES_BASE}/fapi/v1/exchangeInfo`);
  if (!response.ok) throw new Error(`Exchange info failed: ${response.status}`);
  const data: ExchangeInfo = await response.json();
  return data.symbols.filter(
    (s) => s.contractType === 'PERPETUAL' && s.status === 'TRADING'
  );
}

export async function getTickerPrice(symbol: string): Promise<number> {
  const response = await publicFetch(
    `${BINANCE_FUTURES_BASE}/fapi/v1/ticker/price?symbol=${symbol}`
  );
  if (!response.ok) throw new Error(`Ticker price failed: ${response.status}`);
  const data: TickerPrice = await response.json();
  return parseFloat(data.price);
}

export async function getAllTickerPrices(): Promise<Record<string, number>> {
  const response = await publicFetch(`${BINANCE_FUTURES_BASE}/fapi/v1/ticker/price`);
  if (!response.ok) throw new Error(`All ticker prices failed: ${response.status}`);
  const data: TickerPrice[] = await response.json();
  const result: Record<string, number> = {};
  for (const t of data) {
    result[t.symbol] = parseFloat(t.price);
  }
  return result;
}

export async function getKlines(
  symbol: string,
  interval: string,
  limit = 100
): Promise<Kline[]> {
  const response = await publicFetch(
    `${BINANCE_FUTURES_BASE}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );
  if (!response.ok) throw new Error(`Klines failed: ${response.status}`);
  return response.json();
}

export async function getLeverageBracket(symbol: string): Promise<LeverageBracketInfo> {
  const response = await publicFetch(
    `${BINANCE_FUTURES_BASE}/fapi/v1/leverageBracket?symbol=${symbol}`
  );
  if (!response.ok) throw new Error(`Leverage bracket failed: ${response.status}`);
  const data = await response.json();
  if (Array.isArray(data)) {
    return data.find((d: LeverageBracketInfo) => d.symbol === symbol) || data[0];
  }
  return data;
}
