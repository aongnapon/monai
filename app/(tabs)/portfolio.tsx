import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  LogBox,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight, 
  X,
  ShieldCheck,
  Zap,
  Info,
  Search,
} from 'lucide-react-native';

import { useAuth } from '@/src/context/AuthContext';
import { getFirestore, doc, setDoc, collection, addDoc, onSnapshot, serverTimestamp } from '@react-native-firebase/firestore';
import { MARKET_STOCKS, MARKET_CRYPTOS } from '@/src/data/marketRegistry';

// Task 1: Stability Guard
LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout"']);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * CONFIG: API Environment Variables
 */
const FINNHUB_KEY = process.env.EXPO_PUBLIC_FINNHUB_API_KEY;
const LOGODEV_KEY = process.env.EXPO_PUBLIC_LOGODEV_API_KEY;
const COINGECKO_KEY = process.env.EXPO_PUBLIC_COINGECKO_API_KEY;

/**
 * PRODUCTION DATA: Registry Combination
 */
const ALL_ASSETS = [
  ...MARKET_STOCKS.map(s => ({ ...s, type: 'stock', coinId: null })),
  ...MARKET_CRYPTOS.map(c => ({ ...c, type: 'crypto', domain: null })),
];

/**
 * FALLBACK DATA: Institutional Mock Baseline (Safe-Style UI)
 */
const FALLBACK_PRICES: Record<string, { price: number; change: number; image?: string }> = {
  AAPL: { price: 185.92, change: 1.2 },
  BTC: { price: 68420.50, change: 3.2 },
};

/**
 * COMPONENT: Institutional Asset Logo Engine
 */
const AssetLogo = ({ ticker, type, domain, image, fallbackEmoji }: { ticker: string; type: string; domain?: string | null; image?: string; fallbackEmoji: string }) => {
  const [error, setError] = useState(false);
  
  const logoUri = useMemo(() => {
    if (type === 'stock' && domain) {
      return `https://img.logo.dev/${domain}?token=${LOGODEV_KEY}`;
    }
    return image; 
  }, [type, domain, image]);

  if (error || !logoUri) {
    return (
      <View style={styles.logoFallback}>
        <Text style={styles.fallbackEmoji}>{fallbackEmoji}</Text>
      </View>
    );
  }

  return (
    <View style={styles.logoContainer}>
      <Image 
        source={{ uri: logoUri }} 
        style={styles.logoImage} 
        onError={() => setError(true)} 
      />
    </View>
  );
};

