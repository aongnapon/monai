import { useAuth } from '@/src/context/AuthContext';
import { MARKET_STOCKS } from '@/src/data/marketRegistry';
import {
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@react-native-firebase/firestore';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * ARCHITECTURAL CONFIGURATION
 */
const FINNHUB_KEY = process.env.EXPO_PUBLIC_FINNHUB_API_KEY;
const COINGECKO_KEY = process.env.EXPO_PUBLIC_COINGECKO_API_KEY;
const LOGODEV_KEY = process.env.EXPO_PUBLIC_LOGODEV_API_KEY;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * DATA REGISTRY: Explicit CoinGecko ID Mapping (Exactly 50)
 */
const CRYPTO_REGISTRY = [
  { id: 'bitcoin', ticker: 'BTC', name: 'Bitcoin', color: '#F7931A' },
  { id: 'ethereum', ticker: 'ETH', name: 'Ethereum', color: '#627EEA' },
  { id: 'solana', ticker: 'SOL', name: 'Solana', color: '#14F195' },
  { id: 'binancecoin', ticker: 'BNB', name: 'BNB', color: '#F3BA2F' },
  { id: 'ripple', ticker: 'XRP', name: 'XRP', color: '#23292F' },
  { id: 'cardano', ticker: 'ADA', name: 'Cardano', color: '#0033AD' },
  { id: 'dogecoin', ticker: 'DOGE', name: 'Dogecoin', color: '#C2A633' },
  { id: 'shiba-inu', ticker: 'SHIB', name: 'Shiba Inu', color: '#FFA409' },
  { id: 'avalanche-2', ticker: 'AVAX', name: 'Avalanche', color: '#E84142' },
  { id: 'polkadot', ticker: 'DOT', name: 'Polkadot', color: '#E6007A' },
  { id: 'chainlink', ticker: 'LINK', name: 'Chainlink', color: '#2A5ADA' },
  { id: 'polygon', ticker: 'MATIC', name: 'Polygon', color: '#8247E5' },
  { id: 'near', ticker: 'NEAR', name: 'NEAR Protocol', color: '#000000' },
  { id: 'uniswap', ticker: 'UNI', name: 'Uniswap', color: '#FF007A' },
  { id: 'litecoin', ticker: 'LTC', name: 'Litecoin', color: '#BFBBBB' },
  { id: 'stellar', ticker: 'XLM', name: 'Stellar', color: '#08B5E5' },
  { id: 'vechain', ticker: 'VET', name: 'VeChain', color: '#15BDFF' },
  { id: 'cosmos', ticker: 'ATOM', name: 'Cosmos', color: '#2E3148' },
  { id: 'ethereum-classic', ticker: 'ETC', name: 'Ethereum Classic', color: '#348331' },
  { id: 'monero', ticker: 'XMR', name: 'Monero', color: '#FF6600' },
  { id: 'okb', ticker: 'OKB', name: 'OKB', color: '#3075F2' },
  { id: 'filecoin', ticker: 'FIL', name: 'Filecoin', color: '#0090FF' },
  { id: 'kaspa', ticker: 'KAS', name: 'Kaspa', color: '#70C5BA' },
  { id: 'aptos', ticker: 'APT', name: 'Aptos', color: '#000000' },
  { id: 'hedera-hashgraph', ticker: 'HBAR', name: 'Hedera', color: '#000000' },
  { id: 'cronos', ticker: 'CRO', name: 'Cronos', color: '#002D74' },
  { id: 'optimism', ticker: 'OP', name: 'Optimism', color: '#FF0420' },
  { id: 'arbitrum', ticker: 'ARB', name: 'Arbitrum', color: '#28A0F0' },
  { id: 'lido-dao', ticker: 'LDO', name: 'Lido DAO', color: '#00A3FF' },
  { id: 'injective-protocol', ticker: 'INJ', name: 'Injective', color: '#00A3FF' },
  { id: 'quant-network', ticker: 'QNT', name: 'Quant', color: '#273444' },
  { id: 'maker', ticker: 'MKR', name: 'Maker', color: '#1AAB9B' },
  { id: 'the-graph', ticker: 'GRT', name: 'The Graph', color: '#6747ED' },
  { id: 'immutable-x', ticker: 'IMX', name: 'Immutable', color: '#0D0D0D' },
  { id: 'render-token', ticker: 'RNDR', name: 'Render', color: '#000000' },
  { id: 'stacks', ticker: 'STX', name: 'Stacks', color: '#5546FF' },
  { id: 'thorchain', ticker: 'RUNE', name: 'THORChain', color: '#33FFCC' },
  { id: 'aave', ticker: 'AAVE', name: 'Aave', color: '#B6509E' },
  { id: 'flow', ticker: 'FLOW', name: 'Flow', color: '#00EF8B' },
  { id: 'algorand', ticker: 'ALGO', name: 'Algorand', color: '#000000' },
  { id: 'bitcoin-cash', ticker: 'BCH', name: 'Bitcoin Cash', color: '#8BC34A' },
  { id: 'dai', ticker: 'DAI', name: 'Dai', color: '#F5AC37' },
  { id: 'wrapped-bitcoin', ticker: 'WBTC', name: 'Wrapped Bitcoin', color: '#F7931A' },
  { id: 'fantom', ticker: 'FTM', name: 'Fantom', color: '#1969FF' },
  { id: 'bittensor', ticker: 'TAO', name: 'Bittensor', color: '#000000' },
  { id: 'mantle', ticker: 'MNT', name: 'Mantle', color: '#000000' },
  { id: 'gala', ticker: 'GALA', name: 'Gala', color: '#000000' },
  { id: 'eos', ticker: 'EOS', name: 'EOS', color: '#000000' },
  { id: 'iota', ticker: 'IOTA', name: 'IOTA', color: '#101921' },
  { id: 'the-sandbox', ticker: 'SAND', name: 'The Sandbox', color: '#000000' },
];

const STOCK_REGISTRY = MARKET_STOCKS.slice(0, 50);

/**
 * HIGH CONTRAST FALLBACK AVATAR SYSTEM
 */
const AssetAvatar = ({ ticker, color }: { ticker: string; color?: string }) => {
  const isBTC = ticker.toUpperCase() === 'BTC';
  const isETH = ticker.toUpperCase() === 'ETH';
  const isSOL = ticker.toUpperCase() === 'SOL';
  
  const bgColor = isBTC ? '#FFD700' : isETH ? '#E5E4E2' : isSOL ? '#8247E5' : (color || '#F1F5F9');
  const textColor = (isBTC || isETH) ? '#000' : '#FFF';

  return (
    <View style={[styles.avatarBadge, { backgroundColor: bgColor }]}>
      <Text style={[styles.avatarText, { color: textColor }]}>
        {ticker.substring(0, 3).toUpperCase()}
      </Text>
    </View>
  );
};

/**
 * UNIFIED LOGO RENDERER: LogoDev (Stocks) + CoinGecko (Crypto)
 */
const AssetRowIcon = ({ domain, ticker, color, name, remoteUri }: { domain?: string; ticker: string; color?: string; name: string; remoteUri?: string }) => {
  const [error, setError] = useState(false);
  const logoUri = remoteUri || (domain ? `https://img.logo.dev/${domain}?token=${LOGODEV_KEY}` : null);

  if (error || !logoUri) {
    return <AssetAvatar ticker={ticker} color={color} />;
  }

  return (
    <View style={styles.logoFrame}>
      <Image 
        source={{ uri: logoUri }} 
        style={styles.logoImage} 
        onError={() => setError(true)} 
      />
    </View>
  );
};

export default function PortfolioDashboard() {
  const { user } = useAuth();
  const db = getFirestore();

  // DASHBOARD STATE
  const [activeTab, setActiveTab] = useState<'market' | 'positions'>('market');
  const [searchQuery, setSearchQuery] = useState('');
  const [marketPrices, setMarketPrices] = useState<Record<string, { price: number; change: number; image?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // FIRESTORE SYNC
  const [cashBalance, setCashBalance] = useState(0);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [lastClaimed, setLastClaimed] = useState('');

  // UI INTERACTIONS
  const [rewardModalVisible, setRewardModalVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [tradeQuantity, setTradeQuantity] = useState('1');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  /**
   * REPAIRED NETWORK PIPELINE: CoinGecko Markets API + Chunked Finnhub
   */
  const fetchMarketData = useCallback(async () => {
    try {
      const newResults: Record<string, { price: number; change: number; image?: string }> = {};

      // 1. CHUNKED STOCK FETCH (Finnhub)
      if (FINNHUB_KEY) {
        const fetchBatch = async (batch: typeof STOCK_REGISTRY) => {
          await Promise.all(batch.map(async (s) => {
            try {
              const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${s.ticker}&token=${FINNHUB_KEY}`);
              const data = await res.json();
              if (data.c) newResults[s.ticker] = { price: data.c, change: data.dp };
            } catch (e) {}
          }));
        };
        await fetchBatch(STOCK_REGISTRY.slice(0, 25));
        await new Promise(r => setTimeout(r, 1500));
        await fetchBatch(STOCK_REGISTRY.slice(25, 50));
      }

      // 2. REPAIRED COINGECKO MARKETS API
      const ids = CRYPTO_REGISTRY.map(c => c.id).join(',');
      const cgUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`;
      const cgRes = await fetch(cgUrl, COINGECKO_KEY ? { headers: { 'x-cg-demo-api-key': COINGECKO_KEY } } : {});
      const cgData = await cgRes.json();
      
      if (Array.isArray(cgData)) {
        cgData.forEach(coin => {
          newResults[coin.symbol.toUpperCase()] = { 
            price: coin.current_price, 
            change: coin.price_change_percentage_24h,
            image: coin.image
          };
        });
      }

      setMarketPrices(prev => ({ ...prev, ...newResults }));
    } catch (e) {
      console.error('Market Pipeline Error:', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  /**
   * FIRESTORE PERSISTENCE LAYER
   */
  useEffect(() => {
    if (!user?.uid) return;
    fetchMarketData();

    const docRef = doc(db, 'portfolio_v2', user.uid);
    const unsubscribe = onSnapshot(docRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCashBalance(data.cashBalance || 0);
        setHoldings(data.holdings || []);
        setStreakCount(data.currentStreakCount || 0);
        setLastClaimed(data.lastClaimedTimestamp || '');

        const today = new Date().toDateString();
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        if (data.lastClaimedTimestamp && data.lastClaimedTimestamp !== today && data.lastClaimedTimestamp !== yesterday.toDateString()) {
          await updateDoc(docRef, { currentStreakCount: 0 });
        }
      } else {
        await setDoc(docRef, { cashBalance: 50000, holdings: [], currentStreakCount: 0, lastClaimedTimestamp: '', updatedAt: serverTimestamp() });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Streak Pulse
  useEffect(() => {
    if (rewardModalVisible) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])).start();
    }
  }, [rewardModalVisible]);

  /**
   * CALCULATED AGGREGATES
   */
  const stats = useMemo(() => {
    let marketVal = 0;
    let costBasis = 0;
    holdings.forEach(h => {
      const live = marketPrices[h.ticker]?.price || h.avgPrice;
      marketVal += h.quantity * live;
      costBasis += h.quantity * h.avgPrice;
    });
    const netWorth = cashBalance + marketVal;
    const pl = marketVal - costBasis;
    const pct = costBasis > 0 ? (pl / costBasis) * 100 : 0;
    return { netWorth, profitLoss: pl, plPct: pct };
  }, [holdings, marketPrices, cashBalance]);

  const filteredMarket = useMemo(() => {
    const registry = [...STOCK_REGISTRY.map(s => ({...s, type: 'stock'})), ...CRYPTO_REGISTRY.map(c => ({...c, type: 'crypto'}))];
    if (!searchQuery) return registry;
    const q = searchQuery.toUpperCase();
    return registry.filter(a => a.ticker.includes(q) || a.name.toUpperCase().includes(q));
  }, [searchQuery]);

  /**
   * REWARD & TRADE HANDLERS
   */
  const claimReward = async () => {
    if (!user?.uid || lastClaimed === new Date().toDateString()) return;
    const docRef = doc(db, 'portfolio_v2', user.uid);
    let next = streakCount + 1;
    if (next > 7) next = 1;
    const cash = [5000, 10000, 15000, 20000, 25000, 30000, 100000][next-1];
    let newH = [...holdings];
    const ticker = next === 7 ? 'NVDA' : 'AAPL';
    const qty = next === 7 ? 2 : 1;
    const p = marketPrices[ticker]?.price || 150;
    const i = newH.findIndex(h => h.ticker === ticker);
    if (i > -1) newH[i] = { ...newH[i], quantity: newH[i].quantity + qty, avgPrice: ((newH[i].avgPrice * newH[i].quantity) + (p * qty)) / (newH[i].quantity + qty) };
    else newH.push({ ticker, quantity: qty, avgPrice: p });

    try {
      await updateDoc(docRef, { cashBalance: cashBalance + cash, currentStreakCount: next, lastClaimedTimestamp: new Date().toDateString(), holdings: newH, updatedAt: serverTimestamp() });
      setRewardModalVisible(false);
      Alert.alert('Streak Extended! 🔥', `Day ${next} Claimed: +$${cash.toLocaleString()} Simulation Cash.`);
    } catch (e) { Alert.alert('Error', 'Sync failed.'); }
  };

  const trade = async (buy: boolean) => {
    if (!user?.uid || !selectedAsset) return;
    const qty = parseFloat(tradeQuantity);
    const p = marketPrices[selectedAsset.ticker]?.price || 0;
    if (isNaN(qty) || qty <= 0 || p <= 0) return Alert.alert('Invalid Order');
    const val = qty * p;
    const docRef = doc(db, 'portfolio_v2', user.uid);
    let c = cashBalance, h = [...holdings];
    const i = h.findIndex(x => x.ticker === selectedAsset.ticker);

    if (buy) {
      if (val > cashBalance) return Alert.alert('Insufficient Funds');
      c -= val;
      if (i > -1) h[i] = { ...h[i], quantity: h[i].quantity + qty, avgPrice: ((h[i].avgPrice * h[i].quantity) + val) / (h[i].quantity + qty) };
      else h.push({ ticker: selectedAsset.ticker, quantity: qty, avgPrice: p });
    } else {
      if (i === -1 || h[i].quantity < qty) return Alert.alert('Insufficient Shares');
      c += val;
      if (h[i].quantity - qty <= 0) h.splice(i, 1);
      else h[i] = { ...h[i], quantity: h[i].quantity - qty };
    }
    try {
      await updateDoc(docRef, { cashBalance: c, holdings: h, updatedAt: serverTimestamp() });
      setSelectedAsset(null);
    } catch (e) { Alert.alert('Trade Failed'); }
  };

  /**
   * FLATLIST RENDERERS: Mandatory Logo Integrations
   */
  const renderMarketItem = ({ item }: { item: any }) => {
    const live = marketPrices[item.ticker];
    return (
      <Pressable style={styles.assetCard} onPress={() => setSelectedAsset(item)}>
        <AssetRowIcon ticker={item.ticker} domain={item.domain} color={item.color} name={item.name} remoteUri={live?.image} />
        <View style={styles.assetMain}>
          <Text style={styles.assetTicker}>{item.ticker}</Text>
          <Text style={styles.assetName} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={styles.assetRight}>
          <Text style={styles.assetPrice}>{live ? `$${live.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '---'}</Text>
          <Text style={[styles.assetDelta, { color: (live?.change || 0) >= 0 ? '#34C759' : '#FF3B30' }]}>{(live?.change || 0).toFixed(2)}%</Text>
        </View>
      </Pressable>
    );
  };

  const renderPositionItem = ({ item }: { item: any }) => {
    const live = marketPrices[item.ticker];
    const livePrice = live?.price || item.avgPrice;
    const isUp = livePrice >= item.avgPrice;
    const meta = [...STOCK_REGISTRY, ...CRYPTO_REGISTRY].find(a => a.ticker === item.ticker);

    return (
      <View style={styles.holdingCard}>
        <View style={styles.holdingHeader}>
          <AssetRowIcon ticker={item.ticker} domain={(meta as any)?.domain} color={(meta as any)?.color} name={(meta as any)?.name || item.ticker} remoteUri={live?.image} />
          <View style={styles.holdingMain}>
            <Text style={styles.holdingTicker}>{item.ticker}</Text>
            <Text style={styles.holdingName} numberOfLines={1}>{(meta as any)?.name || 'Position'}</Text>
          </View>
          <View style={[styles.plBadge, { backgroundColor: isUp ? '#E8F5E9' : '#FFEBEE' }]}>
            <Text style={[styles.plBadgeText, { color: isUp ? '#2E7D32' : '#C62828' }]}>{isUp ? '▲' : '▼'} {Math.abs(((livePrice - item.avgPrice) / item.avgPrice) * 100).toFixed(2)}%</Text>
          </View>
        </View>
        <View style={styles.holdingGrid}>
          <View style={styles.gridCell}><Text style={styles.gridLabel}>SHARES</Text><Text style={styles.gridValue}>{item.quantity.toFixed(4)}</Text></View>
          <View style={styles.gridCell}><Text style={styles.gridLabel}>AVG COST</Text><Text style={styles.gridValue}>${item.avgPrice.toLocaleString()}</Text></View>
          <View style={[styles.gridCell, { alignItems: 'flex-end' }]}><Text style={styles.gridLabel}>VALUE</Text><Text style={styles.gridValue}>${(item.quantity * livePrice).toLocaleString()}</Text></View>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.fullCenter}><ActivityIndicator size="large" color="#1D4ED8" /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER: Quant Hub + Streak */}
      <View style={styles.header}>
        <Text style={styles.title}>Quant Hub</Text>
        <Pressable onPress={() => setRewardModalVisible(true)} style={styles.streakBtn}>
          <Text style={styles.streakEmoji}>📅</Text>
          <Text style={styles.streakBtnText}>{streakCount} Day Streak</Text>
        </Pressable>
      </View>

      {/* LOCKED VIEWPORT: Total Balance Card */}
      <View style={styles.lockedArea}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>TOTAL NET WORTH</Text>
          <Text style={styles.balanceAmount}>${stats.netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          <View style={styles.balanceFooter}>
            <View style={[styles.plChip, { backgroundColor: stats.profitLoss >= 0 ? '#E8F5E9' : '#FFEBEE' }]}>
              <Text style={[styles.plChipText, { color: stats.profitLoss >= 0 ? '#2E7D32' : '#C62828' }]}>{stats.profitLoss >= 0 ? '▲' : '▼'} {Math.abs(stats.plPct).toFixed(2)}%</Text>
            </View>
            <Text style={styles.cashLabel}>CASH: ${cashBalance.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* TAB DECK: Market vs Positions */}
      <View style={styles.tabDeck}>
        <Pressable onPress={() => setActiveTab('market')} style={[styles.tabBtn, activeTab === 'market' && styles.tabBtnActive]}><Text style={[styles.tabText, activeTab === 'market' && styles.tabTextActive]}>Market Assets</Text></Pressable>
        <Pressable onPress={() => setActiveTab('positions')} style={[styles.tabBtn, activeTab === 'positions' && styles.tabBtnActive]}><Text style={[styles.tabText, activeTab === 'positions' && styles.tabTextActive]}>My Positions</Text></Pressable>
      </View>

      {/* MAIN DATA ENGINE */}
      {activeTab === 'market' ? (
        <View style={styles.flexOne}>
          <View style={styles.searchBox}><TextInput style={styles.searchField} placeholder="Filter 100+ global assets..." placeholderTextColor="#94A3B8" value={searchQuery} onChangeText={setSearchQuery} /></View>
          <FlatList data={filteredMarket} renderItem={renderMarketItem} keyExtractor={it => it.ticker} contentContainerStyle={styles.listPad} showsVerticalScrollIndicator={false} onRefresh={() => { setRefreshing(true); fetchMarketData(); }} refreshing={refreshing} maxToRenderPerBatch={10} windowSize={5} />
        </View>
      ) : (
        <FlatList data={holdings} renderItem={renderPositionItem} keyExtractor={(it, idx) => `${it.ticker}-${idx}`} contentContainerStyle={styles.listPad} showsVerticalScrollIndicator={false} ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Empty simulation ledger.</Text></View>} />
      )}

      {/* STREAK MODAL */}
      <Modal visible={rewardModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.rewardCard}>
            <Text style={styles.rewardLabel}>REWARD FLOW</Text>
            <Text style={styles.rewardTitle}>7-Day Rolling Cycle</Text>
            <View style={styles.streakRow}>
              {[1, 2, 3, 4, 5, 6, 7].map(d => {
                const isD = d <= streakCount; const isN = d === streakCount + 1 && lastClaimed !== new Date().toDateString();
                return <View key={d} style={styles.node}><Animated.View style={[styles.badge, isD && styles.badgeD, isN && { transform: [{ scale: pulseAnim }], borderColor: '#1D4ED8', borderWidth: 2 }]}><Text>{isD ? '✔️' : d === 7 ? '🎁' : '💰'}</Text></Animated.View><Text style={[styles.nodeL, isN && { color: '#1D4ED8' }]}>Day {d}</Text></View>;
              })}
            </View>
            <View style={styles.nextBox}><Text style={styles.nextL}>NEXT DROP:</Text><Text style={styles.nextV}>+${((streakCount + 1) * 10000).toLocaleString()}</Text></View>
            <Pressable style={[styles.claimB, lastClaimed === new Date().toDateString() && { opacity: 0.5 }]} onPress={claimReward}><Text style={styles.claimBT}>{lastClaimed === new Date().toDateString() ? 'Claimed' : 'Collect Drop'}</Text></Pressable>
            <Pressable onPress={() => setRewardModalVisible(false)} style={styles.closeReward}><Text style={styles.closeRewardT}>Dismiss</Text></Pressable>
          </View>
        </View>
      </Modal>

      {/* TRADE SHEET */}
      <Modal visible={!!selectedAsset} transparent animationType="slide">
        <View style={styles.sheetBg}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{selectedAsset?.ticker}</Text><Pressable onPress={() => setSelectedAsset(null)} style={styles.sheetX}><Text>✕</Text></Pressable></View>
            <Text style={styles.sheetRate}>Market Price: ${marketPrices[selectedAsset?.ticker]?.price?.toLocaleString() || '---'}</Text>
            <View style={styles.inputBox}><Text style={styles.inputLabel}>UNITS</Text><TextInput style={styles.inputF} keyboardType="decimal-pad" value={tradeQuantity} onChangeText={setTradeQuantity} autoFocus /></View>
            <View style={styles.sheetBtnRow}><Pressable onPress={() => trade(true)} style={[styles.sheetB, { backgroundColor: '#34C759' }]}><Text style={styles.sheetBT}>BUY</Text></Pressable><Pressable onPress={() => trade(false)} style={[styles.sheetB, { backgroundColor: '#FF3B30' }]}><Text style={styles.sheetBT}>SELL</Text></Pressable></View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  fullCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  flexOne: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 26, fontWeight: '900', color: '#0F172A' },
  streakBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#1D4ED8' },
  streakEmoji: { fontSize: 16, marginRight: 5 },
  streakBtnText: { fontSize: 12, fontWeight: '800', color: '#1D4ED8' },
  lockedArea: { paddingHorizontal: 20, marginBottom: 20 },
  balanceCard: { backgroundColor: '#FFF', padding: 25, borderRadius: 28, borderWidth: 2, borderColor: '#1D4ED8', shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  balanceLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5 },
  balanceAmount: { fontSize: 36, fontWeight: '900', color: '#0F172A', marginVertical: 10 },
  balanceFooter: { flexDirection: 'row', alignItems: 'center' },
  plChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  plChipText: { fontSize: 11, fontWeight: '900' },
  cashLabel: { fontSize: 12, fontWeight: '800', color: '#94A3B8', marginLeft: 15 },
  tabDeck: { flexDirection: 'row', backgroundColor: '#F8F9FA', marginHorizontal: 20, borderRadius: 18, padding: 4, marginBottom: 15 },
  tabBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 14 },
  tabBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  tabTextActive: { color: '#0A1128' },
  searchBox: { marginHorizontal: 20, marginBottom: 15, height: 50, backgroundColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 15, justifyContent: 'center' },
  searchField: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  listPad: { paddingHorizontal: 20, paddingBottom: 40 },
  assetCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  logoFrame: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: '#F8F9FA' },
  logoImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  avatarBadge: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 11, fontWeight: '900' },
  assetMain: { flex: 1, marginLeft: 16 },
  assetTicker: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  assetName: { fontSize: 12, color: '#64748B', marginTop: 3 },
  assetRight: { alignItems: 'flex-end' },
  assetPrice: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  assetDelta: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  holdingCard: { backgroundColor: '#FFF', padding: 22, borderRadius: 30, marginBottom: 15, borderWidth: 1, borderColor: '#F1F5F9' },
  holdingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  holdingMain: { flex: 1, marginLeft: 16 },
  holdingTicker: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  holdingName: { fontSize: 12, color: '#64748B', marginTop: 2 },
  plBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  plBadgeText: { fontSize: 11, fontWeight: '900' },
  holdingGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  gridCell: { flex: 1 },
  gridLabel: { fontSize: 9, fontWeight: '900', color: '#94A3B8', marginBottom: 5 },
  gridValue: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  rewardCard: { width: SCREEN_WIDTH * 0.9, backgroundColor: '#FFF', borderRadius: 40, padding: 30, alignItems: 'center', borderWidth: 3, borderColor: '#1D4ED8' },
  rewardLabel: { fontSize: 10, fontWeight: '900', color: '#1D4ED8', letterSpacing: 2, marginBottom: 10 },
  rewardTitle: { fontSize: 26, fontWeight: '900', color: '#111', marginBottom: 35 },
  streakRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 35 },
  node: { alignItems: 'center', width: 62 },
  badge: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  badgeD: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  nodeL: { fontSize: 9, fontWeight: '900', color: '#94A3B8', marginTop: 8 },
  nextBox: { width: '100%', backgroundColor: '#F1F5F9', padding: 20, borderRadius: 20, marginBottom: 35, alignItems: 'center' },
  nextL: { fontSize: 11, fontWeight: '900', color: '#1D4ED8', marginBottom: 5 },
  nextV: { fontSize: 22, fontWeight: '900', color: '#1D4ED8' },
  claimB: { width: '100%', backgroundColor: '#0F172A', paddingVertical: 18, borderRadius: 32, alignItems: 'center' },
  claimBT: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  closeReward: { marginTop: 20, padding: 10 },
  closeRewardT: { color: '#94A3B8', fontWeight: '800', fontSize: 13 },
  sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 35, paddingBottom: 50 },
  sheetHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginBottom: 25 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sheetTitle: { fontSize: 32, fontWeight: '900' },
  sheetX: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  sheetRate: { fontSize: 16, color: '#64748B', marginBottom: 30 },
  inputBox: { marginBottom: 35 },
  inputLabel: { fontSize: 11, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 10 },
  inputF: { fontSize: 44, fontWeight: '900', borderBottomWidth: 2, borderBottomColor: '#1D4ED8', paddingVertical: 8 },
  sheetBtnRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sheetB: { flex: 0.48, paddingVertical: 20, borderRadius: 32, alignItems: 'center' },
  sheetBT: { color: '#FFF', fontSize: 17, fontWeight: '900' },
});
