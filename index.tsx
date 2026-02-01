import React, { useState, useEffect, useMemo, useContext, createContext, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  Zap, 
  BarChart2, 
  Crosshair, 
  Layers, 
  Settings,
  Search,
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown,
  MoveRight,
  Clock,
  Filter,
  Shield,
  Target,
  Waves,
  AlignJustify,
  Bell,
  X,
  CheckCircle,
  Sliders,
  Minus,
  ChevronDown,
  ChevronUp,
  Monitor,
  Plus,
  Trash2,
  RefreshCcw,
  Pause,
  Play,
  Archive,
  Megaphone,
  Volume2,
  VolumeX,
  PieChart,
  Trophy,
  History,
  ArrowRight,
  Timer,
  Calendar,
  Radio,
  DollarSign,
  Droplets,
  ArrowLeftRight,
  Scale,
  Star,
  Save,
  Download,
  Copy,
  BellOff,
  ZapOff,
  Flame,
  List,
  Wifi,
  WifiOff,
  Database
} from 'lucide-react';

// ==========================================
// --- Section: Types & Interfaces ---
// ==========================================

type Locale = 'tr' | 'en';
export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '3d' | '7d' | '30d';
type DataMode = 'MOCK' | 'REAL';

const TIMEFRAMES: Timeframe[] = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d', '3d', '7d', '30d'];
const GRID_TFS: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];
const MORE_TFS: Timeframe[] = ['3m', '30m', '3d', '7d', '30d'];

// Filter System Types
type FilterMetric = 'rsi' | 'rsi_slope' | 'macd_hist' | 'macd_cross' | 'trend_state' | 'exec_score' | 'vwap_state' | 'vol_delta' | 'level_prox' | 'oi_change';
type FilterOperator = '>' | '<' | '=' | '!=';

interface FilterRule {
  id: string;
  metric: FilterMetric;
  operator: FilterOperator;
  value: string | number;
  tf: Timeframe;
}

interface Preset {
    id: string;
    name: string;
    rules: FilterRule[];
    primaryTf: Timeframe;
    contextTf: Timeframe;
}

// Alert System Types
type AlertSeverity = 'info' | 'success' | 'warning' | 'high';

interface StrategyParams {
    rsiOverbought: number;
    rsiOversold: number;
    vwapHoldTicks: number;
    levelProxPct: number;
}

interface AlertRule {
  id: string;
  nameKey: string; 
  descKey: string; 
  enabled: boolean;
  logic: 'AND' | 'OR';
  rules: FilterRule[]; // Visual only
  severity: AlertSeverity;
  cooldownMinutes: number;
  params: StrategyParams; 
}

interface AlertEvent {
  id: string;
  timestamp: number;
  symbol: string;
  ruleId: string;
  side: 'LONG' | 'SHORT';
  severity: AlertSeverity;
  titleKey: string;
  bodyKey: string;
  vars: Record<string, string | number>;
  mergedReasons?: string[];
}

// Analytics Types
interface SimTrade {
  id: string;
  symbol: string;
  ruleId: string;
  side: 'LONG' | 'SHORT';
  entryTs: number;
  entryPrice: number;
  exitTs: number | null;
  exitPrice: number | null;
  exitReason: 'TIME' | 'INVALIDATION' | 'STOP' | null;
  holdSeconds: number; 
  result: 'WIN' | 'LOSS' | 'FLAT' | 'OPEN';
  grossRetPct: number;
  netRetPct: number; 
  feePct: number;
  mfePct: number; 
  maePct: number; 
}

interface SignalLog {
    id: string;
    timestamp: number;
    symbol: string;
    ruleId: string;
    side: 'LONG' | 'SHORT';
    price: number;
    reasons: string[];
}

interface StrategyStats {
  ruleId: string;
  triggers: number;
  tradesClosed: number;
  winRatePct: number;
  avgRetPct: number; 
  avgMfePct: number;
  avgMaePct: number;
}

interface AnalyticsSettings {
  holdSeconds: number;
  timeWindow: '15m' | '1h' | '24h' | 'all';
  viewMode: 'GROSS' | 'NET';
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IndicatorState {
  rsi: {
    value: number;
    state: 'oversold' | 'overbought' | 'neutral';
    slope: 'up' | 'down' | 'flat';
  };
  macd: {
    histogram: number;
    signal: number;
    line: number;
    cross: 'bullish' | 'bearish' | null;
    trend: 'bullish' | 'bearish';
  };
  trend: {
    ema20: number;
    ema50: number;
    state: 'up' | 'down' | 'chop';
  };
}

interface VwapData {
  price: number;
  state: 'above' | 'below';
  bandUpper: number;
  bandLower: number;
  reclaimed: boolean;
}

interface LevelData {
  dayHigh: number;
  dayLow: number;
  dayOpen: number;
  prevClose: number;
  weekHigh: number;
  weekLow: number;
  weekOpen: number;
  proximity: 'near_dh' | 'near_dl' | 'near_wh' | 'near_wl' | null; 
}

interface ExecutionData {
  spreadBps: number;
  depthUsd: number; 
  slippageEst: number; 
  score: 'A' | 'B' | 'C';
}

interface OrderflowData {
  takerBuySellRatio: number;
  cvd: number; 
  cvdHistory: number[];
  imbalance: number; // -1 to 1
  ofi: number; // 0-100
  whalePrints: number;
}

export interface CoinData {
  symbol: string;
  price: number;
  priceChange1m: number;
  priceChange5m: number;
  volume1m: number;
  volumeDelta: number;
  oi: number;
  oiChange: number;
  funding: number;
  score: number;
  technical: Record<Timeframe, IndicatorState>;
  atr: Record<Timeframe, number>;
  confidence: number;
  vwap: VwapData;
  levels: LevelData;
  execution: ExecutionData;
  orderflow: OrderflowData;
  tags: string[];
  lastUpdateTs: number;
}

// ==========================================
// --- Section: Quant Engine Helpers ---
// ==========================================

const calculateSMA = (data: number[], period: number): number[] => {
  const sma = new Array(data.length).fill(0);
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { sma[i] = NaN; continue; }
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j];
    sma[i] = sum / period;
  }
  return sma;
};

const calculateEMA = (data: number[], period: number): number[] => {
  const k = 2 / (period + 1);
  const ema = new Array(data.length).fill(0);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  ema[period - 1] = sum / period;
  for (let i = period; i < data.length; i++) ema[i] = data[i] * k + ema[i - 1] * (1 - k);
  return ema;
};

const calculateATR = (high: number[], low: number[], close: number[], period: number = 14): number[] => {
    const tr = new Array(high.length).fill(0);
    tr[0] = high[0] - low[0];
    for (let i = 1; i < high.length; i++) {
        tr[i] = Math.max(high[i] - low[i], Math.abs(high[i] - close[i - 1]), Math.abs(low[i] - close[i - 1]));
    }
    return calculateSMA(tr, period);
};

const calculateRSI = (data: number[], period: number = 14): number[] => {
  if (data.length < period + 1) return new Array(data.length).fill(50);
  const rsi = new Array(data.length).fill(0);
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gain += diff; else loss += Math.abs(diff);
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  rsi[period] = 100 - (100 / (1 + (avgGain / avgLoss)));
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = ((avgGain * (period - 1)) + currentGain) / period;
    avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;
    if (avgLoss === 0) rsi[i] = 100;
    else rsi[i] = 100 - (100 / (1 + (avgGain / avgLoss)));
  }
  return rsi;
};

const calculateMACD = (data: number[], fast: number = 12, slow: number = 26, signal: number = 9) => {
  const emaFast = calculateEMA(data, fast);
  const emaSlow = calculateEMA(data, slow);
  const macdLine = new Array(data.length).fill(0);
  for(let i=0; i<data.length; i++) macdLine[i] = emaFast[i] - emaSlow[i];
  const signalLine = calculateEMA(macdLine, signal); 
  const histogram = new Array(data.length).fill(0);
  for(let i=0; i<data.length; i++) histogram[i] = macdLine[i] - signalLine[i];
  return { macdLine, signalLine, histogram };
};

const generateCandles = (basePrice: number, count: number, tf: Timeframe): Candle[] => {
  const candles: Candle[] = [];
  let currentPrice = basePrice;
  const now = Date.now();
  const tfMap: Record<string, number> = {
      '1m': 60000, '3m': 180000, '5m': 300000, '15m': 900000, 
      '30m': 1800000, '1h': 3600000, '4h': 14400000, 
      '1d': 86400000, '3d': 259200000, '7d': 604800000, '30d': 2592000000
  };
  const interval = tfMap[tf] || 60000;
  for (let i = count; i > 0; i--) {
    const time = now - (i * interval);
    const volatility = currentPrice * 0.005 * (Math.random() + 0.5); 
    const change = (Math.random() - 0.5) * volatility;
    const open = currentPrice;
    const close = currentPrice + change;
    candles.push({ 
        time, open, close, 
        high: Math.max(open, close) + Math.random() * volatility * 0.5, 
        low: Math.min(open, close) - Math.random() * volatility * 0.5, 
        volume: Math.random() * 100000 + 10000 
    });
    currentPrice = close;
  }
  return candles;
};

// Expanded Filter Evaluator
const evaluateRule = (coin: CoinData, rule: FilterRule): boolean => {
    const tech = coin.technical[rule.tf];
    if (!tech) return false;

    switch (rule.metric) {
        case 'rsi': {
            const val = tech.rsi.value;
            const target = Number(rule.value);
            if (rule.operator === '>') return val > target;
            if (rule.operator === '<') return val < target;
            return false;
        }
        case 'rsi_slope': {
            return rule.operator === '=' ? tech.rsi.slope === rule.value : tech.rsi.slope !== rule.value;
        }
        case 'trend_state': {
             return rule.operator === '=' ? tech.trend.state === rule.value : tech.trend.state !== rule.value;
        }
        case 'macd_hist': {
             const val = tech.macd.histogram;
             const target = Number(rule.value);
             if (rule.operator === '>') return val > target;
             if (rule.operator === '<') return val < target;
             return false;
        }
        case 'macd_cross': {
             // value: 'bullish' | 'bearish'
             return rule.operator === '=' ? tech.macd.cross === rule.value : tech.macd.cross !== rule.value;
        }
        case 'exec_score': {
             return rule.operator === '=' ? coin.execution.score === rule.value : coin.execution.score !== rule.value;
        }
        case 'vwap_state': {
             return rule.operator === '=' ? coin.vwap.state === rule.value : coin.vwap.state !== rule.value;
        }
        case 'vol_delta': {
             const target = Number(rule.value);
             if (rule.operator === '>') return coin.volumeDelta > target;
             return false;
        }
        case 'oi_change': {
             const target = Number(rule.value);
             if (rule.operator === '>') return coin.oiChange > target;
             return false;
        }
        case 'level_prox': {
             // value: 'near_dh' etc.
             return rule.operator === '=' ? coin.levels.proximity === rule.value : coin.levels.proximity !== rule.value;
        }
        default: return true;
    }
};

const resolveAlertVariables = (coin: CoinData, rule: AlertRule): Record<string, string | number> => {
    const tf = rule.rules[0]?.tf || '15m'; 
    const tech = coin.technical[tf];
    return {
        symbol: coin.symbol.replace('USDT', ''),
        tf: tf,
        price: coin.price.toFixed(2),
        rsi: tech.rsi.value.toFixed(0),
        macd_state: tech.macd.cross || 'neutral',
        exec: coin.execution.score,
        vwap_state: coin.vwap.state,
        level: coin.levels.proximity ? coin.levels.proximity.replace('near_', '').toUpperCase() : 'Level',
        confidence: coin.confidence.toFixed(0)
    };
};

const getExecutionCost = (score: 'A' | 'B' | 'C'): number => {
    // 0.02% for A, 0.05% for B, 0.1% for C (Simulates spread + slippage + fees)
    if (score === 'A') return 0.0002;
    if (score === 'B') return 0.0005;
    return 0.001;
};

// ==========================================
// --- Section: i18n & Constants ---
// ==========================================

