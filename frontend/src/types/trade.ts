export enum TradeModality {
  Scalping = 'Scalping',
  DayTrading = 'DayTrading',
  Swing = 'Swing',
  Position = 'Position',
}

export enum TradeDirection {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

export enum TradeStatus {
  Active = 'Active',
  TP1Hit = 'TP1Hit',
  TP2Hit = 'TP2Hit',
  TP3Hit = 'TP3Hit',
  SLHit = 'SLHit',
  ManuallyClosed = 'ManuallyClosed',
  Reversed = 'Reversed',
}

export interface Trade {
  id: string;
  modality: TradeModality;
  symbol: string;
  direction: TradeDirection;
  entry: number;
  tp1: number;
  tp2: number;
  tp3: number;
  stopLoss: number;
  currentSL: number; // moves to breakeven after TP1
  status: TradeStatus;
  openTime: number;
  closeTime?: number;
  closePrice?: number;
  pnl?: number;
  pnlPercent?: number;
  positionSize: number; // in USDT
  orderId?: number;
  isLive: boolean;
  tp1Hit: boolean;
  tp2Hit: boolean;
  tp3Hit: boolean;
  interval: string;
  entryReason?: string;
  scoringFactors?: string[]; // AI pair selection rationale
}

export interface TradeSetup {
  symbol: string;
  direction: TradeDirection;
  entry: number;
  tp1: number;
  tp2: number;
  tp3: number;
  stopLoss: number;
  modality: TradeModality;
  interval: string;
  entryReason: string;
  rrRatio: number;
  scoringFactors?: string[]; // AI pair selection rationale
}

export interface ClosedTrade extends Trade {
  closeTime: number;
  closePrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface TradeStatistics {
  modality: TradeModality | 'Overall';
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgRR: number;
  totalPnl: number;
  bestTrade: number;
  worstTrade: number;
  currentStreak: number;
  tp1Hits: number;
  tp2Hits: number;
  tp3Hits: number;
  slHits: number;
  avgHoldDuration: number; // in minutes
}

export interface ReversalSignal {
  type: 'CHOCH' | 'BreakerBlock';
  tradeId: string;
  symbol: string;
  direction: 'bullish' | 'bearish';
  price: number;
  timestamp: number;
  description: string;
}

export interface RecoveryStrategy {
  type: 'AverageDown' | 'Hedge' | 'PartialClose' | 'DCA';
  description: string;
  entryPrice?: number;
  quantity?: number;
  expectedPnlImprovement: number;
  levels?: number[];
}
