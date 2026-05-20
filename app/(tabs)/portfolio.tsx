import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  FlatList,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp,
  updateDoc,
} from '@react-native-firebase/firestore';
import { MARKET_STOCKS, MARKET_CRYPTOS } from '@/src/data/marketRegistry';

/**
 * ARCHITECTURAL CONFIGURATION
 */
const FINNHUB_KEY = process.env.EXPO_PUBLIC_FINNHUB_API_KEY;
const COINGECKO_KEY = process.env.EXPO_PUBLIC_COINGECKO_API_KEY;
const LOGODEV_KEY = process.env.EXPO_PUBLIC_LOGODEV_API_KEY;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Ensure exactly 50 cryptos for the matrix pipeline
const CRYPTO_REGISTRY = [
  ...MARKET_CRYPTOS,
  { id: 'algorand', ticker: 'ALGO', name: 'Algorand', fallbackEmoji: '🅰️' }
].slice(0, 50);

const STOCK_REGISTRY = MARKET_STOCKS.slice(0, 50);

/**
 * HIGH CONTRAST FALLBACK AVATAR SYSTEM
 */
const AssetAvatar = ({ ticker, color, name }: { ticker: string; color?: string; name: string }) => {
  const isBTC = ticker === 'BTC';
  const isETH = ticker === 'ETH';
  const isSOL = ticker === 'SOL';
  
  const bgColor = isBTC ? '#FFD700' : isETH ? '#E5E4E2' : isSOL ? '#8247E5' : (color || '#F1F5F9');
  const textColor = (isBTC || isETH) ? '#000' : '#FFF';

  return (
    <View style={[styles.avatarBadge, { backgroundColor: bgColor }]}>
      <Text style={[styles.avatarText, { color: isSOL || (!isBTC && !isETH) ? '#FFF' : textColor }]}>
        {ticker.substring(0, 3)}
      </Text>
    </View>
  );
};

const AssetRowIcon = ({ domain, ticker, color, name }: { domain?: string; ticker: string; color?: string; name: string }) => {
  const [error, setError] = useState(false);
  const logoUri = domain ? `https://img.logo.dev/${domain}?token=${LOGODEV_KEY}` : null;

  if (error || !logoUri) {
    return <AssetAvatar ticker={ticker} color={color} name={name} />;
  }

  return (
    <View style={styles.logoFrame}>
      <Image source={{ uri: logoUri }} style={styles.logoImage} onError={() => setError(true)} />
    </View>
  );
};

