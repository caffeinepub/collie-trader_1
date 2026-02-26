import { useState } from 'react';
import { useCredentials } from '../hooks/useCredentials';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Settings as SettingsIcon,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  Zap,
  Wallet,
} from 'lucide-react';

export function Settings() {
  const {
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
  } = useCredentials();

  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    save();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <SettingsIcon className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-lg font-bold">Settings</h1>
      </div>

      {/* API Credentials */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-profit" />
          <h2 className="text-sm font-semibold">Binance API Credentials</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Credentials are stored locally in your browser only and never sent to any server.
          Use a Futures-enabled API key with trading permissions.
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">API Key</Label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="h-9 text-xs terminal-text bg-muted/30 border-border pr-9"
                placeholder="Enter your Binance API Key"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">API Secret</Label>
            <div className="relative">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="h-9 text-xs terminal-text bg-muted/30 border-border pr-9"
                placeholder="Enter your Binance API Secret"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            size="sm"
            className="h-8 text-xs bg-primary/20 border border-primary/40 text-profit hover:bg-primary/30"
          >
            {saved ? <CheckCircle className="w-3 h-3 mr-1" /> : null}
            {saved ? 'Saved!' : 'Save Credentials'}
          </Button>
          <Button
            onClick={testConnection}
            disabled={testing || !apiKey || !apiSecret}
            size="sm"
            variant="outline"
            className="h-8 text-xs border-border"
          >
            {testing ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Zap className="w-3 h-3 mr-1" />
            )}
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>

        {/* Test result */}
        {testResult && (
          <div
            className={`rounded border text-xs overflow-hidden ${
              testResult.success
                ? 'border-profit/30 bg-profit/10'
                : 'border-loss/30 bg-loss/10'
            }`}
          >
            <div
              className={`flex items-start gap-2 p-3 ${
                testResult.success ? 'text-profit' : 'text-loss'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>

            {testResult.success && testResult.balance && (
              <div className="flex items-center gap-2 px-3 pb-3 pt-0">
                <Wallet className="w-3.5 h-3.5 text-profit/70 shrink-0" />
                <span className="text-profit/80 font-mono font-semibold text-sm">
                  ${testResult.balance} USDT
                </span>
                <span className="text-muted-foreground text-xs">available in Futures wallet</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live Trading Toggle */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-warning" />
          <h2 className="text-sm font-semibold">Live Trading</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Enable Live Trading</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              When enabled, modality cards can be switched to Live mode to place real orders on Binance.
            </div>
          </div>
          <Switch
            checked={liveEnabled}
            onCheckedChange={toggleLive}
          />
        </div>

        {liveEnabled && (
          <div className="flex items-start gap-2 p-3 rounded border border-warning/30 bg-warning/5 text-xs text-warning">
            <Zap className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Live trading is enabled. Real orders will be placed on Binance when individual modality
              toggles are set to LIVE. Ensure you understand the risks before trading with real funds.
            </span>
          </div>
        )}
      </div>

      {/* Capital Settings */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold">Capital Settings</h2>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Total Capital (USDT)</Label>
          <Input
            type="number"
            defaultValue={localStorage.getItem('total_capital') || '10000'}
            onChange={(e) => localStorage.setItem('total_capital', e.target.value)}
            className="h-9 text-xs terminal-text bg-muted/30 border-border max-w-xs"
            placeholder="10000"
          />
          <p className="text-xs text-muted-foreground">
            Used for position sizing calculations in Risk Management.
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-muted/20 border border-border/50 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
        <div className="font-medium text-foreground/70">About CollieTrader</div>
        <p>
          All data is stored locally in your browser. API requests use HMAC-SHA256 signatures
          generated entirely in your browser.
        </p>
      </div>
    </div>
  );
}