export default function PortfolioScreen() {
  const { user } = useAuth();
  const db = getFirestore();

  // Search State
  const [searchQuery, setSearchTerm] = useState('');

  // Market Data State
  const [marketPrices, setMarketPrices] = useState<Record<string, { price: number; change: number; image?: string }>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Portfolio State
  const [cashBalance, setCashBalance] = useState(100000.00);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [tradeAmount, setTradeAmount] = useState('');
  const [isBuying, setIsBuying] = useState(true);

  /**
   * ENGINE: Global Market Data Fetcher
   */
  const fetchMarketData = useCallback(async () => {
    try {
      const updatedPrices = { ...marketPrices };

      // 1. Fetch Top 15 Stock Data (Finnhub) - Throttled for performance
      if (FINNHUB_KEY) {
        const stocksToFetch = MARKET_STOCKS.slice(0, 15);
        await Promise.all(stocksToFetch.map(async (stock) => {
          const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${stock.ticker}&token=${FINNHUB_KEY}`);
          const data = await res.json();
          if (data.c) {
            updatedPrices[stock.ticker] = { ...updatedPrices[stock.ticker], price: data.c, change: data.dp };
          }
        }));
      }

      // 2. Fetch Crypto Data (CoinGecko Markets Endpoint)
      const cryptos = MARKET_CRYPTOS.slice(0, 50);
      const coinIds = cryptos.map(c => c.id).join(',');
      const cgUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h&locale=en`;
      
      const cgRes = await fetch(cgUrl, COINGECKO_KEY ? { headers: { 'x-cg-pro-api-key': COINGECKO_KEY } } : {});
      const cgData = await cgRes.json();
      
      if (Array.isArray(cgData)) {
        cgData.forEach(coin => {
          const asset = MARKET_CRYPTOS.find(a => a.id === coin.id);
          if (asset) {
            updatedPrices[asset.ticker] = { 
              price: coin.current_price, 
              change: coin.price_change_percentage_24h,
              image: coin.image
            };
          }
        });
      }

      setMarketPrices(updatedPrices);
    } catch (error) {
      console.warn('Market Data Engine Throttled or Offline.');
    } finally {
      setIsRefreshing(false);
    }
  }, [marketPrices]);

  /**
   * DATA PERSISTENCE: Firestore Sync
   */
  useEffect(() => {
    if (!user?.uid) return;
    fetchMarketData();

    const portfolioRef = doc(db, 'user_portfolios', user.uid);
    const unsubscribe = onSnapshot(portfolioRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCashBalance(data.cashBalance ?? 100000.00);
        setHoldings(data.holdings ?? []);
      } else {
        setDoc(portfolioRef, { cashBalance: 100000.00, holdings: [], updatedAt: serverTimestamp() });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Filtering Logic
  const filteredAssets = useMemo(() => {
    return ALL_ASSETS.filter(asset => 
      asset.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 100);
  }, [searchQuery]);

  const totalMarketValue = useMemo(() => {
    return holdings.reduce((sum, hold) => {
      const livePrice = marketPrices[hold.ticker]?.price || FALLBACK_PRICES[hold.ticker]?.price || 0;
      return sum + (hold.quantity * livePrice);
    }, 0);
  }, [holdings, marketPrices]);

  const netWorth = cashBalance + totalMarketValue;
  const totalReturn = netWorth - 100000;
  const returnPct = (totalReturn / 100000) * 100;

  /**
   * TRANSACTION ENGINE: Executing Live Paper Trades
   */
  const handleTrade = async () => {
    if (!user?.uid || !selectedAsset) return;

    const quantity = parseFloat(tradeAmount);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid amount.');
      return;
    }

    const livePrice = marketPrices[selectedAsset.ticker]?.price || FALLBACK_PRICES[selectedAsset.ticker]?.price || 0;
    if (livePrice === 0) {
      Alert.alert('Market Closed', 'Price data unavailable for this asset currently.');
      return;
    }

    const totalCost = quantity * livePrice;
    const portfolioRef = doc(db, 'user_portfolios', user.uid);
    const transCollection = collection(portfolioRef, 'transactions');

    let updatedCash = cashBalance;
    let updatedHoldings = [...holdings];
    const existingIndex = updatedHoldings.findIndex(h => h.ticker === selectedAsset.ticker);

    if (isBuying) {
      if (totalCost > cashBalance) {
        Alert.alert('Insufficient Funds', 'Transfer more mock cash to execute.');
        return;
      }
      updatedCash -= totalCost;
      if (existingIndex > -1) {
        const h = updatedHoldings[existingIndex];
        const newQty = h.quantity + quantity;
        const newBasis = ((h.avgPrice * h.quantity) + totalCost) / newQty;
        updatedHoldings[existingIndex] = { ...h, quantity: newQty, avgPrice: newBasis };
      } else {
        updatedHoldings.push({ ticker: selectedAsset.ticker, quantity, avgPrice: livePrice });
      }
    } else {
      if (existingIndex === -1 || updatedHoldings[existingIndex].quantity < quantity) {
        Alert.alert('Insufficient Shares', 'You do not own enough of this asset.');
        return;
      }
      updatedCash += totalCost;
      const h = updatedHoldings[existingIndex];
      const newQty = h.quantity - quantity;
      if (newQty === 0) {
        updatedHoldings.splice(existingIndex, 1);
      } else {
        updatedHoldings[existingIndex] = { ...h, quantity: newQty };
      }
    }

    try {
      await setDoc(portfolioRef, { cashBalance: updatedCash, holdings: updatedHoldings, updatedAt: serverTimestamp() }, { merge: true });
      await addDoc(transCollection, { ticker: selectedAsset.ticker, type: isBuying ? 'BUY' : 'SELL', quantity, price: livePrice, timestamp: serverTimestamp() });
      setSelectedAsset(null);
      setTradeAmount('');
      Alert.alert('Trade Executed', `${isBuying ? 'Bought' : 'Sold'} ${quantity} units at $${livePrice.toLocaleString()}`);
    } catch (e) {
      Alert.alert('Sync Error', 'Firebase connection lost.');
    }
  };

  const renderMarketItem = ({ item }: { item: any }) => {
    const live = marketPrices[item.ticker] || FALLBACK_PRICES[item.ticker] || { price: 0, change: 0 };
    return (
      <Pressable 
        onPress={() => setSelectedAsset(item)}
        style={({ pressed }) => [styles.assetRow, pressed && { opacity: 0.7 }]}
      >
        <AssetLogo 
          ticker={item.ticker} 
          type={item.type} 
          domain={item.domain} 
          image={live.image}
          fallbackEmoji={item.fallbackEmoji}
        />
        <View style={styles.assetInfo}>
          <Text style={styles.assetTicker}>{item.ticker}</Text>
          <Text style={styles.assetName} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={styles.assetMetrics}>
          <Text style={styles.assetPrice}>
            {live.price > 0 ? `$${live.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'N/A'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {live.change >= 0 ? <TrendingUp size={10} color="#34C759" /> : <TrendingDown size={10} color="#FF3B30" />}
            <Text style={[styles.assetChange, { color: live.change >= 0 ? '#34C759' : '#FF3B30' }]}>
              {live.change >= 0 ? '+' : ''}{live.change.toFixed(2)}%
            </Text>
          </View>
        </View>
        <ChevronRight size={16} color="#94A3B8" />
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[2]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchMarketData(); }} />
        }
      >
        {/* WEALTH DASHBOARD */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>INSTITUTIONAL WEALTH</Text>
            <Text style={styles.headerTitle}>Portfolio</Text>
          </View>
          <View style={styles.badgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: '#F0F9FF' }]}>
              <ShieldCheck size={12} color="#0EA5E9" />
              <Text style={styles.statusText}>Live Simulation</Text>
            </View>
          </View>
        </View>

        <View style={styles.wealthCard}>
          <View style={styles.glassBackground} />
          <Text style={styles.netWorthLabel}>Total Net Worth</Text>
          <Text style={styles.netWorthValue}>${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          <View style={styles.returnsRow}>
            <View style={[styles.returnChip, { backgroundColor: totalReturn >= 0 ? '#DCFCE7' : '#FEE2E2' }]}>
              {totalReturn >= 0 ? <ArrowUpRight size={14} color="#16A34A" /> : <ArrowDownRight size={14} color="#DC2626" />}
              <Text style={[styles.returnPct, { color: totalReturn >= 0 ? '#16A34A' : '#DC2626' }]}>
                {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
              </Text>
            </View>
            <Text style={styles.totalReturnAmt}>${Math.abs(totalReturn).toLocaleString()} balance delta</Text>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.cashRow}>
            <View style={styles.cashLabelGroup}>
              <Wallet size={16} color="#64748B" />
              <Text style={styles.cashLabel}>Trading Power</Text>
            </View>
            <Text style={styles.cashValue}>${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>

        {/* SEARCH BAR (STICKY) */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Search size={18} color="#94A3B8" style={{ marginLeft: 16 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search 100+ assets..."
              value={searchQuery}
              onChangeText={setSearchTerm}
              placeholderTextColor="#94A3B8"
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {/* MARKET ASSETS LIST */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ASSET REGISTRY</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="broadcast" size={14} color="#6366F1" style={{ marginRight: 4 }} />
            <Text style={styles.sectionAction}>Live</Text>
          </View>
        </View>

        {filteredAssets.map((asset) => (
          <React.Fragment key={asset.ticker}>
            {renderMarketItem({ item: asset })}
          </React.Fragment>
        ))}

        {filteredAssets.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No assets found matching "{searchQuery}"</Text>
          </View>
        )}

        <View style={styles.infoFooter}>
          <Info size={14} color="#94A3B8" />
          <Text style={styles.infoFooterText}>Dynamic registry updated with 100+ global assets. Real-time pricing via Finnhub & CoinGecko.</Text>
        </View>
      </ScrollView>

      {/* QUICK TRADE MODAL */}
      <Modal visible={!!selectedAsset} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.tradeContainer}>
            <View style={styles.tradeHeader}>
              <View style={styles.tradeAssetInfo}>
                <AssetLogo 
                  ticker={selectedAsset?.ticker} 
                  type={selectedAsset?.type} 
                  domain={selectedAsset?.domain} 
                  image={marketPrices[selectedAsset?.ticker]?.image}
                  fallbackEmoji={selectedAsset?.fallbackEmoji}
                />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.tradeTicker}>{selectedAsset?.ticker}</Text>
                  <Text style={styles.tradePrice}>
                    ${(marketPrices[selectedAsset?.ticker]?.price || FALLBACK_PRICES[selectedAsset?.ticker]?.price || 0).toLocaleString()}
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => { setSelectedAsset(null); setTradeAmount(''); }} style={styles.closeBtn}>
                <X size={24} color="#1E293B" />
              </Pressable>
            </View>

            <View style={styles.tradeTypeToggle}>
              <Pressable onPress={() => setIsBuying(true)} style={[styles.toggleBtn, isBuying && { backgroundColor: '#34C759', borderColor: '#34C759' }]}>
                <Text style={[styles.toggleText, isBuying && { color: '#FFF' }]}>BUY</Text>
              </Pressable>
              <Pressable onPress={() => setIsBuying(false)} style={[styles.toggleBtn, !isBuying && { backgroundColor: '#FF3B30', borderColor: '#FF3B30' }]}>
                <Text style={[styles.toggleText, !isBuying && { color: '#FFF' }]}>SELL</Text>
              </Pressable>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Enter Order Quantity</Text>
              <TextInput style={styles.tradeInput} placeholder="0.00" keyboardType="decimal-pad" value={tradeAmount} onChangeText={setTradeAmount} placeholderTextColor="#94A3B8" />
              <View style={styles.inputEstimate}>
                <Text style={styles.estLabel}>ESTIMATED {isBuying ? 'OUTFLOW' : 'INFLOW'}</Text>
                <Text style={styles.estValue}>
                  ${(parseFloat(tradeAmount || '0') * (marketPrices[selectedAsset?.ticker]?.price || FALLBACK_PRICES[selectedAsset?.ticker]?.price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            <Pressable onPress={handleTrade} style={[styles.executeBtn, { backgroundColor: '#111827' }]}>
              <Text style={styles.executeBtnText}>Execute Paper Trade</Text>
              <Zap size={18} color="#FFF" fill="#FFF" style={{ marginLeft: 8 }} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 },
  headerLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 2 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  badgeContainer: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '800', color: '#0EA5E9', marginLeft: 4 },
  wealthCard: { padding: 24, borderRadius: 28, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', overflow: 'hidden' },
  glassBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFF', opacity: 0.7 },
  netWorthLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 4 },
  netWorthValue: { fontSize: 36, fontWeight: '900', color: '#0F172A', marginBottom: 16 },
  returnsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  returnChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 10 },
  returnPct: { fontSize: 13, fontWeight: '800', marginLeft: 2 },
  totalReturnAmt: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  cardDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.04)', marginBottom: 20 },
  cashRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cashLabelGroup: { flexDirection: 'row', alignItems: 'center' },
  cashLabel: { fontSize: 13, color: '#64748B', fontWeight: '600', marginLeft: 8 },
  cashValue: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  searchWrapper: { backgroundColor: '#F8FAFC', paddingBottom: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, height: 56, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '600', color: '#0F172A', paddingHorizontal: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5 },
  sectionAction: { fontSize: 11, fontWeight: '800', color: '#6366F1', textTransform: 'uppercase' },
  assetRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  logoContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  logoImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  logoFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  fallbackEmoji: { fontSize: 18 },
  assetInfo: { flex: 1, marginLeft: 14 },
  assetTicker: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  assetName: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  assetMetrics: { alignItems: 'flex-end', marginRight: 10 },
  assetPrice: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  assetChange: { fontSize: 11, fontWeight: '800', marginLeft: 2 },
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  infoFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingHorizontal: 10 },
  infoFooterText: { fontSize: 11, color: '#94A3B8', marginLeft: 10, lineHeight: 16, flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  tradeContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  tradeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  tradeAssetInfo: { flexDirection: 'row', alignItems: 'center' },
  tradeTicker: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  tradePrice: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  tradeTypeToggle: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 4, marginBottom: 24 },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  toggleText: { fontSize: 14, fontWeight: '800', color: '#64748B' },
  inputContainer: { marginBottom: 32 },
  inputLabel: { fontSize: 11, fontWeight: '900', color: '#94A3B8', letterSpacing: 1, marginBottom: 12 },
  tradeInput: { fontSize: 48, fontWeight: '900', color: '#0F172A', padding: 0, marginBottom: 16 },
  inputEstimate: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  estLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8' },
  estValue: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  executeBtn: { width: '100%', paddingVertical: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  executeBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
});
