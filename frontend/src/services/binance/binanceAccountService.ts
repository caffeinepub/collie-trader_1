import { authenticatedFetch } from './binanceAuth';
import type { Account, PositionRisk, Order, PlaceOrderParams } from '../../types/binance';

export async function getAccount(): Promise<Account> {
  const response = await authenticatedFetch('/fapi/v2/account');
  if (!response.ok) {
    const err = await response.json().catch(() => ({ msg: response.statusText }));
    throw new Error(err.msg || `Account fetch failed: ${response.status}`);
  }
  return response.json();
}

export async function getPositionRisk(symbol?: string): Promise<PositionRisk[]> {
  const params: Record<string, string | number | boolean> = {};
  if (symbol) params.symbol = symbol;
  const response = await authenticatedFetch('/fapi/v2/positionRisk', params);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ msg: response.statusText }));
    throw new Error(err.msg || `Position risk failed: ${response.status}`);
  }
  const data: PositionRisk[] = await response.json();
  return data.filter((p) => parseFloat(p.positionAmt) !== 0);
}

export async function placeOrder(params: PlaceOrderParams): Promise<Order> {
  const orderParams: Record<string, string | number | boolean> = {
    symbol: params.symbol,
    side: params.side,
    type: params.type,
    quantity: params.quantity,
  };
  if (params.price) orderParams.price = params.price;
  if (params.stopPrice) orderParams.stopPrice = params.stopPrice;
  if (params.timeInForce) orderParams.timeInForce = params.timeInForce;
  if (params.reduceOnly !== undefined) orderParams.reduceOnly = params.reduceOnly;
  if (params.positionSide) orderParams.positionSide = params.positionSide;

  const response = await authenticatedFetch('/fapi/v1/order', orderParams, 'POST');
  if (!response.ok) {
    const err = await response.json().catch(() => ({ msg: response.statusText }));
    throw new Error(err.msg || `Place order failed: ${response.status}`);
  }
  return response.json();
}

export async function cancelOrder(symbol: string, orderId: number): Promise<Order> {
  const response = await authenticatedFetch('/fapi/v1/order', { symbol, orderId }, 'DELETE');
  if (!response.ok) {
    const err = await response.json().catch(() => ({ msg: response.statusText }));
    throw new Error(err.msg || `Cancel order failed: ${response.status}`);
  }
  return response.json();
}
