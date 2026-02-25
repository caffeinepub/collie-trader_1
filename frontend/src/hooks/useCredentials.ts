import { useState, useCallback } from 'react';
import { getCredentials, saveCredentials, hasCredentials } from '../services/binance/binanceAuth';
import { getAccount } from '../services/binance/binanceAccountService';

function parseErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Connection failed — unknown error';

  const msg = error.message;

  if (error.name === 'AbortError' || msg.includes('timeout') || msg.includes('Timeout')) {
    return 'Request timed out — check your network connection and try again';
  }

  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('network error') ||
    msg.includes('Load failed') ||
    msg.includes('fetch')
  ) {
    return 'Connection failed — check your API credentials and network connection.';
  }

  if (msg.includes('Invalid API-key') || msg.includes('API-key') || msg.includes('apiKey')) {
    return 'Invalid API key — double-check your Binance API key and make sure it has Futures permissions';
  }

  if (msg.includes('Signature') || msg.includes('signature') || msg.includes('HMAC')) {
    return 'Invalid signature — double-check your API secret key';
  }

  if (msg.includes('IP') || msg.includes('ip') || msg.includes('whitelist')) {
    return 'IP not whitelisted — add your IP to the Binance API key restrictions, or set it to "Unrestricted"';
  }

  if (msg.includes('permission') || msg.includes('Permission')) {
    return 'Insufficient permissions — enable Futures trading permissions on your API key';
  }

  if (msg.includes('401') || msg.includes('403')) {
    return 'Authentication failed — verify your API key and secret are correct';
  }

  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('Rate limit')) {
    return 'Rate limit exceeded — wait a moment and try again';
  }

  if (msg.includes('503') || msg.includes('502') || msg.includes('504')) {
    return 'Binance server error — try again in a few seconds';
  }

  if (msg && msg !== 'undefined' && msg.length < 200) {
    return msg;
  }

  return 'Connection failed — check your credentials and try again';
}

export function useCredentials() {
  const [apiKey, setApiKey] = useState(() => getCredentials().apiKey);
  const [apiSecret, setApiSecret] = useState(() => getCredentials().apiSecret);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    balance?: string;
  } | null>(null);
  const [liveEnabled, setLiveEnabled] = useState(
    () => localStorage.getItem('live_trading_enabled') === 'true'
  );

  const save = useCallback(() => {
    saveCredentials(apiKey, apiSecret);
  }, [apiKey, apiSecret]);

  const testConnection = useCallback(async () => {
    setTesting(true);
    setTestResult(null);

    try {
      saveCredentials(apiKey, apiSecret);

      const account = await getAccount();

      const usdtAsset = account.assets?.find(
        (a: { asset: string; walletBalance: string }) => a.asset === 'USDT'
      );
      const rawBalance = usdtAsset
        ? usdtAsset.walletBalance
        : account.totalWalletBalance || '0';
      const balance = parseFloat(rawBalance).toFixed(2);

      setTestResult({
        success: true,
        message: `Connected successfully! USDT Balance: $${balance}`,
        balance,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: parseErrorMessage(error),
      });
    } finally {
      setTesting(false);
    }
  }, [apiKey, apiSecret]);

  const toggleLive = useCallback((enabled: boolean) => {
    setLiveEnabled(enabled);
    localStorage.setItem('live_trading_enabled', enabled ? 'true' : 'false');
  }, []);

  return {
    apiKey,
    setApiKey,
    apiSecret,
    setApiSecret,
    save,
    testConnection,
    testing,
    testResult,
    liveEnabled,
    toggleLive,
    hasCredentials: hasCredentials(),
  };
}