export default function PortfolioDashboard() {
  const { user } = useAuth();
  const db = getFirestore();

  // DASHBOARD STATE
  const [activeTab, setActiveTab] = useState<'market' | 'positions'>('market');
  const [searchQuery, setSearchQuery] = useState('');
  const [marketPrices, setMarketPrices] = useState<Record<string, { price: number; change: number }>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // FIRESTORE SYNC (portfolio_v2)
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
   * CHUNKED NETWORK PIPELINE: CRUSHING RATE LIMITS
   */
  const fetchMarketData = useCallback(async () => {
    try {
      const results: Record<string, { price: number; change: number }> = { ...marketPrices };

      // 1. CHUNKED STOCK FETCH (Finnhub: 25 + 25 with 1.5s delay)
      if (FINNHUB_KEY) {
        const batch1 = STOCK_REGISTRY.slice(0, 25);
        const batch2 = STOCK_REGISTRY.slice(25, 50);

        const fetchBatch = async (batch: typeof STOCK_REGISTRY) => {
          await Promise.all(batch.map(async (s) => {
            try {
              const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${s.ticker}&token=${FINNHUB_KEY}`);
              const data = await res.json();
              if (data.c) results[s.ticker] = { price: data.c, change: data.dp };
            } catch (e) {}
          }));
        };

        await fetchBatch(batch1);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Non-blocking cooldown
        await fetchBatch(batch2);
      }

      // 2. CRYPTO MATRIX PIPELINE (CoinGecko Batch)
      const ids = CRYPTO_REGISTRY.map(c => c.id).join(',');
      const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
      const cgRes = await fetch(cgUrl, COINGECKO_KEY ? { headers: { 'x-cg-pro-api-key': COINGECKO_KEY } } : {});
      const cgData = await cgRes.json();
      
      CRYPTO_REGISTRY.forEach(coin => {
        if (cgData[coin.id]) {
          results[coin.ticker] = { 
            price: cgData[coin.id].usd, 
            change: cgData[coin.id].usd_24h_change
          };
        }
      });

      setMarketPrices(results);
    } catch (e) {
      console.error('Market Pipeline Error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [marketPrices]);

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

        // Rolling Streak Integrity Check
        const today = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        
        if (data.lastClaimedTimestamp && data.lastClaimedTimestamp !== today && data.lastClaimedTimestamp !== yesterdayStr) {
          await updateDoc(docRef, { currentStreakCount: 0 });
        }
      } else {
        await setDoc(docRef, {
          cashBalance: 50000,
          holdings: [],
          currentStreakCount: 0,
          lastClaimedTimestamp: '',
          updatedAt: serverTimestamp()
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Streak Pulsating Effect
  useEffect(() => {
    if (rewardModalVisible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [rewardModalVisible]);

  /**
   * CALCULATED METRICS
   */
  const { netWorth, profitLoss, plPct } = useMemo(() => {
    let marketVal = 0;
    let costBasis = 0;
    holdings.forEach(h => {
      const price = marketPrices[h.ticker]?.price || h.avgPrice;
      marketVal += h.quantity * price;
      costBasis += h.quantity * h.avgPrice;
    });
    const total = cashBalance + marketVal;
    const pl = marketVal - costBasis;
    const pct = costBasis > 0 ? (pl / costBasis) * 100 : 0;
    return { netWorth: total, profitLoss: pl, plPct: pct };
  }, [holdings, marketPrices, cashBalance]);

  const filteredMarket = useMemo(() => {
    const registry = [...STOCK_REGISTRY.map(s => ({...s, type: 'stock'})), ...CRYPTO_REGISTRY.map(c => ({...c, type: 'crypto'}))];
    if (!searchQuery) return registry;
    const q = searchQuery.toUpperCase();
    return registry.filter(a => a.ticker.includes(q) || a.name.toUpperCase().includes(q));
  }, [searchQuery]);

  /**
   * REWARD LOGIC: 7-DAY ROLLING STREAK
   */
  const handleClaimReward = async () => {
    if (!user?.uid) return;
    const today = new Date().toDateString();
    if (lastClaimed === today) return Alert.alert('Already Claimed', 'Return tomorrow for the next drop.');

    const docRef = doc(db, 'portfolio_v2', user.uid);
    let nextStreak = streakCount + 1;
    if (nextStreak > 7) nextStreak = 1;

    // Progression Matrix
    const cashRewards = [5000, 10000, 15000, 20000, 25000, 30000, 100000];
    const rewardCash = cashRewards[nextStreak - 1];
    let newHoldings = [...holdings];

    // Asset Drop (Jackpot Day 7 vs Standard)
    const assetTicker = nextStreak === 7 ? 'NVDA' : 'AAPL';
    const assetQty = nextStreak === 7 ? 2 : 1;
    const livePrice = marketPrices[assetTicker]?.price || 150;
    
    const idx = newHoldings.findIndex(h => h.ticker === assetTicker);
    if (idx > -1) {
      const h = newHoldings[idx];
      newHoldings[idx] = { ...h, quantity: h.quantity + assetQty, avgPrice: ((h.avgPrice * h.quantity) + (livePrice * assetQty)) / (h.quantity + assetQty) };
    } else {
      newHoldings.push({ ticker: assetTicker, quantity: assetQty, avgPrice: livePrice });
    }

    try {
      await updateDoc(docRef, {
        cashBalance: cashBalance + rewardCash,
        currentStreakCount: nextStreak,
        lastClaimedTimestamp: today,
        holdings: newHoldings,
        updatedAt: serverTimestamp()
      });
      setRewardModalVisible(false);
      Alert.alert('Reward Claimed! 🔥', `Day ${nextStreak}: +$${rewardCash.toLocaleString()} & ${assetQty}x ${assetTicker} added.`);
    } catch (e) {
      Alert.alert('Error', 'Failed to claim reward.');
    }
  };

  /**
   * TRADE ENGINE
   */
  const executeTrade = async (isBuy: boolean) => {
    if (!user?.uid || !selectedAsset) return;
    const qty = parseFloat(tradeQuantity);
    if (isNaN(qty) || qty <= 0) return Alert.alert('Invalid Quantity');

    const price = marketPrices[selectedAsset.ticker]?.price || 0;
    if (price <= 0) return Alert.alert('Error', 'Price data unavailable.');

    const totalVal = qty * price;
    const docRef = doc(db, 'portfolio_v2', user.uid);
    let newCash = cashBalance;
    let newHoldings = [...holdings];
    const idx = newHoldings.findIndex(h => h.ticker === selectedAsset.ticker);

    if (isBuy) {
      if (totalVal > cashBalance) return Alert.alert('Insufficient Funds');
      newCash -= totalVal;
      if (idx > -1) {
        const h = newHoldings[idx];
        newHoldings[idx] = { ...h, quantity: h.quantity + qty, avgPrice: ((h.avgPrice * h.quantity) + totalVal) / (h.quantity + qty) };
      } else {
        newHoldings.push({ ticker: selectedAsset.ticker, quantity: qty, avgPrice: price });
      }
    } else {
      if (idx === -1 || newHoldings[idx].quantity < qty) return Alert.alert('Insufficient Shares');
      newCash += totalVal;
      const h = newHoldings[idx];
      if (h.quantity - qty <= 0) newHoldings.splice(idx, 1);
      else newHoldings[idx] = { ...h, quantity: h.quantity - qty };
    }

    try {
      await updateDoc(docRef, { cashBalance: newCash, holdings: newHoldings, updatedAt: serverTimestamp() });
      setSelectedAsset(null);
      setTradeQuantity('1');
    } catch (e) {
      Alert.alert('Transaction Failed');
    }
  };

  // FLATLIST RENDERERS
  const renderMarketItem = ({ item }: { item: any }) => {
    const live = marketPrices[item.ticker];
    return (
      <Pressable style={styles.assetCard} onPress={() => setSelectedAsset(item)}>
        <AssetRowIcon ticker={item.ticker} domain={item.domain} color={item.color} name={item.name} />
        <View style={styles.assetMain}>
          <Text style={styles.assetTicker}>{item.ticker}</Text>
          <Text style={styles.assetName} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={styles.assetRight}>
          <Text style={styles.assetPrice}>{live ? `$${live.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '---'}</Text>
          <Text style={[styles.assetDelta, { color: (live?.change || 0) >= 0 ? '#34C759' : '#FF3B30' }]}>
            {(live?.change || 0).toFixed(2)}%
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderPositionItem = ({ item }: { item: any }) => {
    const live = marketPrices[item.ticker]?.price || item.avgPrice;
    const isUp = live >= item.avgPrice;
    return (
      <View style={styles.holdingCard}>
        <View style={styles.holdingHeader}>
          <Text style={styles.holdingTicker}>{item.ticker}</Text>
          <View style={[styles.plBadge, { backgroundColor: isUp ? '#E8F5E9' : '#FFEBEE' }]}>
            <Text style={[styles.plBadgeText, { color: isUp ? '#2E7D32' : '#C62828' }]}>
              {isUp ? '▲' : '▼'} {Math.abs(((live - item.avgPrice) / item.avgPrice) * 100).toFixed(2)}%
            </Text>
          </View>
        </View>
        <View style={styles.holdingGrid}>
          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>SHARES</Text>
            <Text style={styles.gridValue}>{item.quantity.toFixed(4)}</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>AVG COST</Text>
            <Text style={styles.gridValue}>${item.avgPrice.toLocaleString()}</Text>
          </View>
          <View style={[styles.gridCell, { alignItems: 'flex-end' }]}>
            <Text style={styles.gridLabel}>VALUE</Text>
            <Text style={styles.gridValue}>${(item.quantity * live).toLocaleString()}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.fullCenter}><ActivityIndicator size="large" color="#CE82FF" /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ACTION HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Quant Hub</Text>
        <Pressable onPress={() => setRewardModalVisible(true)} style={styles.streakBtn}>
          <Text style={styles.streakEmoji}>📅</Text>
          <Text style={styles.streakBtnText}>{streakCount} Day Streak</Text>
        </Pressable>
      </View>

      {/* FIXED BALANCE CARD */}
      <View style={styles.balanceWrapper}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>TOTAL NET WORTH</Text>
          <Text style={styles.balanceAmount}>${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          <View style={styles.balanceSubRow}>
            <View style={[styles.plChip, { backgroundColor: profitLoss >= 0 ? '#E8F5E9' : '#FFEBEE' }]}>
              <Text style={[styles.plChipText, { color: profitLoss >= 0 ? '#2E7D32' : '#C62828' }]}>
                {profitLoss >= 0 ? '▲' : '▼'} {Math.abs(plPct).toFixed(2)}%
              </Text>
            </View>
            <Text style={styles.cashLabel}>CASH: ${cashBalance.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* SEGMENTED TAB DECK */}
      <View style={styles.tabDeck}>
        <Pressable onPress={() => setActiveTab('market')} style={[styles.tabBtn, activeTab === 'market' && styles.tabBtnActive]}>
          <Text style={[styles.tabText, activeTab === 'market' && styles.tabTextActive]}>Market Assets</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('positions')} style={[styles.tabBtn, activeTab === 'positions' && styles.tabBtnActive]}>
          <Text style={[styles.tabText, activeTab === 'positions' && styles.tabTextActive]}>My Positions</Text>
        </Pressable>
      </View>

      {/* ASSET SCROLL ENGINE (FLATLIST OPTIMIZED) */}
      {activeTab === 'market' ? (
        <View style={styles.flexOne}>
          <View style={styles.searchBox}>
            <TextInput 
              style={styles.searchField}
              placeholder="Search 100+ high profile assets..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
          </View>
          <FlatList
            data={filteredMarket}
            renderItem={renderMarketItem}
            keyExtractor={item => item.ticker}
            contentContainerStyle={styles.listPadding}
            showsVerticalScrollIndicator={false}
            maxToRenderPerBatch={10}
            initialNumToRender={8}
            windowSize={5}
            removeClippedSubviews={true}
            onRefresh={() => { setRefreshing(true); fetchMarketData(); }}
            refreshing={refreshing}
          />
        </View>
      ) : (
        <FlatList
          data={holdings}
          renderItem={renderPositionItem}
          keyExtractor={(item, index) => `${item.ticker}-${index}`}
          contentContainerStyle={styles.listPadding}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No active positions detected.</Text>
              <Pressable onPress={() => setActiveTab('market')} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Market Access</Text>
              </Pressable>
            </View>
          }
        />
      )}

      {/* STREAK REWARD MODAL */}
      <Modal visible={rewardModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.rewardModal}>
            <Text style={styles.rewardSub}>REWARD SEQUENCE</Text>
            <Text style={styles.rewardTitle}>7-Day Rolling Streak</Text>
            
            <View style={styles.streakGrid}>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const isDone = d <= streakCount;
                const isNext = d === streakCount + 1 && lastClaimed !== new Date().toDateString();
                return (
                  <View key={d} style={styles.streakNode}>
                    <Animated.View style={[
                      styles.nodeBadge, 
                      isDone && styles.nodeBadgeDone,
                      isNext && { transform: [{ scale: pulseAnim }], borderColor: '#CE82FF', borderWidth: 2 }
                    ]}>
                      <Text style={styles.nodeIcon}>{isDone ? '✔️' : d === 7 ? '🎁' : '💰'}</Text>
                    </Animated.View>
                    <Text style={[styles.nodeLabel, isNext && { color: '#CE82FF' }]}>Day {d}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.nextRewardBox}>
              <Text style={styles.nextRewardLabel}>NEXT ALLOCATION:</Text>
              <Text style={styles.nextRewardVal}>+${((streakCount + 1) * 10000).toLocaleString()} Simulation Cash</Text>
            </View>

            <Pressable 
              style={[styles.claimBtn, lastClaimed === new Date().toDateString() && styles.claimBtnOff]} 
              onPress={handleClaimReward}
              disabled={lastClaimed === new Date().toDateString()}
            >
              <Text style={styles.claimBtnText}>
                {lastClaimed === new Date().toDateString() ? 'Claimed' : 'Claim Daily Drop'}
              </Text>
            </Pressable>
            
            <Pressable onPress={() => setRewardModalVisible(false)} style={styles.rewardClose}>
              <Text style={styles.rewardCloseText}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* TRADE MODAL */}
      <Modal visible={!!selectedAsset} transparent animationType="slide">
        <View style={styles.tradeBackdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.tradeSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{selectedAsset?.ticker}</Text>
              <Pressable onPress={() => setSelectedAsset(null)} style={styles.sheetClose}><Text>✕</Text></Pressable>
            </View>
            <Text style={styles.sheetRate}>Live Rate: ${marketPrices[selectedAsset?.ticker]?.price?.toLocaleString() || '---'}</Text>
            
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>UNITS</Text>
              <TextInput 
                style={styles.inputField} 
                keyboardType="decimal-pad" 
                value={tradeQuantity} 
                onChangeText={setTradeQuantity}
              />
            </View>

            <View style={styles.btnRow}>
              <Pressable onPress={() => executeTrade(true)} style={[styles.execBtn, { backgroundColor: '#34C759' }]}>
                <Text style={styles.execBtnText}>BUY</Text>
              </Pressable>
              <Pressable onPress={() => executeTrade(false)} style={[styles.execBtn, { backgroundColor: '#FF3B30' }]}>
                <Text style={styles.execBtnText}>SELL</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  fullCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  flexOne: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  streakBtn: { backgroundColor: '#F8F1FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#CE82FF' },
  streakEmoji: { fontSize: 16, marginRight: 4 },
  streakBtnText: { fontSize: 12, fontWeight: '800', color: '#CE82FF' },
  balanceWrapper: { paddingHorizontal: 20, marginBottom: 20 },
  balanceCard: { backgroundColor: '#FFF', padding: 25, borderRadius: 24, borderWidth: 2, borderColor: '#CE82FF', shadowColor: '#CE82FF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 4 },
  balanceLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1 },
  balanceAmount: { fontSize: 34, fontWeight: '900', color: '#0F172A', marginVertical: 8 },
  balanceSubRow: { flexDirection: 'row', alignItems: 'center' },
  plChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  plChipText: { fontSize: 11, fontWeight: '900' },
  cashLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginLeft: 12 },
  tabDeck: { flexDirection: 'row', backgroundColor: '#F8F9FA', marginHorizontal: 20, borderRadius: 16, padding: 4, marginBottom: 15 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  tabTextActive: { color: '#0F172A' },
  searchBox: { marginHorizontal: 20, marginBottom: 15, height: 48, backgroundColor: '#F1F5F9', borderRadius: 14, paddingHorizontal: 15, justifyContent: 'center' },
  searchField: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  listPadding: { paddingHorizontal: 20, paddingBottom: 40 },
  assetCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  logoFrame: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: '#F8F9FA' },
  logoImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  avatarBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 11, fontWeight: '900' },
  assetMain: { flex: 1, marginLeft: 15 },
  assetTicker: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
  assetName: { fontSize: 12, color: '#64748B', marginTop: 2 },
  assetRight: { alignItems: 'flex-end' },
  assetPrice: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  assetDelta: { fontSize: 12, fontWeight: '800', marginTop: 3 },
  holdingCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 24, marginBottom: 15, borderWidth: 1, borderColor: '#F1F5F9' },
  holdingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  holdingTicker: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  plBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  plBadgeText: { fontSize: 11, fontWeight: '900' },
  holdingGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  gridCell: { flex: 1 },
  gridLabel: { fontSize: 9, fontWeight: '900', color: '#94A3B8', marginBottom: 4 },
  gridValue: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  emptyState: { alignItems: 'center', padding: 50 },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '700', marginBottom: 20 },
  emptyBtn: { backgroundColor: '#CE82FF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  emptyBtnText: { color: '#FFF', fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  rewardModal: { width: SCREEN_WIDTH * 0.85, backgroundColor: '#FFF', borderRadius: 32, padding: 25, alignItems: 'center', borderWidth: 2, borderColor: '#CE82FF' },
  rewardSub: { fontSize: 10, fontWeight: '900', color: '#CE82FF', letterSpacing: 2, marginBottom: 10 },
  rewardTitle: { fontSize: 24, fontWeight: '900', color: '#111', marginBottom: 30 },
  streakGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 30 },
  streakNode: { alignItems: 'center', width: 60 },
  nodeBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  nodeBadgeDone: { backgroundColor: '#CE82FF', borderColor: '#CE82FF' },
  nodeIcon: { fontSize: 16 },
  nodeLabel: { fontSize: 9, fontWeight: '900', color: '#94A3B8', marginTop: 6 },
  nextRewardBox: { width: '100%', backgroundColor: '#F8F1FF', padding: 20, borderRadius: 16, marginBottom: 30, alignItems: 'center' },
  nextRewardLabel: { fontSize: 10, fontWeight: '900', color: '#CE82FF', marginBottom: 5 },
  nextRewardVal: { fontSize: 18, fontWeight: '900', color: '#CE82FF' },
  claimBtn: { width: '100%', backgroundColor: '#0F172A', paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  claimBtnOff: { opacity: 0.5 },
  claimBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  rewardClose: { marginTop: 15, padding: 10 },
  rewardCloseText: { color: '#94A3B8', fontWeight: '800', fontSize: 13 },
  tradeBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  tradeSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 30, paddingBottom: 40 },
  sheetHandle: { width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sheetTitle: { fontSize: 28, fontWeight: '900' },
  sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  sheetRate: { fontSize: 14, color: '#64748B', marginBottom: 25 },
  inputWrap: { marginBottom: 30 },
  inputLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1, marginBottom: 10 },
  inputField: { fontSize: 36, fontWeight: '900', borderBottomWidth: 2, borderBottomColor: '#CE82FF', paddingVertical: 5 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between' },
  execBtn: { flex: 0.48, paddingVertical: 18, borderRadius: 30, alignItems: 'center' },
  execBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});