const TRANSLATIONS = {
  tr: {
    nav: { market_mode: "Piyasa", analytics_mode: "Analiz", alerts_mode: "Uyarılar", connected: "Bağlı", tf_primary: "Ana TF", tf_context: "Kontekst", data_source: "Veri Kaynağı", mock: "Mock", real: "Canlı" },
    scanner: {
      cols: { ticker: "SEMBOLLER", price: "FİYAT", vwap: "VWAP", exec: "KALİTE", rsi: "RSI", indicators: "GÖSTERGELER", score: "SKOR" },
      empty_desc: "Kriterlere uyan coin bulunamadı.",
      count_matches: "%{count} Eşleşme",
      tabs: { all: "Tümü", watchlist: "İzleme", hotlist: "Sıcak Fırsatlar" }
    },
    filter: {
      title: "Gelişmiş Filtre",
      add_rule: "Kural Ekle",
      reset: "Sıfırla",
      apply: "Uygula",
      presets: "Hazır Ayarlar",
      save: "Kaydet",
      metrics: { rsi: "RSI", rsi_slope: "RSI Eğim", macd_hist: "MACD Hist", macd_cross: "MACD Kesişim", trend_state: "Trend (EMA)", exec_score: "Exec Score", vwap_state: "VWAP Durumu", vol_delta: "Hacim Delta", level_prox: "Seviye Yakınlığı", oi_change: "OI Değişimi" }
    },
    detail: {
      select_prompt: "Taramak için bir sembol seçin",
      tabs: { overview: "Genel", tech: "Teknik Matris", levels: "Seviyeler", flow: "Orderflow" },
      tech_grid: { metric: "METRİK" },
      reasoning: {
        title: "Analiz & Strateji",
        confluence: "Onay: %{p} TF (%{pState}) ve %{c} TF (%{cState}) uyumlu.",
        divergence: "Uyarı: %{p} TF (%{pState}) fakat %{c} TF (%{cState}) ters yönde.",
        invalidation: "İptal: %{tf} kapanışı %{level} seviyesini geçerse.",
        vwap_context: "Fiyat VWAP'ın %{state}."
      },
      overview: { mark_price: "Gösterge Fiyatı", flux_score: "Flux Skoru", spread: "Spread", depth: "Derinlik", exec_score: "Yürütme Puanı", trade_plan: "Trade Planı", recent: "Son Olaylar" },
      levels: { title: "Kritik Seviyeler", name: "Seviye", price: "Fiyat", dist: "Uzaklık" },
      flow: { title: "Orderflow", taker: "Taker B/S", cvd: "CVD", imbalance: "Imbalance", ofi: "OFI Score" }
    },
    alerts: {
      title: "Uyarı Merkezi",
      feed: "Akış",
      rules: "Kurallar",
      clear: "Temizle",
      pause: "Durdur",
      resume: "Devam Et",
      empty_feed: "Henüz uyarı yok...",
      merged_title: "Çoklu Sinyal",
      settings: "Ayarlar",
      copy: "Kopyala",
      copied: "Kopyalandı",
      rules_config: {
        rsi_reversal: { name: "RSI Dönüş", desc: "Aşırı alım/satım ({rsi}) bölgesinden dönüş sinyali." },
        macd_momentum: { name: "MACD Momentum", desc: "{tf} grafiğinde {macd_state} momentum değişimi." },
        vwap_cross: { name: "VWAP Kesişimi", desc: "Fiyat VWAP'ı kesti ve tutundu." },
        level_bounce: { name: "Seviye Tepkisi", desc: "{level} bölgesinde likidite tepkisi." },
        oi_surge: { name: "Hacim Patlaması", desc: "Anormal hacim ve OI artışı tespit edildi." },
        confluence: { name: "Trend Onayı", desc: "Çoklu zaman dilimi trend uyumu (Exec: {exec})." }
      }
    },
    analytics: {
        title: "Strateji Performansı",
        subtitle: "Gerçek zamanlı sinyal takibi ve başarı metrikleri",
        best_perf: "En İyi Strateji",
        total_signals: "Toplam Sinyal",
        avg_win_rate: "Ort. Başarı",
        avg_return_kpi: "Ort. Getiri",
        last_signals: "Son Sinyaller",
        details_title: "Strateji Detayları",
        recent_trades_context: "Bu Strateji İçin İşlemler",
        cols: { strategy: "Strateji", triggers: "Tetiklenme", trades: "İşlemler", win_rate: "Başarı %", avg_return: "Ort. Getiri", mfe: "Ort. MFE", mae: "Ort. MAE", status: "Durum" },
        settings: { hold_duration: "Süre", time_window: "Zaman", reset: "Sıfırla", view_mode: "Gösterim" },
        windows: { '15m': "15dk", '1h': "1s", '24h': "24s", 'all': "Tümü" },
        modes: { 'GROSS': "Brüt", 'NET': "Net" }
    }
  },
  en: {
    nav: { market_mode: "Market", analytics_mode: "Analytics", alerts_mode: "Alerts", connected: "Connected", tf_primary: "Primary TF", tf_context: "Context", data_source: "Source", mock: "Mock", real: "Real" },
    scanner: {
      cols: { ticker: "TICKER", price: "PRICE", vwap: "VWAP", exec: "EXEC", rsi: "RSI", indicators: "INDICATORS", score: "SCORE" },
      empty_desc: "No coins match criteria.",
      count_matches: "%{count} Matches",
      tabs: { all: "All Coins", watchlist: "Watchlist", hotlist: "Hot Opportunities" }
    },
    filter: {
      title: "Advanced Filter",
      add_rule: "Add Rule",
      reset: "Reset",
      apply: "Apply",
      presets: "Presets",
      save: "Save",
      metrics: { rsi: "RSI", rsi_slope: "RSI Slope", macd_hist: "MACD Hist", macd_cross: "MACD Cross", trend_state: "Trend (EMA)", exec_score: "Exec Score", vwap_state: "VWAP State", vol_delta: "Vol Delta", level_prox: "Level Prox", oi_change: "OI Change" }
    },
    detail: {
      select_prompt: "Select a ticker to scan",
      tabs: { overview: "Overview", tech: "Tech Matrix", levels: "Levels", flow: "Orderflow" },
      tech_grid: { metric: "METRIC" },
      reasoning: {
        title: "Reasoning & Invalidation",
        confluence: "Confluence: %{p} TF (%{pState}) aligns with %{c} TF (%{cState}).",
        divergence: "Caution: %{p} TF (%{pState}) but %{c} TF (%{cState}) conflicts.",
        invalidation: "Invalidation: If %{tf} closes beyond %{level}.",
        vwap_context: "Price is %{state} VWAP."
      },
      overview: { mark_price: "Mark Price", flux_score: "Flux Score", spread: "Spread", depth: "Depth", exec_score: "Exec Score", trade_plan: "Trade Plan", recent: "Recent Activity" },
      levels: { title: "Critical Levels", name: "Level", price: "Price", dist: "Dist %" },
      flow: { title: "Orderflow", taker: "Taker B/S", cvd: "CVD", imbalance: "Imbalance", ofi: "OFI Score" }
    },
    alerts: {
      title: "Alert Center",
      feed: "Live Feed",
      rules: "Rules Config",
      clear: "Clear",
      pause: "Pause",
      resume: "Resume",
      empty_feed: "No alerts yet...",
      merged_title: "Multi-Factor Signal",
      settings: "Settings",
      copy: "Copy Msg",
      copied: "Copied!",
      rules_config: {
        rsi_reversal: { name: "RSI Reversal", desc: "Reversal from overbought/sold ({rsi}) zone." },
        macd_momentum: { name: "MACD Momentum", desc: "{macd_state} momentum shift detected on {tf}." },
        vwap_cross: { name: "VWAP Cross", desc: "Price crossed VWAP and holding." },
        level_bounce: { name: "Level Bounce", desc: "Liquidity reaction at {level}." },
        oi_surge: { name: "Vol Surge", desc: "Abnormal Volume & OI activity detected." },
        confluence: { name: "Trend Confluence", desc: "Multi-TF trend alignment (Exec: {exec})." }
      }
    },
    analytics: {
        title: "Strategy Performance",
        subtitle: "Real-time signal tracking and success metrics",
        best_perf: "Top Strategy",
        total_signals: "Total Signals",
        avg_win_rate: "Avg Win Rate",
        avg_return_kpi: "Avg Return",
        last_signals: "Latest Signals",
        details_title: "Strategy Details",
        recent_trades_context: "Recent Trades for Strategy",
        cols: { strategy: "Strategy", triggers: "Triggers", trades: "Trades", win_rate: "Win Rate", avg_return: "Avg Return", mfe: "Avg MFE", mae: "Avg MAE", status: "Status" },
        settings: { hold_duration: "Duration", time_window: "Window", reset: "Reset", view_mode: "View" },
        windows: { '15m': "15m", '1h': "1h", '24h': "24h", 'all': "All" },
        modes: { 'GROSS': "Gross", 'NET': "Net" }
    }
  }
};

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatMoney: (val: number) => string;
  formatPct: (val: number) => string;
  formatNumber: (val: number, decimals?: number) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('tr');
  const setLocale = (l: Locale) => { setLocaleState(l); try { localStorage.setItem('fluxterm_locale', l); } catch (e) {} };
  useEffect(() => { try { const saved = localStorage.getItem('fluxterm_locale') as Locale; if (saved) setLocaleState(saved); } catch (e) {} }, []);
  const t = (path: string, params?: Record<string, string | number>) => {
    const keys = path.split('.'); let current: any = TRANSLATIONS[locale];
    for (const k of keys) { if (current[k] === undefined) { let fb: any = TRANSLATIONS['en']; for (const fbK of keys) fb = fb?.[fbK]; return fb || path; } current = current[k]; }
    let result = current as string;
    if (params) Object.entries(params).forEach(([key, value]) => { result = result.replace(`%{${key}}`, String(value)); });
    return result;
  };
  const formatMoney = (val: number) => new Intl.NumberFormat(locale==='tr'?'tr-TR':'en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: val<1?4:2 }).format(val);
  const formatPct = (val: number) => new Intl.NumberFormat(locale==='tr'?'tr-TR':'en-US', { minimumFractionDigits: 2 }).format(Math.abs(val));
  const formatNumber = (val: number, decimals=2) => new Intl.NumberFormat(locale==='tr'?'tr-TR':'en-US', { minimumFractionDigits: decimals }).format(val);
  return <I18nContext.Provider value={{ locale, setLocale, t, formatMoney, formatPct, formatNumber }}>{children}</I18nContext.Provider>;
};
const useI18n = () => { const context = useContext(I18nContext); if (!context) throw new Error("useI18n must be used within I18nProvider"); return context; };

// ==========================================
// --- Section: UI Components (Atoms) ---
// ==========================================

const FormatValue = ({ value, type }: { value: number, type: 'price' | 'percent' | 'usd' | 'raw' }) => {
  const { formatPct, formatNumber } = useI18n();
  if (type === 'percent') {
    const color = value > 0 ? 'text-neon-green' : value < 0 ? 'text-neon-red' : 'text-gray-400';
    return <span className={`font-mono ${color}`}>{value > 0 ? '+' : value < 0 ? '-' : ''}{formatPct(value)}</span>;
  }
  if (type === 'price') return <span className="font-mono text-gray-200">{formatNumber(value, value < 10 ? 4 : 2)}</span>;
  return <span className="font-mono">{formatNumber(value, 2)}</span>;
};

const RsiBadge = ({ value }: { value: number }) => {
  let colorClass = 'text-gray-500';
  if (value < 30) colorClass = 'text-neon-green font-bold animate-pulse'; 
  else if (value > 70) colorClass = 'text-neon-red font-bold animate-pulse'; 
  else if (value < 40) colorClass = 'text-neon-green/70';
  else if (value > 60) colorClass = 'text-neon-red/70';
  return <span className={`font-mono ${colorClass}`}>{value.toFixed(0)}</span>;
};

const MacdIcon = ({ macd }: { macd: IndicatorState['macd'] }) => {
  const isBullish = macd.histogram > 0;
  return (
    <div className={`flex items-center justify-end ${isBullish ? 'text-neon-green' : 'text-neon-red'} space-x-1`}>
      {isBullish ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      <div className={`w-1 h-3 ${isBullish ? 'bg-neon-green' : 'bg-neon-red'} rounded-sm opacity-80`}></div>
    </div>
  );
};

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'chop' }) => {
    if (trend === 'up') return <TrendingUp size={14} className="text-neon-green" />;
    if (trend === 'down') return <TrendingDown size={14} className="text-neon-red" />;
    return <Minus size={14} className="text-gray-500" />;
}

const ScoreBadge = ({ score }: { score: number }) => {
  let colorClass = 'bg-gray-800 text-gray-400';
  if (score >= 80) colorClass = 'bg-neon-green/20 text-neon-green border border-neon-green/30';
  else if (score >= 60) colorClass = 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30';
  else if (score >= 40) colorClass = 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30';
  return <div className={`px-2 py-0.5 rounded text-xs font-bold text-center w-12 ${colorClass}`}>{score}</div>;
};

const ExecScoreBadge = ({ score }: { score: 'A' | 'B' | 'C' }) => {
  let colorClass = 'text-gray-500';
  if (score === 'A') colorClass = 'text-neon-green font-bold';
  else if (score === 'B') colorClass = 'text-neon-blue';
  else if (score === 'C') colorClass = 'text-yellow-500';
  return <span className={`font-mono ${colorClass}`}>{score}</span>;
};

// ==========================================
// --- Section: Components (Molecules) ---
// ==========================================

const TimeframeSelector = ({ selected, onSelect, label }: { selected: Timeframe, onSelect: (tf: Timeframe) => void, label: string }) => {
    const [openMore, setOpenMore] = useState(false);
    return (
        <div className="flex items-center space-x-1 bg-gray-900 rounded p-1 border border-gray-800 relative">
            <span className="text-[10px] text-gray-500 font-bold px-2 uppercase">{label}</span>
            <div className="flex space-x-0.5">
                {['1m','5m','15m','1h','4h'].map(tf => (
                    <button key={tf} onClick={() => onSelect(tf as Timeframe)} className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${selected === tf ? 'bg-gray-700 text-white font-bold shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>{tf}</button>
                ))}
            </div>
            <div className="pl-1 border-l border-gray-700 ml-1 relative">
                <button onClick={() => setOpenMore(!openMore)} className={`flex items-center space-x-1 px-1 py-1 text-[10px] font-mono rounded ${['1d','3d','7d'].includes(selected) ? 'text-white font-bold' : 'text-gray-500 hover:text-gray-300'}`}>
                  <span>{['1d','3d','7d'].includes(selected) ? selected : '...'}</span><ChevronDown size={10} />
                </button>
                {openMore && (
                  <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenMore(false)}></div>
                  <div className="absolute top-full right-0 mt-1 w-20 bg-gray-800 border border-gray-700 rounded shadow-xl z-50 flex flex-col py-1">
                     {['1d','3d','7d','30d'].map(tf => (
                       <button key={tf} onClick={() => { onSelect(tf as Timeframe); setOpenMore(false); }} className={`px-3 py-1.5 text-xs font-mono text-left hover:bg-gray-700 ${selected === tf ? 'text-neon-green font-bold' : 'text-gray-400'}`}>{tf}</button>
                     ))}
                  </div>
                  </>
                )}
            </div>
        </div>
    )
}

// ==========================================
// --- Section: Filter Builder (with Presets) ---
// ==========================================

const FilterBuilder = ({ rules, onUpdate, presets, onSavePreset, onLoadPreset }: { 
    rules: FilterRule[], 
    onUpdate: (r: FilterRule[]) => void,
    presets: Preset[],
    onSavePreset: (name: string) => void,
    onLoadPreset: (p: Preset) => void
}) => {
    // ... (FilterBuilder content remains the same)
    const { t } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const [showSave, setShowSave] = useState(false);
    const [presetName, setPresetName] = useState("");
    
    // New Rule State
    const [newMetric, setNewMetric] = useState<FilterMetric>('rsi');
    const [newOperator, setNewOperator] = useState<FilterOperator>('>');
    const [newValue, setNewValue] = useState<string>('50');
    const [newTf, setNewTf] = useState<Timeframe>('15m');

    const addRule = () => {
        const id = Math.random().toString(36).substr(2, 9);
        onUpdate([...rules, { id, metric: newMetric, operator: newOperator, value: newValue, tf: newTf }]);
    };

    const removeRule = (id: string) => onUpdate(rules.filter(r => r.id !== id));

    return (
        <div className="border-b border-gray-800 bg-gray-900/30">
            <div className="h-10 flex items-center px-4 justify-between cursor-pointer hover:bg-gray-900/50" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex items-center space-x-2 text-xs font-bold text-gray-400">
                    <Filter size={14} className={rules.length > 0 ? "text-neon-blue" : ""} />
                    <span>{t('filter.title')}</span>
                    {rules.length > 0 && <span className="bg-neon-blue/20 text-neon-blue px-1.5 rounded text-[10px]">{rules.length}</span>}
                </div>
                <ChevronDown size={14} className={`transform transition-transform text-gray-500 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="p-4 bg-gray-950 border-t border-gray-800 space-y-4">
                    {/* Presets Bar */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                            <span className="text-[10px] text-gray-500 uppercase font-bold">{t('filter.presets')}</span>
                            <div className="relative group">
                                <button className="text-xs bg-gray-900 border border-gray-700 px-2 py-1 rounded text-gray-300 hover:text-white flex items-center">
                                    Load <ChevronDown size={10} className="ml-1"/>
                                </button>
                                <div className="absolute top-full left-0 mt-1 w-32 bg-gray-900 border border-gray-700 rounded shadow-xl hidden group-hover:block z-50">
                                    {presets.length === 0 && <div className="px-2 py-1 text-[10px] text-gray-500 italic">No presets</div>}
                                    {presets.map(p => (
                                        <button key={p.id} onClick={() => onLoadPreset(p)} className="block w-full text-left px-2 py-1 text-[10px] hover:bg-gray-800 text-gray-300">{p.name}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {rules.length > 0 && (
                            <div className="flex items-center space-x-2">
                                {showSave ? (
                                    <div className="flex items-center space-x-1 animate-fadeIn">
                                        <input type="text" value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Name..." className="bg-gray-900 border border-gray-700 text-xs px-2 py-1 rounded w-24 text-gray-300 focus:border-neon-blue outline-none"/>
                                        <button onClick={() => { onSavePreset(presetName); setShowSave(false); setPresetName(""); }} className="p-1 bg-neon-blue/20 text-neon-blue rounded hover:bg-neon-blue/30"><CheckCircle size={14}/></button>
                                        <button onClick={() => setShowSave(false)} className="p-1 text-gray-500 hover:text-white"><X size={14}/></button>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowSave(true)} className="text-[10px] flex items-center space-x-1 text-gray-400 hover:text-neon-blue"><Save size={12}/> <span>{t('filter.save')}</span></button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Rule Creation Bar */}
                    <div className="flex flex-wrap items-end gap-2 p-3 bg-gray-900 rounded border border-gray-800">
                        <div className="flex flex-col space-y-1">
                            <label className="text-[9px] text-gray-500 uppercase">Metric</label>
                            <select value={newMetric} onChange={e => setNewMetric(e.target.value as any)} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded p-1.5 focus:border-neon-blue outline-none w-32">
                                {['rsi','rsi_slope','macd_hist','macd_cross','trend_state','exec_score','vwap_state','vol_delta','level_prox'].map(m => <option key={m} value={m}>{t(`filter.metrics.${m}`)}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col space-y-1">
                            <label className="text-[9px] text-gray-500 uppercase">Op</label>
                            <select value={newOperator} onChange={e => setNewOperator(e.target.value as any)} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded p-1.5 focus:border-neon-blue outline-none w-16">
                                {['>','<','=','!='].map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col space-y-1">
                            <label className="text-[9px] text-gray-500 uppercase">Value</label>
                            {/* ... (Same input logic as before) ... */}
                            {newMetric === 'trend_state' ? (
                                <select value={newValue} onChange={e => setNewValue(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded p-1.5 w-24">
                                    <option value="up">Up</option><option value="down">Down</option><option value="chop">Chop</option>
                                </select>
                            ) : newMetric === 'rsi_slope' ? (
                                <select value={newValue} onChange={e => setNewValue(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded p-1.5 w-24">
                                    <option value="up">Up</option><option value="down">Down</option><option value="flat">Flat</option>
                                </select>
                             ) : newMetric === 'macd_cross' ? (
                                <select value={newValue} onChange={e => setNewValue(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded p-1.5 w-24">
                                    <option value="bullish">Bullish</option><option value="bearish">Bearish</option>
                                </select>
                            ) : newMetric === 'vwap_state' ? (
                                <select value={newValue} onChange={e => setNewValue(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded p-1.5 w-24">
                                    <option value="above">Above</option><option value="below">Below</option>
                                </select>
                            ) : newMetric === 'exec_score' ? (
                                <select value={newValue} onChange={e => setNewValue(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded p-1.5 w-24">
                                    <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                                </select>
                            ) : newMetric === 'level_prox' ? (
                                <select value={newValue} onChange={e => setNewValue(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded p-1.5 w-24">
                                    <option value="near_dh">Day High</option><option value="near_dl">Day Low</option>
                                </select>
                            ) : (
                                <input type="number" value={newValue} onChange={e => setNewValue(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded p-1.5 w-24 focus:border-neon-blue outline-none" />
                            )}
                        </div>
                        <div className="flex flex-col space-y-1">
                            <label className="text-[9px] text-gray-500 uppercase">TF</label>
                            <select value={newTf} onChange={e => setNewTf(e.target.value as any)} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded p-1.5 w-20">
                                {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                            </select>
                        </div>
                        <button onClick={addRule} className="bg-neon-blue/20 text-neon-blue border border-neon-blue/50 hover:bg-neon-blue/30 p-1.5 rounded flex items-center justify-center transition-colors">
                            <Plus size={16} />
                        </button>
                    </div>

                    {/* Active Rules List */}
                    {rules.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {rules.map(rule => (
                                <div key={rule.id} className="flex items-center space-x-2 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 group hover:border-gray-500 transition-colors">
                                    <span className="font-mono text-[10px] text-gray-500 uppercase">{rule.tf}</span>
                                    <span className="font-bold text-neon-blue">{t(`filter.metrics.${rule.metric}`)}</span>
                                    <span className="text-gray-400 font-mono">{rule.operator}</span>
                                    <span className="font-mono font-bold">{rule.value}</span>
                                    <button onClick={() => removeRule(rule.id)} className="text-gray-600 hover:text-neon-red ml-1"><X size={12}/></button>
                                </div>
                            ))}
                            <button onClick={() => onUpdate([])} className="text-[10px] text-gray-500 hover:text-gray-300 underline ml-auto self-center">{t('filter.reset')}</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ... (DetailPanel, TechnicalGrid, AlertsView, AlertsDrawer, AnalyticsView remain the same) ...

const TechnicalGrid = ({ coin }: { coin: CoinData }) => {
    // ... same as before
    const { t } = useI18n();
    const [showMore, setShowMore] = useState(false);
    
    // Merge Main Grid TFs and if expanded, show the rest
    const displayTFs = showMore ? [...GRID_TFS, ...MORE_TFS] : GRID_TFS;

    // Reasoning Generator
    const generateReasoning = () => {
        const primary = coin.technical['15m']; 
        const context = coin.technical['1h'];
        const isConfluence = primary.trend.state === context.trend.state;
        const confluenceText = t('detail.reasoning.confluence', { 
            p: '15m', pState: primary.trend.state.toUpperCase(),
            c: '1h', cState: context.trend.state.toUpperCase()
        });
        const divergenceText = t('detail.reasoning.divergence', { 
            p: '15m', pState: primary.trend.state.toUpperCase(),
            c: '1h', cState: context.trend.state.toUpperCase()
        });

        return (
            <div className="space-y-2 font-mono text-xs">
                 <div className="flex items-start">
                    <span className={`${isConfluence ? 'text-neon-green' : 'text-neon-yellow'} mr-2`}>●</span>
                    <span className="text-gray-400">{isConfluence ? confluenceText : divergenceText}</span>
                 </div>
                 <div className="flex items-start">
                    <span className="text-neon-blue mr-2">●</span>
                    <span className="text-gray-400">{t('detail.reasoning.vwap_context', { state: coin.vwap.state })}</span>
                 </div>
                 <div className="flex items-start">
                    <span className="text-neon-red mr-2">●</span>
                    <span className="text-gray-400">{t('detail.reasoning.invalidation', { tf: '1h', level: coin.technical['1h'].trend.ema20.toFixed(2) })}</span>
                 </div>
            </div>
        )
    };

    return (
        <div className="space-y-4">
            <div className="bg-gray-950 p-4 rounded border border-gray-800 overflow-x-auto relative">
                <button onClick={() => setShowMore(!showMore)} className="absolute top-2 right-2 p-1 bg-gray-900 border border-gray-700 rounded text-gray-500 hover:text-white z-10">{showMore ? <Minus size={10} /> : <Plus size={10} />}</button>
                <div className="min-w-[400px]">
                    {/* Header Row */}
                    <div className="grid grid-flow-col auto-cols-fr gap-2 mb-3">
                        <div className="text-[10px] font-bold text-gray-500 uppercase flex items-center w-16 sticky left-0 bg-gray-950">{t('detail.tech_grid.metric')}</div>
                        {displayTFs.map(tf => (
                            <div key={tf} className="text-[10px] font-bold text-center text-gray-500 font-mono bg-gray-900/50 rounded py-1 min-w-[50px]">{tf}</div>
                        ))}
                    </div>
                    {/* RSI Row */}
                    <div className="grid grid-flow-col auto-cols-fr gap-2 mb-2">
                        <div className="text-xs font-bold text-gray-400 flex items-center w-16 sticky left-0 bg-gray-950">RSI</div>
                        {displayTFs.map(tf => {
                            const data = coin.technical[tf].rsi;
                            return (
                            <div key={tf} className="flex flex-col items-center justify-center p-2 bg-gray-900/20 rounded border border-gray-800/50 min-w-[50px]">
                                <div className="flex items-center space-x-1">
                                    <span className={`text-xs font-mono font-bold ${data.value < 30 ? 'text-neon-green' : data.value > 70 ? 'text-neon-red' : 'text-gray-300'}`}>{data.value.toFixed(0)}</span>
                                    {data.slope === 'up' ? <ArrowUpRight size={10} className="text-gray-500" /> : <ArrowDownRight size={10} className="text-gray-500" />}
                                </div>
                                <div className={`text-[9px] mt-0.5 font-bold uppercase ${data.state === 'oversold' ? 'text-neon-green' : data.state === 'overbought' ? 'text-neon-red' : 'text-gray-500'}`}>{data.state === 'neutral' ? '-' : data.state.substring(0,4)}</div>
                            </div>
                            );
                        })}
                    </div>
                    {/* MACD Row */}
                    <div className="grid grid-flow-col auto-cols-fr gap-2 mb-2">
                        <div className="text-xs font-bold text-gray-400 flex items-center w-16 sticky left-0 bg-gray-950">MACD</div>
                        {displayTFs.map(tf => {
                            const data = coin.technical[tf].macd;
                            const isBullish = data.histogram > 0;
                            return (
                            <div key={tf} className="flex flex-col items-center justify-center p-2 bg-gray-900/20 rounded border border-gray-800/50 min-w-[50px]">
                                    <div className={`flex items-center space-x-1 ${isBullish ? 'text-neon-green' : 'text-neon-red'}`}>
                                    {isBullish ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    <span className={`text-[9px] font-mono ${isBullish ? 'text-neon-green/70' : 'text-neon-red/70'}`}>{Math.abs(data.histogram).toFixed(2)}</span>
                                </div>
                                <div className={`text-[9px] mt-0.5 font-bold ${data.cross ? (data.cross === 'bullish' ? 'text-neon-green' : 'text-neon-red') : 'text-gray-500'}`}>{data.cross ? (data.cross === 'bullish' ? 'BULL' : 'BEAR') : 'WAIT'}</div>
                            </div>
                            );
                        })}
                    </div>
                    {/* Trend Row */}
                    <div className="grid grid-flow-col auto-cols-fr gap-2">
                        <div className="text-xs font-bold text-gray-400 flex items-center w-16 sticky left-0 bg-gray-950">EMA</div>
                        {displayTFs.map(tf => {
                            const data = coin.technical[tf].trend;
                            return (
                            <div key={tf} className="flex flex-col items-center justify-center p-2 bg-gray-900/20 rounded border border-gray-800/50 min-w-[50px]">
                                <TrendIcon trend={data.state} />
                                <span className={`text-[9px] font-bold mt-0.5 uppercase ${data.state === 'up' ? 'text-neon-green' : data.state === 'down' ? 'text-neon-red' : 'text-gray-500'}`}>{data.state}</span>
                            </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {/* Confluence Bar */}
            <div className="bg-gray-900/50 p-2 rounded border border-gray-800">
                <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1"><span>CONFLUENCE METER</span><span className="text-neon-blue font-bold">{coin.confidence.toFixed(0)}/100</span></div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden"><div className="bg-neon-blue h-full transition-all duration-500" style={{ width: `${coin.confidence}%` }}></div></div>
            </div>
            {/* Reasoning Block */}
            <div className="bg-gray-800/30 rounded border border-gray-700/50 p-4">
                 <h3 className="text-sm font-semibold text-gray-300 flex items-center mb-3"><Zap size={14} className="mr-2 text-neon-yellow" />{t('detail.reasoning.title')}</h3>
                 {generateReasoning()}
            </div>
        </div>
    )
}

const DetailPanel = ({ coin, onClose, selectedTf, recentSignals, recentTrades, isStarred, toggleStar }: { coin: CoinData | null, onClose: () => void, selectedTf: Timeframe, recentSignals: SignalLog[], recentTrades: SimTrade[], isStarred: boolean, toggleStar: () => void }) => {
  const { t, formatNumber, formatPct } = useI18n();
  const [activeTab, setActiveTab] = useState<'overview' | 'tech' | 'levels' | 'flow'>('overview');
  
  if (!coin) return <div className="hidden lg:flex w-80 h-full border-l border-gray-800 bg-gray-950 flex-col items-center justify-center text-gray-600"><Crosshair size={48} className="mb-4 opacity-20" /><span className="text-sm">{t('detail.select_prompt')}</span></div>;

  const TabButton = ({ id, label, icon }: { id: typeof activeTab, label: string, icon: React.ReactNode }) => (
    <button onClick={() => setActiveTab(id)} className={`flex-1 flex flex-col items-center justify-center py-3 text-xs border-b-2 transition-colors ${activeTab === id ? 'border-neon-green text-gray-100 bg-gray-800/50' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
      <div className="mb-1">{icon}</div>{label}
    </button>
  );

  // Trade Plan Helpers
  const atr = coin.atr[selectedTf] || (coin.price * 0.01);
  const trend = coin.technical[selectedTf].trend.state;
  const suggestedSide = trend === 'up' ? 'LONG' : trend === 'down' ? 'SHORT' : 'NEUTRAL';
  const stopDist = 2 * atr;
  const targetDist = 3 * atr;
  const stopPrice = suggestedSide === 'LONG' ? coin.price - stopDist : coin.price + stopDist;
  const targetPrice = suggestedSide === 'LONG' ? coin.price + targetDist : coin.price - targetDist;
  
  // Cost Calculation
  const feePct = getExecutionCost(coin.execution.score);
  const expectedGrossRet = Math.abs(targetPrice - coin.price) / coin.price;
  const expectedNetRet = expectedGrossRet - feePct;

  // Filter recent events
  const mySignals = recentSignals.filter(s => s.symbol === coin.symbol.replace('USDT','')).slice(0, 5);
  const myTrades = recentTrades.filter(t => t.symbol === coin.symbol).slice(0, 5);

  const levelsList = [
      { name: 'Day High', price: coin.levels.dayHigh },
      { name: 'Day Low', price: coin.levels.dayLow },
      { name: 'Day Open', price: coin.levels.dayOpen },
      { name: 'Prev Close', price: coin.levels.prevClose },
      { name: 'Week High', price: coin.levels.weekHigh },
      { name: 'Week Low', price: coin.levels.weekLow },
      { name: 'Week Open', price: coin.levels.weekOpen },
  ].map(l => ({ ...l, dist: Math.abs(coin.price - l.price) / coin.price })).sort((a,b) => a.dist - b.dist);

  return (
    <div className="fixed inset-y-0 right-0 w-full lg:w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-40 transform transition-transform duration-200 lg:relative lg:transform-none lg:shadow-none flex flex-col h-full">
      <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900">
        <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold font-mono text-gray-100">{coin.symbol}</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">PERP</span>
            <button onClick={toggleStar} className={`p-1 rounded ${isStarred ? 'text-neon-yellow' : 'text-gray-600 hover:text-gray-400'}`}><Star size={16} fill={isStarred ? "currentColor" : "none"}/></button>
        </div>
        <button onClick={onClose} className="lg:hidden p-2 text-gray-500 hover:text-gray-300"><X size={20} /></button>
      </div>
      <div className="flex border-b border-gray-800 bg-gray-950">
        <TabButton id="overview" label={t('detail.tabs.overview')} icon={<AlignJustify size={14} />} />
        <TabButton id="tech" label={t('detail.tabs.tech')} icon={<BarChart2 size={14} />} />
        <TabButton id="levels" label={t('detail.tabs.levels')} icon={<Target size={14} />} />
        <TabButton id="flow" label={t('detail.tabs.flow')} icon={<Waves size={14} />} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
             {/* Header Stats */}
             <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-950 p-3 rounded border border-gray-800"><div className="text-xs text-gray-500 mb-1">{t('detail.overview.mark_price')}</div><div className="text-lg font-mono font-medium text-gray-200">{formatNumber(coin.price, 2)}</div></div>
              <div className="bg-gray-950 p-3 rounded border border-gray-800"><div className="text-xs text-gray-500 mb-1">{t('detail.overview.flux_score')}</div><div className="flex items-center justify-between"><span className="text-lg font-mono font-bold text-neon-blue">{coin.score}</span><Activity size={16} className="text-neon-blue" /></div></div>
             </div>

             {/* Execution Block */}
             <div className="bg-gray-950 rounded border border-gray-800 p-3">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center"><Scale size={12} className="mr-1"/> Execution</div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-900 p-2 rounded text-center">
                        <div className="text-[9px] text-gray-500 uppercase">Spread</div>
                        <div className="text-xs font-mono font-bold text-gray-300">{coin.execution.spreadBps.toFixed(2)} bps</div>
                    </div>
                    <div className="bg-gray-900 p-2 rounded text-center">
                        <div className="text-[9px] text-gray-500 uppercase">Depth</div>
                        <div className="text-xs font-mono font-bold text-gray-300">${formatNumber(coin.execution.depthUsd/1000, 0)}k</div>
                    </div>
                    <div className="bg-gray-900 p-2 rounded text-center">
                        <div className="text-[9px] text-gray-500 uppercase">Slippage</div>
                        <div className={`text-xs font-mono font-bold ${coin.execution.score === 'A' ? 'text-neon-green' : coin.execution.score === 'C' ? 'text-neon-red' : 'text-neon-yellow'}`}>{coin.execution.score} Tier</div>
                    </div>
                </div>
             </div>

             {/* Trade Plan Block */}
             <div className="bg-gray-900/50 rounded border border-gray-700/50 p-3 relative overflow-hidden">
                <div className={`absolute top-0 left-0 bottom-0 w-1 ${suggestedSide === 'LONG' ? 'bg-neon-green' : suggestedSide === 'SHORT' ? 'bg-neon-red' : 'bg-gray-600'}`}></div>
                <div className="pl-3">
                    <div className="flex justify-between items-center mb-2">
                         <div className="text-xs font-bold text-gray-300 uppercase flex items-center"><Crosshair size={12} className="mr-1"/> {t('detail.overview.trade_plan')}</div>
                         <div className={`text-[10px] font-bold px-1.5 rounded ${suggestedSide === 'LONG' ? 'bg-neon-green/20 text-neon-green' : suggestedSide === 'SHORT' ? 'bg-neon-red/20 text-neon-red' : 'bg-gray-700 text-gray-400'}`}>{suggestedSide}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
                        <div className="flex justify-between"><span className="text-gray-500">Entry</span><span className="text-gray-300">{coin.vwap.state === 'above' ? 'VWAP Pullback' : 'VWAP Reclaim'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Stop</span><span className="text-neon-red">{formatNumber(stopPrice)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Target</span><span className="text-neon-green">{formatNumber(targetPrice)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Est Net %</span><span className={`font-bold ${expectedNetRet > 0 ? 'text-neon-green' : 'text-neon-red'}`}>{expectedNetRet > 0 ? '+' : ''}{formatPct(expectedNetRet)}</span></div>
                    </div>
                </div>
             </div>

             {/* Recent Activity */}
             <div className="bg-gray-950 rounded border border-gray-800 p-3">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center"><History size={12} className="mr-1"/> {t('detail.overview.recent')}</div>
                <div className="space-y-2">
                    {mySignals.length === 0 && myTrades.length === 0 && <div className="text-[10px] text-gray-600 italic text-center py-2">No recent activity</div>}
                    {mySignals.map(s => (
                        <div key={s.id} className="flex justify-between items-center text-[10px] bg-gray-900/50 p-1.5 rounded border border-gray-800">
                             <div className="flex items-center space-x-1"><span className={`w-1.5 h-1.5 rounded-full ${s.side === 'LONG' ? 'bg-neon-green' : 'bg-neon-red'}`}></span><span className="text-gray-300">{s.ruleId}</span></div>
                             <span className="text-gray-500">{new Date(s.timestamp).toLocaleTimeString().slice(0,5)}</span>
                        </div>
                    ))}
                    {myTrades.map(t => (
                        <div key={t.id} className="flex justify-between items-center text-[10px] bg-gray-900/50 p-1.5 rounded border border-gray-800">
                             <div className="flex items-center space-x-1"><span className="text-gray-400">Trade Closed</span></div>
                             <span className={`font-mono font-bold ${t.netRetPct > 0 ? 'text-neon-green' : 'text-neon-red'}`}>{formatPct(t.netRetPct)}</span>
                        </div>
                    ))}
                </div>
             </div>
          </div>
        )}
        {activeTab === 'tech' && <TechnicalGrid coin={coin} />}
        {activeTab === 'levels' && (
          <div className="bg-gray-950 p-4 rounded border border-gray-800">
             <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center"><Target size={14} className="mr-2 text-neon-red" />{t('detail.levels.title')}</h3>
             <div className="overflow-x-auto">
                 <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="text-[10px] text-gray-500 uppercase border-b border-gray-800">
                            <th className="pb-2">{t('detail.levels.name')}</th>
                            <th className="pb-2 text-right">{t('detail.levels.price')}</th>
                            <th className="pb-2 text-right">{t('detail.levels.dist')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {levelsList.map((l, i) => (
                            <tr key={i} className={`group hover:bg-gray-900 ${i === 0 ? 'bg-gray-900/30' : ''}`}>
                                <td className="py-2 flex items-center">
                                    <span className={`text-gray-400 group-hover:text-white ${i === 0 ? 'text-neon-yellow font-bold' : ''}`}>{l.name}</span>
                                    {l.dist < 0.003 && <AlertTriangle size={10} className="ml-1 text-neon-red animate-pulse" />}
                                    {l.dist >= 0.003 && l.dist < 0.005 && <AlertTriangle size={10} className="ml-1 text-neon-yellow" />}
                                </td>
                                <td className="py-2 text-right font-mono text-gray-300">{formatNumber(l.price)}</td>
                                <td className="py-2 text-right font-mono text-gray-500">{formatPct(l.dist)}%</td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             </div>
          </div>
        )}
        {activeTab === 'flow' && (
           <div className="bg-gray-950 p-4 rounded border border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center"><Waves size={14} className="mr-2 text-neon-blue" />{t('detail.tabs.flow')}</h3>
              
              {/* Taker Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-900 p-2 rounded">
                      <div className="text-[10px] text-gray-500">{t('detail.flow.taker')} (1m)</div>
                      <div className="flex items-end justify-between mt-1">
                          <div className="text-xs font-mono text-neon-green">B: {(coin.orderflow.takerBuySellRatio * 45).toFixed(0)}%</div>
                          <div className="text-xs font-mono text-neon-red">S: {(100 - (coin.orderflow.takerBuySellRatio * 45)).toFixed(0)}%</div>
                      </div>
                      <div className="w-full bg-neon-red h-1 mt-1 rounded-full overflow-hidden">
                          <div className="bg-neon-green h-full" style={{ width: `${Math.min(100, coin.orderflow.takerBuySellRatio * 45)}%` }}></div>
                      </div>
                  </div>
                  <div className="bg-gray-900 p-2 rounded">
                      <div className="text-[10px] text-gray-500">{t('detail.flow.ofi')}</div>
                      <div className="flex items-center justify-between mt-1">
                          <div className={`text-lg font-mono font-bold ${coin.orderflow.ofi > 60 ? 'text-neon-green' : coin.orderflow.ofi < 40 ? 'text-neon-red' : 'text-gray-300'}`}>{coin.orderflow.ofi}</div>
                          <div className={`text-[10px] ${coin.orderflow.imbalance > 0 ? 'text-neon-green' : 'text-neon-red'}`}>Imb: {coin.orderflow.imbalance > 0 ? '+' : ''}{coin.orderflow.imbalance.toFixed(2)}</div>
                      </div>
                  </div>
              </div>

              {/* CVD Sparkline */}
              <div className="bg-gray-900 p-3 rounded border border-gray-800">
                 <div className="flex justify-between items-center mb-2">
                     <div className="text-[10px] text-gray-500 uppercase">{t('detail.flow.cvd')} (Last 20 ticks)</div>
                     <div className={`font-mono text-xs ${coin.orderflow.cvd >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>{formatNumber(coin.orderflow.cvd/1000, 1)}k</div>
                 </div>
                 <div className="flex items-end space-x-0.5 h-16 pt-2 border-t border-gray-800">
                     {coin.orderflow.cvdHistory.map((val, i) => {
                         const heightPct = Math.min(100, Math.abs(val) * 5 + 10); // Mock scale
                         return (
                             <div key={i} className={`flex-1 rounded-sm ${val >= 0 ? 'bg-neon-green/80' : 'bg-neon-red/80'}`} style={{ height: `${heightPct}%` }}></div>
                         )
                     })}
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

const AlertsView = ({ events, onClear, onPause, isPaused, onNavigate }: { 
    events: AlertEvent[], 
    onClear: () => void, 
    onPause: () => void, 
    isPaused: boolean, 
    onNavigate: (sym: string) => void 
}) => {
    const { t } = useI18n();
    return (
        <div className="flex flex-col h-full bg-gray-950 p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-200">{t('alerts.title')}</h2>
                <div className="flex space-x-2">
                    <button onClick={onPause} className={`px-3 py-1.5 rounded text-xs font-bold ${isPaused ? 'bg-yellow-500/20 text-yellow-500' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>{isPaused ? t('alerts.resume') : t('alerts.pause')}</button>
                    <button onClick={onClear} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs rounded font-bold">{t('alerts.clear')}</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
                {events.length === 0 && <div className="text-center text-gray-500 mt-10 italic">{t('alerts.empty_feed')}</div>}
                {events.map(event => (
                    <div key={event.id} className={`p-3 rounded border border-gray-800 bg-gray-900/50 flex items-start justify-between ${event.severity === 'high' ? 'border-l-4 border-l-neon-red' : event.severity === 'success' ? 'border-l-4 border-l-neon-green' : 'border-l-4 border-l-neon-blue'}`}>
                        <div>
                            <div className="flex items-center space-x-2 mb-1">
                                <span className="font-mono font-bold text-gray-200 cursor-pointer hover:underline" onClick={() => onNavigate(event.symbol)}>{event.symbol}</span>
                                <span className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className="text-sm text-gray-300">{t(event.titleKey)}</div>
                            <div className="text-xs text-gray-500 mt-1">{t(event.bodyKey, event.vars)}</div>
                        </div>
                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${event.side === 'LONG' ? 'bg-neon-green/10 text-neon-green' : 'bg-neon-red/10 text-neon-red'}`}>{event.side}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AlertsDrawer = ({ isOpen, onClose, events, rules, onUpdateRule, onUpdateParams, onClearEvents, onPause, isPaused }: {
    isOpen: boolean,
    onClose: () => void,
    events: AlertEvent[],
    rules: AlertRule[],
    onUpdateRule: (id: string, val: boolean) => void,
    onUpdateParams: (id: string, p: StrategyParams) => void,
    onClearEvents: () => void,
    onPause: () => void,
    isPaused: boolean
}) => {
    const { t } = useI18n();
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-50 flex flex-col">
            <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4">
                <h2 className="font-bold text-gray-200">{t('alerts.title')}</h2>
                <button onClick={onClose}><X size={20} className="text-gray-500 hover:text-white" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                 {/* Rules Config Section */}
                 <div>
                     <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">{t('alerts.rules')}</h3>
                     <div className="space-y-3">
                         {rules.map(rule => (
                             <div key={rule.id} className="bg-gray-950 border border-gray-800 rounded p-3">
                                 <div className="flex justify-between items-center mb-2">
                                     <span className="font-bold text-sm text-gray-300">{t(rule.nameKey)}</span>
                                     <button onClick={() => onUpdateRule(rule.id, !rule.enabled)} className={`w-8 h-4 rounded-full relative transition-colors ${rule.enabled ? 'bg-neon-green' : 'bg-gray-700'}`}>
                                         <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${rule.enabled ? 'left-4.5' : 'left-0.5'}`}></div>
                                     </button>
                                 </div>
                                 <p className="text-[10px] text-gray-500 mb-2">{t(rule.descKey, { rsi: rule.params.rsiOversold, macd_state: 'Bullish/Bearish', level: 'Sup/Res', exec: 'A', tf: '15m' })}</p>
                             </div>
                         ))}
                     </div>
                 </div>

                 {/* Mini Feed */}
                 <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase">{t('alerts.feed')}</h3>
                        <div className="flex space-x-2">
                             <button onClick={onPause} title={isPaused ? "Resume" : "Pause"} className="text-gray-500 hover:text-white">{isPaused ? <Play size={12}/> : <Pause size={12}/>}</button>
                             <button onClick={onClearEvents} title="Clear" className="text-gray-500 hover:text-white"><Trash2 size={12}/></button>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {events.length === 0 && <div className="text-center text-[10px] text-gray-600 italic">No recent alerts</div>}
                        {events.slice(0, 20).map(e => (
                             <div key={e.id} className="text-[10px] bg-gray-800/50 p-2 rounded border-l-2 border-gray-600">
                                 <div className="flex justify-between">
                                     <span className="font-bold text-gray-300">{e.symbol}</span>
                                     <span className="text-gray-500">{new Date(e.timestamp).toLocaleTimeString()}</span>
                                 </div>
                                 <div className="text-gray-400 truncate">{t(e.titleKey)}</div>
                             </div>
                        ))}
                    </div>
                 </div>
            </div>
        </div>
    );
}

const AnalyticsView = ({ tradeHistory, rules, settings, onUpdateSettings, onReset, lastSignals }: {
    tradeHistory: SimTrade[],
    rules: AlertRule[],
    settings: AnalyticsSettings,
    onUpdateSettings: (s: Partial<AnalyticsSettings>) => void,
    onReset: () => void,
    lastSignals: SignalLog[]
}) => {
    const { t, formatPct, formatNumber } = useI18n();
    const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof StrategyStats, direction: 'asc' | 'desc' }>({ key: 'avgRetPct', direction: 'desc' });

    // Calculate Stats
    const stats = useMemo(() => {
        const closedTrades = tradeHistory.filter(t => t.result !== 'OPEN');
        const grouped: Record<string, StrategyStats> = {};
        
        rules.forEach(r => {
            grouped[r.id] = { ruleId: r.id, triggers: 0, tradesClosed: 0, winRatePct: 0, avgRetPct: 0, avgMfePct: 0, avgMaePct: 0 };
        });

        // Approximate triggers from signals
        lastSignals.forEach(s => {
            if (grouped[s.ruleId]) grouped[s.ruleId].triggers++;
        });

        closedTrades.forEach(trade => {
            if (!grouped[trade.ruleId]) return;
            const g = grouped[trade.ruleId];
            g.tradesClosed++;
            g.avgMfePct = ((g.avgMfePct * (g.tradesClosed - 1)) + trade.mfePct) / g.tradesClosed;
            g.avgMaePct = ((g.avgMaePct * (g.tradesClosed - 1)) + trade.maePct) / g.tradesClosed;
            
            const ret = settings.viewMode === 'NET' ? trade.netRetPct : trade.grossRetPct;
            g.avgRetPct = ((g.avgRetPct * (g.tradesClosed - 1)) + ret) / g.tradesClosed;
        });

        Object.values(grouped).forEach(g => {
             const wins = closedTrades.filter(t => t.ruleId === g.ruleId && (settings.viewMode === 'NET' ? t.netRetPct > 0 : t.grossRetPct > 0)).length;
             g.winRatePct = g.tradesClosed > 0 ? (wins / g.tradesClosed) * 100 : 0;
        });

        return Object.values(grouped);
    }, [tradeHistory, lastSignals, rules, settings.viewMode]);

    // Sorting & Selection Logic
    const sortedStats = useMemo(() => {
        return [...stats].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [stats, sortConfig]);

    const activeStrategyId = selectedStrategyId || sortedStats[0]?.ruleId;
    const activeStrategyStats = stats.find(s => s.ruleId === activeStrategyId);
    const activeStrategyName = rules.find(r => r.id === activeStrategyId)?.nameKey || activeStrategyId;
    
    // Filter trades for details panel
    const detailTrades = useMemo(() => {
        return tradeHistory
            .filter(t => t.ruleId === activeStrategyId)
            .sort((a,b) => b.entryTs - a.entryTs)
            .slice(0, 15);
    }, [tradeHistory, activeStrategyId]);

    const totalTrades = tradeHistory.filter(t => t.result !== 'OPEN').length;
    const globalWinRate = totalTrades > 0 ? (tradeHistory.filter(t => t.result === 'WIN').length / totalTrades) * 100 : 0;
    const globalReturn = totalTrades > 0 ? tradeHistory.reduce((acc, t) => acc + (settings.viewMode === 'NET' ? t.netRetPct : t.grossRetPct), 0) / totalTrades : 0; // Avg per trade

    const handleSort = (key: keyof StrategyStats) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    return (
        <div className="flex flex-col h-full bg-gray-950 p-4 md:p-6 overflow-hidden">
             {/* Header */}
             <div className="flex flex-col md:flex-row justify-between md:items-end mb-6 shrink-0 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100 flex items-center"><BarChart2 className="mr-3 text-neon-blue" />{t('analytics.title')}</h1>
                    <p className="text-gray-500 text-xs mt-1">{t('analytics.subtitle')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                     <div className="flex items-center bg-gray-900 p-1 rounded border border-gray-800">
                         <button onClick={() => onUpdateSettings({ viewMode: 'GROSS' })} className={`px-3 py-1 text-[10px] rounded font-bold transition-colors ${settings.viewMode === 'GROSS' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{t('analytics.modes.GROSS')}</button>
                         <button onClick={() => onUpdateSettings({ viewMode: 'NET' })} className={`px-3 py-1 text-[10px] rounded font-bold transition-colors ${settings.viewMode === 'NET' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{t('analytics.modes.NET')}</button>
                     </div>
                     <select 
                        value={settings.timeWindow} 
                        onChange={(e) => onUpdateSettings({ timeWindow: e.target.value as any })}
                        className="bg-gray-900 border border-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 outline-none focus:border-neon-blue"
                     >
                        <option value="15m">{t('analytics.windows.15m')}</option>
                        <option value="1h">{t('analytics.windows.1h')}</option>
                        <option value="24h">{t('analytics.windows.24h')}</option>
                        <option value="all">{t('analytics.windows.all')}</option>
                     </select>
                     <select 
                        value={settings.holdSeconds} 
                        onChange={(e) => onUpdateSettings({ holdSeconds: Number(e.target.value) })}
                        className="bg-gray-900 border border-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 outline-none focus:border-neon-blue"
                     >
                        <option value="30">30s</option>
                        <option value="60">60s</option>
                        <option value={120}>120s</option>
                     </select>
                     <button onClick={onReset} className="p-1.5 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded hover:border-gray-600 transition-colors" title={t('analytics.settings.reset')}><RefreshCcw size={14}/></button>
                </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 shrink-0">
                 <div className="bg-gray-900 border border-gray-800 p-3 rounded flex flex-col justify-between h-20">
                     <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t('analytics.best_perf')}</div>
                     <div className="text-sm font-mono font-bold text-neon-blue truncate flex items-center">
                        <Trophy size={14} className="mr-2 text-yellow-500"/>
                        {sortedStats[0]?.tradesClosed > 0 ? t(rules.find(r=>r.id===sortedStats[0].ruleId)?.nameKey || sortedStats[0].ruleId) : '---'}
                     </div>
                 </div>
                 <div className="bg-gray-900 border border-gray-800 p-3 rounded flex flex-col justify-between h-20">
                     <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t('analytics.total_signals')}</div>
                     <div className="text-lg font-mono text-gray-200">{lastSignals.length} <span className="text-[10px] text-gray-500">/ {totalTrades} Trades</span></div>
                 </div>
                 <div className="bg-gray-900 border border-gray-800 p-3 rounded flex flex-col justify-between h-20">
                     <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t('analytics.avg_win_rate')}</div>
                     <div className={`text-lg font-mono ${globalWinRate >= 50 ? 'text-neon-green' : 'text-neon-red'}`}>{formatNumber(globalWinRate, 1)}%</div>
                 </div>
                 <div className="bg-gray-900 border border-gray-800 p-3 rounded flex flex-col justify-between h-20">
                     <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Global Avg Return ({settings.viewMode})</div>
                     <div className={`text-lg font-mono ${globalReturn > 0 ? 'text-neon-green' : globalReturn < 0 ? 'text-neon-red' : 'text-gray-400'}`}>{globalReturn > 0 ? '+' : ''}{formatPct(globalReturn)}</div>
                 </div>
            </div>

            {/* Main Workspace: Split View */}
            <div className="flex flex-1 gap-4 min-h-0 overflow-hidden flex-col lg:flex-row">
                
                {/* LEFT: Strategy Table */}
                <div className="flex-[3] bg-gray-900 border border-gray-800 rounded flex flex-col overflow-hidden">
                    <div className="overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-950 text-[10px] text-gray-500 uppercase font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 border-b border-gray-800">{t('analytics.cols.strategy')}</th>
                                    <th className="p-3 text-right border-b border-gray-800 cursor-pointer hover:text-gray-300" onClick={() => handleSort('tradesClosed')}>
                                        <div className="flex items-center justify-end">Trades {sortConfig.key === 'tradesClosed' && (sortConfig.direction === 'asc' ? <ChevronUp size={10}/> : <ChevronDown size={10}/>)}</div>
                                    </th>
                                    <th className="p-3 text-right border-b border-gray-800 cursor-pointer hover:text-gray-300" onClick={() => handleSort('winRatePct')}>
                                        <div className="flex items-center justify-end">Win % {sortConfig.key === 'winRatePct' && (sortConfig.direction === 'asc' ? <ChevronUp size={10}/> : <ChevronDown size={10}/>)}</div>
                                    </th>
                                    <th className="p-3 text-right border-b border-gray-800 cursor-pointer hover:text-gray-300" onClick={() => handleSort('avgRetPct')}>
                                        <div className="flex items-center justify-end">Avg Ret {sortConfig.key === 'avgRetPct' && (sortConfig.direction === 'asc' ? <ChevronUp size={10}/> : <ChevronDown size={10}/>)}</div>
                                    </th>
                                    <th className="p-3 text-right border-b border-gray-800 hidden md:table-cell text-gray-600">MFE/MAE</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50 text-xs">
                                {sortedStats.map(s => {
                                    const isSelected = s.ruleId === activeStrategyId;
                                    const ruleName = t(rules.find(r=>r.id===s.ruleId)?.nameKey || s.ruleId);
                                    
                                    return (
                                        <tr 
                                            key={s.ruleId} 
                                            onClick={() => setSelectedStrategyId(s.ruleId)}
                                            className={`cursor-pointer transition-colors ${isSelected ? 'bg-gray-800/80' : 'hover:bg-gray-800/40'}`}
                                        >
                                            <td className="p-3 font-medium text-gray-300 border-l-2 border-transparent" style={{ borderLeftColor: isSelected ? '#2979ff' : 'transparent' }}>
                                                {ruleName}
                                            </td>
                                            <td className="p-3 text-right font-mono text-gray-400">{s.tradesClosed}</td>
                                            <td className="p-3 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={`font-mono font-bold mb-1 ${s.winRatePct >= 50 ? 'text-neon-green' : 'text-neon-red'}`}>{formatNumber(s.winRatePct, 0)}%</span>
                                                    <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gray-600" style={{ width: `${s.winRatePct}%`, backgroundColor: s.winRatePct >= 50 ? '#00ff9d' : '#ff4d4d' }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-right font-mono">
                                                <span className={`font-bold ${s.avgRetPct > 0 ? 'text-neon-green' : s.avgRetPct < 0 ? 'text-neon-red' : 'text-gray-500'}`}>
                                                    {s.avgRetPct > 0 ? '+' : ''}{formatPct(s.avgRetPct)}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right font-mono text-[10px] hidden md:table-cell">
                                                <span className="text-neon-green/70">+{formatPct(s.avgMfePct)}</span>
                                                <span className="text-gray-600 mx-1">/</span>
                                                <span className="text-neon-red/70">-{formatPct(s.avgMaePct)}</span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RIGHT: Strategy Details Panel */}
                <div className="flex-[2] bg-gray-900 border border-gray-800 rounded flex flex-col overflow-hidden">
                    {/* Panel Header */}
                    <div className="p-4 border-b border-gray-800 bg-gray-950/50">
                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t('analytics.details_title')}</div>
                        <h2 className="text-lg font-bold text-white flex items-center">
                            {t(activeStrategyName)}
                            {activeStrategyStats && (
                                <span className={`ml-2 text-xs px-2 py-0.5 rounded font-mono ${activeStrategyStats.avgRetPct >= 0 ? 'bg-neon-green/10 text-neon-green' : 'bg-neon-red/10 text-neon-red'}`}>
                                    {activeStrategyStats.avgRetPct > 0 ? '+' : ''}{formatPct(activeStrategyStats.avgRetPct)}
                                </span>
                            )}
                        </h2>
                    </div>

                    {/* Stats Grid */}
                    {activeStrategyStats ? (
                        <div className="p-4 grid grid-cols-3 gap-2 border-b border-gray-800">
                            <div className="bg-gray-800/30 p-2 rounded text-center">
                                <div className="text-[9px] text-gray-500 uppercase">Trades</div>
                                <div className="text-sm font-mono text-gray-300">{activeStrategyStats.tradesClosed}</div>
                            </div>
                            <div className="bg-gray-800/30 p-2 rounded text-center">
                                <div className="text-[9px] text-gray-500 uppercase">Win Rate</div>
                                <div className={`text-sm font-mono ${activeStrategyStats.winRatePct >= 50 ? 'text-neon-green' : 'text-neon-red'}`}>{formatNumber(activeStrategyStats.winRatePct, 0)}%</div>
                            </div>
                            <div className="bg-gray-800/30 p-2 rounded text-center">
                                <div className="text-[9px] text-gray-500 uppercase">Expectancy</div>
                                <div className={`text-sm font-mono ${activeStrategyStats.avgRetPct > 0 ? 'text-neon-green' : 'text-gray-400'}`}>{formatPct(activeStrategyStats.avgRetPct)}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 text-center text-gray-600 text-xs italic">Select a strategy to see details</div>
                    )}

                    {/* Trade List */}
                    <div className="flex-1 overflow-auto p-2 bg-gray-900 custom-scrollbar">
                        <div className="text-[10px] text-gray-500 uppercase font-bold px-2 py-2 mb-1 sticky top-0 bg-gray-900 z-10">{t('analytics.recent_trades_context')}</div>
                        {detailTrades.length === 0 ? (
                            <div className="text-center py-8 text-gray-600 text-xs">No trades recorded yet.</div>
                        ) : (
                            <div className="space-y-1.5">
                                {detailTrades.map(t => (
                                    <div key={t.id} className="flex justify-between items-center p-2.5 bg-gray-800/40 rounded border border-gray-800/50 hover:bg-gray-800 transition-colors">
                                        <div className="flex flex-col">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs font-bold text-gray-200 font-mono">{t.symbol}</span>
                                                <span className={`text-[9px] px-1 rounded font-bold ${t.side==='LONG'?'bg-neon-green/20 text-neon-green':'bg-neon-red/20 text-neon-red'}`}>{t.side}</span>
                                            </div>
                                            <span className="text-[9px] text-gray-500 mt-0.5">{new Date(t.entryTs).toLocaleTimeString()} • {t.exitReason || 'RUNNING'}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`text-xs font-mono font-bold ${t.result === 'WIN' ? 'text-neon-green' : t.result === 'LOSS' ? 'text-neon-red' : 'text-gray-400'}`}>
                                                {t.result === 'OPEN' ? 'OPEN' : (settings.viewMode === 'NET' ? formatPct(t.netRetPct) : formatPct(t.grossRetPct))}
                                            </span>
                                            <span className="text-[9px] text-gray-600 font-mono">
                                                {t.result !== 'OPEN' ? `${t.holdSeconds}s` : '...'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// --- Section: Main App ---
// ==========================================

const STRATEGY_DEFS: AlertRule[] = [
  { id: 'rsi_reversal', nameKey: 'alerts.rules_config.rsi_reversal.name', descKey: 'alerts.rules_config.rsi_reversal.desc', enabled: true, logic: 'AND', severity: 'success', cooldownMinutes: 1, rules: [], params: { rsiOverbought: 70, rsiOversold: 30, vwapHoldTicks: 0, levelProxPct: 0 } },
  { id: 'macd_momentum', nameKey: 'alerts.rules_config.macd_momentum.name', descKey: 'alerts.rules_config.macd_momentum.desc', enabled: true, logic: 'AND', severity: 'info', cooldownMinutes: 5, rules: [], params: { rsiOverbought: 0, rsiOversold: 0, vwapHoldTicks: 0, levelProxPct: 0 } },
  { id: 'vwap_cross', nameKey: 'alerts.rules_config.vwap_cross.name', descKey: 'alerts.rules_config.vwap_cross.desc', enabled: true, logic: 'AND', severity: 'success', cooldownMinutes: 5, rules: [], params: { rsiOverbought: 0, rsiOversold: 0, vwapHoldTicks: 2, levelProxPct: 0 } },
  { id: 'level_bounce', nameKey: 'alerts.rules_config.level_bounce.name', descKey: 'alerts.rules_config.level_bounce.desc', enabled: true, logic: 'OR', severity: 'warning', cooldownMinutes: 5, rules: [], params: { rsiOverbought: 0, rsiOversold: 0, vwapHoldTicks: 0, levelProxPct: 0.5 } },
  { id: 'oi_surge', nameKey: 'alerts.rules_config.oi_surge.name', descKey: 'alerts.rules_config.oi_surge.desc', enabled: false, logic: 'AND', severity: 'high', cooldownMinutes: 5, rules: [], params: { rsiOverbought: 0, rsiOversold: 0, vwapHoldTicks: 0, levelProxPct: 0 } },
  { id: 'confluence', nameKey: 'alerts.rules_config.confluence.name', descKey: 'alerts.rules_config.confluence.desc', enabled: false, logic: 'AND', severity: 'success', cooldownMinutes: 10, rules: [], params: { rsiOverbought: 0, rsiOversold: 0, vwapHoldTicks: 0, levelProxPct: 0 } }
];

const FluxTermApp = () => {
  const { t } = useI18n();
  const [data, setData] = useState<CoinData[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<CoinData | null>(null);
  const [sortBy, setSortBy] = useState<string>('score');
  const [sortDesc, setSortDesc] = useState(true);
  
  // App State
  const [primaryTimeframe, setPrimaryTimeframe] = useState<Timeframe>('15m');
  const [contextTimeframe, setContextTimeframe] = useState<Timeframe>('1h');
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [currentView, setCurrentView] = useState<'scanner' | 'analytics' | 'alerts'>('scanner');
  const [scannerViewMode, setScannerViewMode] = useState<'all' | 'watchlist' | 'hotlist'>('all');
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [dataMode, setDataMode] = useState<DataMode>('MOCK');
  const [isWsConnected, setIsWsConnected] = useState(false);
  
  // Alert System State
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>(STRATEGY_DEFS);
  const [isAlertsPaused, setIsAlertsPaused] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Analytics Engine State
  const [analyticsSettings, setAnalyticsSettings] = useState<AnalyticsSettings>({ holdSeconds: 30, timeWindow: 'all', viewMode: 'NET' });
  const [tradeHistory, setTradeHistory] = useState<SimTrade[]>([]);
  const [signalsFeed, setSignalsFeed] = useState<SignalLog[]>([]);
  
  // Refs
  const marketState = useRef<Record<string, { candles: Record<Timeframe, Candle[]> }>>({});
  const alertState = useRef<Record<string, Record<string, { lastTrigger: number }>>>({}); 
  const openTradesRef = useRef<SimTrade[]>([]); 
  const signalsRef = useRef<SignalLog[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const INITIAL_COINS = [
    'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'MATIC', 'DOT',
    'TRX', 'LTC', 'SHIB', 'UNI', 'ATOM', 'XLM', 'ETC', 'FIL', 'HBAR', 'APT',
    'ARB', 'OP', 'INJ', 'RNDR', 'PEPE', 'SUI', 'SEI', 'TIA', 'ORDI', 'WIF'
  ];

  // Initialize Data
  useEffect(() => {
    // ... LocalStorage restoration logic (same as before)
    const savedRules = localStorage.getItem('fluxterm_alertRules');
    if (savedRules) try { setAlertRules(JSON.parse(savedRules)); } catch(e) {}

    const savedPresets = localStorage.getItem('fluxterm_presets');
    if (savedPresets) try { setPresets(JSON.parse(savedPresets)); } catch(e) {}

    const savedWatchlist = localStorage.getItem('fluxterm_watchlist');
    if (savedWatchlist) try { setWatchlist(new Set(JSON.parse(savedWatchlist))); } catch(e) {}

    const savedPrimary = localStorage.getItem('fluxterm_primaryTF');
    const savedContext = localStorage.getItem('fluxterm_contextTF');
    if (savedPrimary && TIMEFRAMES.includes(savedPrimary as Timeframe)) setPrimaryTimeframe(savedPrimary as Timeframe);
    if (savedContext && TIMEFRAMES.includes(savedContext as Timeframe)) setContextTimeframe(savedContext as Timeframe);

    const initData: CoinData[] = INITIAL_COINS.map(sym => {
      const symbol = sym + 'USDT';
      marketState.current[symbol] = { candles: {} as any };
      const price = Math.random() * 100 + 10;
      TIMEFRAMES.forEach(tf => { marketState.current[symbol].candles[tf] = generateCandles(price, 250, tf); });
      const technical: Record<Timeframe, IndicatorState> = {} as any;
      const atr: Record<Timeframe, number> = {} as any;
      TIMEFRAMES.forEach(tf => {
          const c = marketState.current[symbol].candles[tf];
          const closes = c.map(x => x.close);
          const rsiArr = calculateRSI(closes, 14);
          const ema20Arr = calculateEMA(closes, 20);
          const ema50Arr = calculateEMA(closes, 50);
          const { macdLine, signalLine, histogram } = calculateMACD(closes);
          const idx = closes.length - 1;
          const rsiVal = rsiArr[idx];
          const macdHist = histogram[idx];
          const ema20 = ema20Arr[idx];
          const ema50 = ema50Arr[idx];
          technical[tf] = {
              rsi: { value: rsiVal, state: rsiVal < 30 ? 'oversold' : rsiVal > 70 ? 'overbought' : 'neutral', slope: rsiArr[idx] > rsiArr[idx-1] ? 'up' : 'down' },
              macd: { histogram: macdHist, signal: signalLine[idx], line: macdLine[idx], cross: (histogram[idx] > 0 && histogram[idx-1] <= 0) ? 'bullish' : (histogram[idx] < 0 && histogram[idx-1] >= 0) ? 'bearish' : null, trend: histogram[idx] > histogram[idx-1] ? 'bullish' : 'bearish' },
              trend: { ema20: ema20Arr[idx], ema50: ema50Arr[idx], state: ema20Arr[idx] > ema50Arr[idx] ? 'up' : ema20Arr[idx] < ema50Arr[idx] ? 'down' : 'chop' }
          };
          // Calc ATR
          const high = c.map(x=>x.high); const low = c.map(x=>x.low);
          const atrArr = calculateATR(high, low, closes, 14);
          atr[tf] = atrArr[atrArr.length-1];
      });
      const vwapPrice = price * 1.01;
      return {
          symbol, price, priceChange1m: (Math.random() - 0.5), priceChange5m: (Math.random() - 0.5) * 2, volume1m: Math.random() * 500000, volumeDelta: Math.random() * 3, oi: Math.random() * 10000000, oiChange: (Math.random() - 0.5) * 5, funding: 0.01, score: Math.floor(Math.random() * 100),
          technical,
          atr,
          confidence: Math.random() * 100,
          vwap: { price: vwapPrice, state: price > vwapPrice ? 'above' : 'below', bandUpper: vwapPrice * 1.02, bandLower: vwapPrice * 0.98, reclaimed: false },
          levels: { 
              dayHigh: price * 1.05, dayLow: price * 0.95, dayOpen: price, prevClose: price * 0.99,
              weekHigh: price * 1.15, weekLow: price * 0.85, weekOpen: price * 0.98,
              proximity: Math.random() > 0.9 ? 'near_dh' : null 
          },
          execution: { spreadBps: Math.random() * 3, depthUsd: Math.random() * 100000, slippageEst: 0.1, score: Math.random() > 0.7 ? 'A' : 'B' },
          orderflow: { 
              takerBuySellRatio: 0.9 + Math.random() * 0.2, cvd: 0, cvdHistory: Array(20).fill(0),
              imbalance: 0, ofi: 50, whalePrints: 0 
          }, 
          tags: [],
          lastUpdateTs: Date.now()
      }
    });
    setData(initData);
  }, []);

  // REAL DATA WEBSOCKET MANAGER
  useEffect(() => {
      if (dataMode !== 'REAL') {
          if (wsRef.current) { wsRef.current.close(); wsRef.current = null; setIsWsConnected(false); }
          return;
      }

      const connect = () => {
          // Combined streams: ticker for all, bookTicker for spread
          const streams = [
              '!markPrice@arr@1s',
              '!ticker@arr',
              '!bookTicker'
          ];
          
          // Add selected coin specific streams
          if (selectedCoin) {
              const s = selectedCoin.symbol.toLowerCase();
              streams.push(`${s}@markPrice@1s`);
              streams.push(`${s}@kline_${primaryTimeframe}`);
              streams.push(`${s}@kline_${contextTimeframe}`);
              streams.push(`${s}@aggTrade`);
          }

          const ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${streams.join('/')}`);
          
          ws.onopen = () => { setIsWsConnected(true); };
          ws.onclose = () => { setIsWsConnected(false); setTimeout(connect, 3000); };
          ws.onerror = () => { ws.close(); };

          ws.onmessage = (event) => {
              const msg = JSON.parse(event.data);
              const payload = msg.data;
              const stream = msg.stream;

              if (stream === '!markPrice@arr@1s') {
                  // Payload: Array of objects { s: symbol, p: markPrice, r: fundingRate, ... }
                  setData(prevData => {
                      const updateMap = new Map(payload.map((t: any) => [t.s, t]));
                      return prevData.map(coin => {
                          const tick = updateMap.get(coin.symbol) as any;
                          if (!tick) return coin;
                          return {
                              ...coin,
                              price: parseFloat(tick.p),
                              funding: parseFloat(tick.r),
                              lastUpdateTs: Date.now()
                          };
                      });
                  });
              } else if (stream === '!ticker@arr') {
                  // Payload: Array of objects { s: symbol, c: close, P: percentChange, v: volume, ... }
                  // Only update stats, rely on markPrice for main price
                  setData(prevData => {
                      const updateMap = new Map(payload.map((t: any) => [t.s, t]));
                      return prevData.map(coin => {
                          const tick = updateMap.get(coin.symbol) as any;
                          if (!tick) return coin;
                          return {
                              ...coin,
                              priceChange1m: parseFloat(tick.P), // Approx as 24h
                              volume1m: parseFloat(tick.v),
                              volumeDelta: 1 + (Math.random() * 0.1) // Mock delta
                          };
                      });
                  });
              } else if (stream === '!bookTicker') {
                  // Payload can be object or array in combined streams sometimes, handle array
                  const updates = Array.isArray(payload) ? payload : [payload];
                  const updateMap = new Map(updates.map((u: any) => [u.s, u]));
                  
                  setData(prev => prev.map(c => {
                      const update = updateMap.get(c.symbol);
                      if (!update) return c;
                      const bestBid = parseFloat(update.b);
                      const bestAsk = parseFloat(update.a);
                      const spread = ((bestAsk - bestBid) / bestAsk) * 10000;
                      return { ...c, execution: { ...c.execution, spreadBps: spread }};
                  }));
              } else if (stream.includes('@kline_')) {
                  // Candle update
                  const k = payload.k; // { t: time, o, h, l, c, v, x: isClosed }
                  const symbol = payload.s;
                  const tf = stream.split('_')[1] as Timeframe;
                  
                  if (marketState.current[symbol] && marketState.current[symbol].candles[tf]) {
                      const candles = marketState.current[symbol].candles[tf];
                      const lastCandle = candles[candles.length - 1];
                      const newCandle: Candle = {
                          time: k.t,
                          open: parseFloat(k.o),
                          high: parseFloat(k.h),
                          low: parseFloat(k.l),
                          close: parseFloat(k.c),
                          volume: parseFloat(k.v)
                      };

                      // Update history
                      if (lastCandle.time === k.t) {
                          candles[candles.length - 1] = newCandle;
                      } else {
                          candles.push(newCandle);
                          if (candles.length > 300) candles.shift();
                      }

                      // Re-calc Indicators if candle closed or every few updates
                      // For performance, we only full re-calc selected coin on close or heavy throttle
                      // Here we do simple recalc for UI
                      const closes = candles.map(x => x.close);
                      const rsiArr = calculateRSI(closes);
                      const { histogram, signalLine, macdLine } = calculateMACD(closes);
                      const ema20Arr = calculateEMA(closes, 20);
                      const ema50Arr = calculateEMA(closes, 50);
                      
                      const idx = closes.length - 1;
                      const newTech: IndicatorState = {
                          rsi: { value: rsiArr[idx], state: rsiArr[idx] < 30 ? 'oversold' : rsiArr[idx] > 70 ? 'overbought' : 'neutral', slope: rsiArr[idx] > rsiArr[idx-1] ? 'up' : 'down' },
                          macd: { histogram: histogram[idx], signal: signalLine[idx], line: macdLine[idx], cross: (histogram[idx] > 0 && histogram[idx-1] <= 0) ? 'bullish' : (histogram[idx] < 0 && histogram[idx-1] >= 0) ? 'bearish' : null, trend: histogram[idx] > histogram[idx-1] ? 'bullish' : 'bearish' },
                          trend: { ema20: ema20Arr[idx], ema50: ema50Arr[idx], state: ema20Arr[idx] > ema50Arr[idx] ? 'up' : ema20Arr[idx] < ema50Arr[idx] ? 'down' : 'chop' }
                      };

                      setData(prev => prev.map(c => {
                          if (c.symbol !== symbol) return c;
                          const tech = { ...c.technical, [tf]: newTech };
                          // Recalc confidence
                          let conf = 50;
                          if (tech[primaryTimeframe]?.trend.state === 'up') conf += 15;
                          if (tech[contextTimeframe]?.trend.state === 'up') conf += 10;
                          if (tech[primaryTimeframe]?.macd.histogram > 0) conf += 10;
                          return { ...c, technical: tech, confidence: Math.min(100, Math.max(0, conf)) };
                      }));
                  }
              } else if (stream.includes('@aggTrade')) {
                  // Order flow { m: isBuyerMaker (true=sell), q: quantity }
                  const isSell = payload.m;
                  const qty = parseFloat(payload.q);
                  setData(prev => prev.map(c => {
                      if (c.symbol !== payload.s) return c;
                      const cvdDelta = isSell ? -qty : qty;
                      const newCvdHistory = [...c.orderflow.cvdHistory];
                      newCvdHistory[newCvdHistory.length-1] += cvdDelta;
                      
                      // Throttle massive array updates - just update last point
                      return { 
                          ...c, 
                          orderflow: { 
                              ...c.orderflow, 
                              cvd: c.orderflow.cvd + cvdDelta,
                              cvdHistory: newCvdHistory 
                          }
                      };
                  }));
              } else if (stream.includes('@markPrice')) {
                   // Single symbol mark price update
                  const funding = parseFloat(payload.r); // funding rate
                  const mark = parseFloat(payload.p);
                  setData(prev => prev.map(c => c.symbol === payload.s ? { ...c, funding: funding, price: mark, lastUpdateTs: Date.now() } : c));
              }
          };
          
          wsRef.current = ws;
      };

      connect();
      return () => { if(wsRef.current) wsRef.current.close(); };
  }, [dataMode, selectedCoin, primaryTimeframe, contextTimeframe]);

  useEffect(() => { localStorage.setItem('fluxterm_primaryTF', primaryTimeframe); }, [primaryTimeframe]);
  useEffect(() => { localStorage.setItem('fluxterm_contextTF', contextTimeframe); }, [contextTimeframe]);
  useEffect(() => { localStorage.setItem('fluxterm_alertRules', JSON.stringify(alertRules)); }, [alertRules]);
  useEffect(() => { localStorage.setItem('fluxterm_presets', JSON.stringify(presets)); }, [presets]);
  useEffect(() => { localStorage.setItem('fluxterm_watchlist', JSON.stringify(Array.from(watchlist))); }, [watchlist]);

  // Main Loop: Tick & Alert Engine & Analytics
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newRawEvents: { coin: CoinData, rule: AlertRule, side: 'LONG'|'SHORT' }[] = [];
      const tradesToClose: SimTrade[] = [];

      // HELPER: Fire Signal Event
      const fireSignal = (ruleId: string, coin: CoinData, reason: string, side: 'LONG'|'SHORT') => {
          // Cooldown Check
          const eventKey = `${coin.symbol}:${ruleId}`;
          if (!alertState.current[coin.symbol]) alertState.current[coin.symbol] = {};
          if (!alertState.current[coin.symbol][ruleId]) alertState.current[coin.symbol][ruleId] = { lastTrigger: 0 };
          const lastTrigger = alertState.current[coin.symbol][ruleId].lastTrigger;
          const ruleDef = alertRules.find(r => r.id === ruleId);
          const cooldownMs = (ruleDef?.cooldownMinutes || 1) * 60000;

          if (now - lastTrigger < cooldownMs) return;

          alertState.current[coin.symbol][ruleId].lastTrigger = now;

          const sig: SignalLog = {
              id: Math.random().toString(36).substr(2),
              timestamp: now,
              symbol: coin.symbol.replace('USDT', ''),
              ruleId,
              side,
              price: coin.price,
              reasons: [reason]
          };
          signalsRef.current = [sig, ...signalsRef.current].slice(0, 200);

          if (ruleDef && ruleDef.enabled) {
              const existingOpen = openTradesRef.current.find(t => t.symbol === coin.symbol && t.ruleId === ruleId);
              if (!existingOpen) {
                  const feePct = getExecutionCost(coin.execution.score);
                  const newTrade: SimTrade = {
                      id: Math.random().toString(36).substr(2),
                      symbol: coin.symbol,
                      ruleId: ruleId,
                      side: side,
                      entryTs: now,
                      entryPrice: coin.price,
                      exitTs: null,
                      exitPrice: null,
                      exitReason: null,
                      holdSeconds: analyticsSettings.holdSeconds,
                      result: 'OPEN',
                      grossRetPct: 0,
                      netRetPct: -feePct, 
                      feePct: feePct,
                      mfePct: 0,
                      maePct: 0
                  };
                  openTradesRef.current.push(newTrade);
                  setTradeHistory(prev => [newTrade, ...prev].slice(0, 500));
                  newRawEvents.push({ coin, rule: ruleDef, side });
              }
          }
      };

      if (dataMode === 'MOCK') {
          // --- MOCK SIMULATION LOGIC ---
          setData(prevData => prevData.map(coin => {
            // --- 1. Simulation Logic ---
            const volatility = coin.price * 0.0008; 
            let newPrice = Math.max(0.01, coin.price + (Math.random() - 0.5) * volatility);
            
            // Mock setups
            if (Math.random() < 0.005) newPrice = newPrice * 0.99; // Drop
            if (Math.random() < 0.005) newPrice = newPrice * 1.01; // Pump

            const symbolState = marketState.current[coin.symbol];
            let updatedCoin = { ...coin, price: newPrice, lastUpdateTs: now };
            let prevPrice = coin.price;

            if (symbolState) {
                const updatedTechnical = { ...coin.technical };
                const updatedAtr = { ...coin.atr };
                [primaryTimeframe, contextTimeframe].forEach(tf => {
                const candles = symbolState.candles[tf];
                const lastCandle = candles[candles.length - 1];
                lastCandle.close = newPrice; 
                lastCandle.high = Math.max(lastCandle.high, newPrice);
                lastCandle.low = Math.min(lastCandle.low, newPrice);
                const closes = candles.map(c => c.close);
                
                let rsiVal = calculateRSI(closes, 14)[closes.length - 1];
                if (Math.random() < 0.01) rsiVal = 25 + Math.random() * 10; 
                if (Math.random() < 0.01) rsiVal = 65 + Math.random() * 10; 

                // Dynamic Trend & MACD Calculation
                const ema20Arr = calculateEMA(closes, 20);
                const ema50Arr = calculateEMA(closes, 50);
                const ema20 = ema20Arr[ema20Arr.length - 1];
                const ema50 = ema50Arr[ema50Arr.length - 1];
                const trendState = ema20 > ema50 ? 'up' : ema20 < ema50 ? 'down' : 'chop';

                const { histogram, signalLine, macdLine } = calculateMACD(closes);
                const idx = closes.length - 1;
                const macdHist = histogram[idx];
                const macdPrevHist = histogram[idx-1];
                
                updatedTechnical[tf] = {
                    rsi: { 
                        value: rsiVal, 
                        state: rsiVal < 30 ? 'oversold' : rsiVal > 70 ? 'overbought' : 'neutral', 
                        slope: rsiVal > coin.technical[tf].rsi.value ? 'up' : 'down' 
                    },
                    macd: {
                        histogram: macdHist,
                        signal: signalLine[idx],
                        line: macdLine[idx],
                        cross: (macdHist > 0 && macdPrevHist <= 0) ? 'bullish' : (macdHist < 0 && macdPrevHist >= 0) ? 'bearish' : null,
                        trend: macdHist > macdPrevHist ? 'bullish' : 'bearish'
                    },
                    trend: { ema20, ema50, state: trendState }
                };

                // Update ATR
                const h = candles.map(x=>x.high); const l = candles.map(x=>x.low);
                const atrArr = calculateATR(h, l, closes, 14);
                updatedAtr[tf] = atrArr[atrArr.length-1];
                });
                updatedCoin.technical = updatedTechnical;
                updatedCoin.atr = updatedAtr;
            }

            // VWAP Logic Update
            let newVwapState = coin.vwap.state;
            if (coin.vwap.state === 'below' && newPrice > coin.vwap.price) newVwapState = 'above';
            else if (newPrice < coin.vwap.price) newVwapState = 'below';
            updatedCoin.vwap.state = newVwapState;
            
            // Orderflow Mock Updates
            updatedCoin.orderflow.cvd += (Math.random() - 0.5) * 1000;
            updatedCoin.orderflow.cvdHistory = [...coin.orderflow.cvdHistory.slice(1), (Math.random() - 0.5) * 10];
            updatedCoin.orderflow.imbalance = Math.max(-1, Math.min(1, coin.orderflow.imbalance + (Math.random()-0.5)*0.2));
            updatedCoin.orderflow.ofi = Math.max(0, Math.min(100, coin.orderflow.ofi + (Math.random()-0.5)*5));
            
            // Confidence Score Calculation
            let conf = 50;
            if (updatedCoin.technical[primaryTimeframe].trend.state === 'up') conf += 15;
            if (updatedCoin.technical[contextTimeframe].trend.state === 'up') conf += 10;
            if (updatedCoin.technical[primaryTimeframe].macd.histogram > 0) conf += 10;
            if (updatedCoin.vwap.state === 'above') conf += 15;
            updatedCoin.confidence = Math.min(100, Math.max(0, conf));

            return updatedCoin;
          }));
      }

      // --- COMMON ANALYTICS & ALERT LOGIC (Runs for both Mock and Real) ---
      // For REAL mode, the `data` state is updated asynchronously by the WS handler.
      // We still need to check alerts and manage active trades here.
      
      data.forEach(coin => { // Use current state
          // 2. Analytics Tracking
          const relevantTrades = openTradesRef.current.filter(t => t.symbol === coin.symbol);
          relevantTrades.forEach(trade => {
              let currentRet = 0;
              if (trade.side === 'LONG') currentRet = (coin.price - trade.entryPrice) / trade.entryPrice;
              else currentRet = (trade.entryPrice - coin.price) / trade.entryPrice;

              trade.mfePct = Math.max(trade.mfePct, currentRet);
              trade.maePct = Math.min(trade.maePct, currentRet);

              // Invalidation
              let isInvalidated = false;
              if (trade.ruleId === 'vwap_cross') {
                  if (trade.side === 'LONG' && coin.price < coin.vwap.price * 0.998) isInvalidated = true; // Failed reclaim
                  if (trade.side === 'SHORT' && coin.price > coin.vwap.price * 1.002) isInvalidated = true;
              }

              // Check Exit Condition
              if (isInvalidated || now >= trade.entryTs + (trade.holdSeconds * 1000)) {
                  trade.exitTs = now;
                  trade.exitPrice = coin.price;
                  trade.grossRetPct = currentRet;
                  trade.netRetPct = currentRet - trade.feePct;
                  trade.result = trade.netRetPct > 0 ? 'WIN' : trade.netRetPct < 0 ? 'LOSS' : 'FLAT';
                  trade.exitReason = isInvalidated ? 'INVALIDATION' : 'TIME';
                  tradesToClose.push(trade);
              }
          });

          // 3. DYNAMIC TRIGGER LOGIC
          if (!isAlertsPaused) {
              const tech = coin.technical[primaryTimeframe];
              
              // 1. RSI Reversal 
              const rsiRule = alertRules.find(r => r.id === 'rsi_reversal');
              if (rsiRule && rsiRule.enabled) {
                  // Check if slope changed recently to avoid noise
                  if (tech.rsi.value < rsiRule.params.rsiOversold && tech.rsi.slope === 'up') {
                      fireSignal('rsi_reversal', coin, `RSI ${tech.rsi.value.toFixed(0)} < ${rsiRule.params.rsiOversold}`, 'LONG');
                  }
                  if (tech.rsi.value > rsiRule.params.rsiOverbought && tech.rsi.slope === 'down') {
                      fireSignal('rsi_reversal', coin, `RSI ${tech.rsi.value.toFixed(0)} > ${rsiRule.params.rsiOverbought}`, 'SHORT');
                  }
              }

              // 2. MACD Momentum
              if (tech.macd.cross === 'bullish') fireSignal('macd_momentum', coin, 'Bullish MACD Cross', 'LONG');
              if (tech.macd.cross === 'bearish') fireSignal('macd_momentum', coin, 'Bearish MACD Cross', 'SHORT');

              // 3. VWAP Cross - Need prev price for crossover detection.
              // In real mode, we might miss the exact crossover tick due to interval.
              // We check state vs price.
              if (coin.price > coin.vwap.price && coin.vwap.state === 'below') fireSignal('vwap_cross', coin, 'Price crossed above VWAP', 'LONG');
              if (coin.price < coin.vwap.price && coin.vwap.state === 'above') fireSignal('vwap_cross', coin, 'Price crossed below VWAP', 'SHORT');

              // 4. Level Bounce
              const distToHigh = Math.abs(coin.price - coin.levels.dayHigh) / coin.levels.dayHigh;
              const distToLow = Math.abs(coin.price - coin.levels.dayLow) / coin.levels.dayLow;
              const levelParams = alertRules.find(r => r.id === 'level_bounce')?.params;
              const prox = levelParams?.levelProxPct || 0.5;

              if (distToHigh < (prox/100)) fireSignal('level_bounce', coin, 'Resistance Reaction', 'SHORT');
              if (distToLow < (prox/100)) fireSignal('level_bounce', coin, 'Support Reaction', 'LONG');
          }
      });

      // --- 4. Process Closed Trades ---
      if (tradesToClose.length > 0) {
          openTradesRef.current = openTradesRef.current.filter(t => !tradesToClose.includes(t));
          setTradeHistory(prev => prev.map(t => {
              const closed = tradesToClose.find(c => c.id === t.id);
              return closed ? closed : t;
          }));
      }

      if (signalsRef.current.length > 0 && Math.random() < 0.2) {
          setSignalsFeed([...signalsRef.current]);
      }

      // --- 5. Event Merging & Dispatch ---
      if (newRawEvents.length > 0) {
         // Merge logic: Check if we have a recent unread alert for this symbol
         setAlertEvents(prev => {
             const updated = [...prev];
             newRawEvents.forEach(evt => {
                 const recentIdx = updated.findIndex(e => e.symbol === evt.coin.symbol && (now - e.timestamp) < 60000 && !e.mergedReasons?.includes(evt.rule.nameKey));
                 if (recentIdx > -1) {
                     // Merge into existing
                     if (!updated[recentIdx].mergedReasons) updated[recentIdx].mergedReasons = [updated[recentIdx].titleKey];
                     updated[recentIdx].mergedReasons!.push(evt.rule.nameKey);
                     updated[recentIdx].timestamp = now; // bump timestamp
                 } else {
                     // Create new
                     const vars = resolveAlertVariables(evt.coin, evt.rule);
                     updated.unshift({
                         id: Math.random().toString(36).substr(2),
                         timestamp: now,
                         symbol: evt.coin.symbol.replace('USDT', ''),
                         ruleId: evt.rule.id,
                         side: evt.side,
                         severity: evt.rule.severity,
                         titleKey: evt.rule.nameKey,
                         bodyKey: evt.rule.descKey,
                         vars,
                         mergedReasons: []
                     });
                 }
             });
             return updated.slice(0, 100);
         });
         setUnreadCount(prev => prev + newRawEvents.length);
      }

    }, 1000);
    return () => clearInterval(interval);
  }, [primaryTimeframe, contextTimeframe, alertRules, isAlertsPaused, t, analyticsSettings.holdSeconds, dataMode, data]); // Added data dependency for analytics loop in real mode

  // Filtering Logic (Scanner)
  const processedData = useMemo(() => {
    let filtered = [...data];
    
    // Watchlist / Hotlist logic
    if (scannerViewMode === 'watchlist') {
        filtered = filtered.filter(c => watchlist.has(c.symbol));
    } else if (scannerViewMode === 'hotlist') {
        filtered = filtered.filter(c => c.confidence > 70 && c.execution.score !== 'C').sort((a,b) => b.confidence - a.confidence).slice(0, 10);
    } else {
        if (filterRules.length > 0) {
            filtered = filtered.filter(coin => {
                return filterRules.every(rule => evaluateRule(coin, rule));
            });
        }
    }

    return filtered.sort((a, b) => {
      const tf = primaryTimeframe;
      if (sortBy === 'rsi') return sortDesc ? b.technical[tf].rsi.value - a.technical[tf].rsi.value : a.technical[tf].rsi.value - b.technical[tf].rsi.value;
      if (sortBy === 'exec') return sortDesc ? (a.execution.score < b.execution.score ? 1 : -1) : (a.execution.score > b.execution.score ? 1 : -1); 
      if (sortBy === 'vwap') {
          const distA = (a.price - a.vwap.price) / a.vwap.price;
          const distB = (b.price - b.vwap.price) / b.vwap.price;
          return sortDesc ? distB - distA : distA - distB;
      }
      // @ts-ignore
      const valA = a[sortBy]; const valB = b[sortBy];
      return sortDesc ? valB - valA : valA - valB;
    });
  }, [data, sortBy, sortDesc, primaryTimeframe, filterRules, scannerViewMode, watchlist]);

  const handleSort = (key: string) => { if (sortBy === key) setSortDesc(!sortDesc); else { setSortBy(key); setSortDesc(true); } };

  const toggleWatchlist = (symbol: string) => {
      const next = new Set(watchlist);
      if (next.has(symbol)) next.delete(symbol); else next.add(symbol);
      setWatchlist(next);
  };

  const savePreset = (name: string) => {
      const newPreset: Preset = { id: Math.random().toString(36), name, rules: filterRules, primaryTf: primaryTimeframe, contextTf: contextTimeframe };
      setPresets(prev => [...prev, newPreset]);
  };

  const loadPreset = (p: Preset) => {
      setFilterRules(p.rules);
      setPrimaryTimeframe(p.primaryTf);
      setContextTimeframe(p.contextTf);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-300 relative">
      <AlertsDrawer 
        isOpen={isAlertDrawerOpen} 
        onClose={() => { setIsAlertDrawerOpen(false); setUnreadCount(0); }} 
        events={alertEvents} 
        rules={alertRules} 
        onUpdateRule={(id, val) => setAlertRules(prev => prev.map(r => r.id === id ? { ...r, enabled: val } : r))}
        onUpdateParams={(id, p) => setAlertRules(prev => prev.map(r => r.id === id ? { ...r, params: p } : r))}
        onClearEvents={() => setAlertEvents([])}
        onPause={() => setIsAlertsPaused(!isAlertsPaused)}
        isPaused={isAlertsPaused}
      />
      
      <div className="fixed top-14 right-4 z-30 flex flex-col space-y-2 pointer-events-none lg:hidden">
          {alertEvents.slice(0, 1).map(alert => (
              <div key={alert.id} className="bg-gray-800 border border-gray-700 text-gray-200 px-4 py-3 rounded shadow-xl flex items-center animate-bounce pointer-events-auto">
                  <Megaphone size={14} className={`mr-2 ${alert.severity === 'high' ? 'text-neon-red' : alert.severity === 'success' ? 'text-neon-green' : 'text-neon-blue'}`} />
                  <span className="text-xs font-mono">{alert.symbol}: {t(alert.titleKey)}</span>
              </div>
          ))}
      </div>

      <div className="h-10 bg-gray-900 border-b border-gray-800 flex items-center px-4 justify-between select-none z-20">
        <div className="flex items-center space-x-6 text-xs font-mono">
            <div className="font-bold text-gray-400">FLUX<span className="text-neon-green">TERM</span></div>
            <div className="h-4 w-px bg-gray-800"></div>
            <button onClick={() => setCurrentView('scanner')} className={`hover:text-white transition-colors flex items-center space-x-1 ${currentView === 'scanner' ? 'text-neon-green font-bold' : 'text-gray-500'}`}>
                <Activity size={14} />
                <span>{t('nav.market_mode')}</span>
            </button>
            <button onClick={() => setCurrentView('analytics')} className={`hover:text-white transition-colors flex items-center space-x-1 ${currentView === 'analytics' ? 'text-neon-green font-bold' : 'text-gray-500'}`}>
                <PieChart size={14} />
                <span>{t('nav.analytics_mode')}</span>
            </button>
            <button onClick={() => setCurrentView('alerts')} className={`hover:text-white transition-colors flex items-center space-x-1 ${currentView === 'alerts' ? 'text-neon-green font-bold' : 'text-gray-500'}`}>
                <Bell size={14} />
                <span>{t('nav.alerts_mode')}</span>
            </button>
        </div>
        <div className="flex items-center space-x-4">
             {/* Data Mode Switch */}
             <div className="flex items-center bg-gray-950 border border-gray-800 rounded p-0.5">
                 <button onClick={() => setDataMode('MOCK')} className={`px-2 py-0.5 text-[10px] rounded flex items-center ${dataMode === 'MOCK' ? 'bg-yellow-500/20 text-yellow-500 font-bold' : 'text-gray-600 hover:text-gray-400'}`}>
                    <Database size={10} className="mr-1"/> MOCK
                 </button>
                 <button onClick={() => setDataMode('REAL')} className={`px-2 py-0.5 text-[10px] rounded flex items-center ${dataMode === 'REAL' ? 'bg-neon-green/20 text-neon-green font-bold' : 'text-gray-600 hover:text-gray-400'}`}>
                    {isWsConnected && dataMode === 'REAL' ? <Wifi size={10} className="mr-1"/> : <WifiOff size={10} className="mr-1"/>} REAL
                 </button>
             </div>
             <div className="h-4 w-px bg-gray-800"></div>
             <TimeframeSelector selected={contextTimeframe} onSelect={setContextTimeframe} label={t('nav.tf_context')} />
             <div className="h-4 w-px bg-gray-800"></div>
             <TimeframeSelector selected={primaryTimeframe} onSelect={setPrimaryTimeframe} label={t('nav.tf_primary')} />
             <div className="h-4 w-px bg-gray-800"></div>
             <button onClick={() => { setIsAlertDrawerOpen(true); setUnreadCount(0); }} className="relative p-1.5 text-gray-400 hover:text-white transition-colors">
                <Bell size={16} className={isAlertsPaused ? "opacity-50" : ""} />
                {unreadCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-neon-red rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-gray-900">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                {isAlertsPaused && <div className="absolute -bottom-1 -right-1"><Pause size={8} className="text-yellow-500 fill-current"/></div>}
             </button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {currentView === 'alerts' ? (
            <AlertsView 
                events={alertEvents} 
                onClear={() => setAlertEvents([])} 
                onPause={() => setIsAlertsPaused(!isAlertsPaused)} 
                isPaused={isAlertsPaused} 
                onNavigate={(sym) => { 
                    const coin = data.find(c => c.symbol.includes(sym)); 
                    if(coin) { setSelectedCoin(coin); setCurrentView('scanner'); } 
                }}
            />
        ) : currentView === 'analytics' ? (
             <div className="flex-1 bg-gray-950 overflow-hidden">
                 <AnalyticsView 
                    tradeHistory={tradeHistory} 
                    rules={alertRules} 
                    settings={analyticsSettings}
                    onUpdateSettings={(s) => setAnalyticsSettings(prev => ({...prev, ...s}))}
                    onReset={() => { setTradeHistory([]); openTradesRef.current = []; setSignalsFeed([]); signalsRef.current = []; }}
                    lastSignals={signalsFeed}
                 />
             </div>
        ) : (
        <div className="flex-1 flex flex-col bg-gray-950 overflow-hidden relative">
          
          <FilterBuilder rules={filterRules} onUpdate={setFilterRules} presets={presets} onSavePreset={savePreset} onLoadPreset={loadPreset} />

          {/* Scanner Tabs */}
          <div className="flex items-center px-4 pt-2 space-x-4 bg-gray-900/30 border-b border-gray-800">
              <button onClick={() => setScannerViewMode('all')} className={`text-xs pb-2 border-b-2 font-bold ${scannerViewMode === 'all' ? 'border-neon-blue text-white' : 'border-transparent text-gray-500'}`}>{t('scanner.tabs.all')}</button>
              <button onClick={() => setScannerViewMode('watchlist')} className={`text-xs pb-2 border-b-2 font-bold flex items-center ${scannerViewMode === 'watchlist' ? 'border-neon-yellow text-white' : 'border-transparent text-gray-500'}`}><Star size={10} className="mr-1"/>{t('scanner.tabs.watchlist')} ({watchlist.size})</button>
              <button onClick={() => setScannerViewMode('hotlist')} className={`text-xs pb-2 border-b-2 font-bold flex items-center ${scannerViewMode === 'hotlist' ? 'border-neon-red text-white' : 'border-transparent text-gray-500'}`}><Flame size={10} className="mr-1"/>{t('scanner.tabs.hotlist')}</button>
          </div>

          <div className="h-8 bg-gray-900/30 border-b border-gray-800 grid grid-cols-12 items-center px-2 text-[10px] font-bold text-gray-500 sticky top-0 z-10">
            <div className="col-span-2 pl-2 cursor-pointer hover:text-gray-300" onClick={() => handleSort('symbol')}>{t('scanner.cols.ticker')}</div>
            <div className="col-span-2 text-right cursor-pointer hover:text-gray-300" onClick={() => handleSort('price')}>{t('scanner.cols.price')}</div>
            <div className="col-span-2 text-center cursor-pointer hover:text-gray-300" onClick={() => handleSort('vwap')}>{t('scanner.cols.vwap')}</div>
            <div className="col-span-1 text-right cursor-pointer hover:text-gray-300" onClick={() => handleSort('rsi')}>{t('scanner.cols.rsi')} ({primaryTimeframe})</div>
            <div className="col-span-3 text-center text-gray-600 font-bold">{t('scanner.cols.indicators')}</div>
            <div className="col-span-1 text-center cursor-pointer hover:text-gray-300" onClick={() => handleSort('exec')}>{t('scanner.cols.exec')}</div>
            <div className="col-span-1 text-right pr-2 cursor-pointer hover:text-gray-300" onClick={() => handleSort('score')}>{t('scanner.cols.score')}</div>
          </div>
          <div className="flex-1 overflow-y-auto">
              {processedData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-600">
                      <Filter size={32} className="mb-2 opacity-20" />
                      <span className="text-xs">{t('scanner.empty_desc')}</span>
                  </div>
              ) : processedData.map((coin) => {
                 const activeInd = coin.technical[primaryTimeframe];
                 if (!activeInd) return null; 
                 const isStale = dataMode === 'REAL' && (Date.now() - coin.lastUpdateTs > 5000);
                 
                 return (
                    <div key={coin.symbol} onClick={() => setSelectedCoin(coin)} className={`grid grid-cols-12 items-center px-2 py-2 border-b border-gray-800/30 hover:bg-gray-800 cursor-pointer transition-colors text-xs group ${selectedCoin?.symbol === coin.symbol ? 'bg-gray-800/80 border-l-2 border-l-neon-blue' : ''}`}>
                    <div className="col-span-2 pl-2 font-mono font-bold text-gray-200 group-hover:text-white flex items-center">
                        <button onClick={(e) => { e.stopPropagation(); toggleWatchlist(coin.symbol); }} className={`mr-2 ${watchlist.has(coin.symbol) ? 'text-neon-yellow' : 'text-gray-700 hover:text-gray-500'}`}><Star size={10} fill={watchlist.has(coin.symbol) ? "currentColor" : "none"}/></button>
                        {coin.symbol.replace('USDT', '')}
                        {coin.levels.proximity && <div className="w-1.5 h-1.5 bg-neon-yellow rounded-full ml-2 animate-pulse"></div>}
                        {isStale && <span className="ml-2 text-[9px] bg-gray-800 text-gray-500 px-1 rounded border border-gray-700 font-bold">STALE</span>}
                    </div>
                    <div className={`col-span-2 text-right font-mono ${isStale ? 'text-gray-600 line-through decoration-gray-500' : ''}`}><FormatValue value={coin.price} type="price" /></div>
                    <div className="col-span-2 flex justify-center"><div className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center justify-center w-14 ${coin.vwap.state === 'above' ? 'bg-neon-green/10 text-neon-green border border-neon-green/20' : 'bg-neon-red/10 text-neon-red border border-neon-red/20'}`}>{coin.vwap.state === 'above' ? '> VWAP' : '< VWAP'}</div></div>
                    <div className="col-span-1 text-right"><RsiBadge value={activeInd.rsi.value} /></div>
                    
                    {/* Consolidated Indicators Column */}
                    <div className="col-span-3 flex items-center justify-center space-x-4 opacity-80">
                         <div className="flex items-center space-x-1" title="MACD">
                            <MacdIcon macd={activeInd.macd} />
                         </div>
                         <div className={`font-mono text-[10px] ${coin.volumeDelta > 2 ? 'text-neon-blue font-bold' : 'text-gray-500'}`} title="Vol Delta">
                            {coin.volumeDelta.toFixed(1)}x
                         </div>
                         <div className="font-mono text-[10px]" title="OI Change">
                            <FormatValue value={coin.oiChange} type="percent" />
                         </div>
                    </div>

                    <div className="col-span-1 flex justify-center"><ExecScoreBadge score={coin.execution.score} /></div>
                    <div className="col-span-1 text-right pr-2 flex justify-end"><ScoreBadge score={coin.score} /></div>
                    </div>
                 )
              })}
          </div>
           <div className="h-6 bg-gray-950 border-t border-gray-800 flex items-center px-4 justify-between text-[10px] text-gray-600">
            <span>{t('scanner.count_matches', { count: processedData.length })}</span>
            <div className="flex items-center space-x-2">
                <Monitor size={10} className={dataMode==='REAL'?"text-neon-green":"text-gray-500"}/>
                <span>{dataMode === 'REAL' ? (isWsConnected ? 'Binance Live' : 'Connecting...') : 'Mock Engine'}</span>
            </div>
          </div>
        </div>
        )}
        <DetailPanel 
            coin={selectedCoin} 
            onClose={() => setSelectedCoin(null)} 
            selectedTf={primaryTimeframe} 
            recentSignals={signalsFeed} 
            recentTrades={tradeHistory}
            isStarred={selectedCoin ? watchlist.has(selectedCoin.symbol) : false}
            toggleStar={() => selectedCoin && toggleWatchlist(selectedCoin.symbol)}
        />
      </div>
    </div>
  );
};

const App = () => <I18nProvider><FluxTermApp /></I18nProvider>;
const root = createRoot(document.getElementById('root')!);
root.render(<App />);