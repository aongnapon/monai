import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  History,
  CreditCard,
  Plus,
  Minus
} from 'lucide-react-native';

import { useAuth } from '@/src/context/AuthContext';
import { getFirestore, doc, setDoc, collection, addDoc, onSnapshot, serverTimestamp } from '@react-native-firebase/firestore';

// Task 1: Stability Guard
LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout"']);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * PRODUCTION DATA: Institutional Baseline Assets
 */
const MARKET_ASSETS = [
  { ticker: 'AAPL', name: 'Apple Inc.', type: 'stock', domain: 'apple.com', price: 185.92 },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', type: 'stock', domain: 'nvidia.com', price: 822.79 },
  { ticker: 'TSLA', name: 'Tesla, Inc.', type: 'stock', domain: 'tesla.com', price: 175.22 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', type: 'stock', domain: 'microsoft.com', price: 415.50 },
  { ticker: 'AMZN', name: 'Amazon.com', type: 'stock', domain: 'amazon.com', price: 178.22 },
  { ticker: 'SPY', name: 'S&P 500 ETF', type: 'stock', domain: 'spglobal.com', price: 512.85 },
  { ticker: 'QQQ', name: 'Nasdaq 100', type: 'stock', domain: 'nasdaq.com', price: 438.60 },
  { ticker: 'BTC', name: 'Bitcoin', type: 'crypto', price: 68420.50 },
  { ticker: 'ETH', name: 'Ethereum', type: 'crypto', price: 3450.12 },
  { ticker: 'SOL', name: 'Solana', type: 'crypto', price: 145.80 },
  { ticker: 'GOLD', name: 'Gold Bullion', type: 'commodity', emoji: '📀', price: 2160.40 },
  { ticker: 'OIL', name: 'Crude Oil', type: 'commodity', emoji: '🛢️', price: 78.45 },
  { ticker: 'META', name: 'Meta Platforms', type: 'stock', domain: 'meta.com', price: 490.22 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', domain: 'google.com', price: 142.65 },
  { ticker: 'NFLX', name: 'Netflix, Inc.', type: 'stock', domain: 'netflix.com', price: 605.88 },
];

/**
 * COMPONENT: Institutional Asset Logo Engine
 */
const AssetLogo = ({ ticker, type, domain, emoji }: { ticker: string; type: string; domain?: string; emoji?: string }) => {
  const [error, setError] = useState(false);

  const getSource = () => {
    if (type === 'stock' && domain) return `https://logo.clearbit.com/${domain}`;
    if (type === 'crypto') return `https://cryptoicons.org/api/icon/${ticker.toLowerCase()}/200`;
    return null;
  };

  const uri = getSource();

  if (error || !uri || type === 'commodity') {
    return (
      <View style={[styles.logoFallback, { backgroundColor: '#F3F4F6' }]}>
        <Text style={styles.fallbackEmoji}>{emoji || '📈'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.logoContainer}>
      <Image 
        source={{ uri }} 
        style={styles.logoImage} 
        onError={() => setError(true)}
      />
    </View>
  );
};

export default function PortfolioScreen() {
  const { user } = useAuth();
  const db = getFirestore();

  // State Management
  const [cashBalance, setCashBalance] = useState(100000.00);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [tradeAmount, setTradeAmount] = useState('');
  const [isBuying, setIsBuying] = useState(true);

  /**
   * DATA PERSISTENCE: Firestore Sync
   */
  useEffect(() => {
    if (!user?.uid) return;

    const portfolioRef = doc(db, 'user_portfolios', user.uid);
    const unsubscribe = onSnapshot(portfolioRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCashBalance(data.cashBalance ?? 100000.00);
        setHoldings(data.holdings ?? []);
      } else {
        // Initial setup for new user
        setDoc(portfolioRef, { cashBalance: 100000.00, holdings: [], updatedAt: serverTimestamp() });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const totalMarketValue = useMemo(() => {
    return holdings.reduce((sum, hold) => {
      const asset = MARKET_ASSETS.find(a => a.ticker === hold.ticker);
      return sum + (hold.quantity * (asset?.price || 0));
    }, 0);
  }, [holdings]);

  const netWorth = cashBalance + totalMarketValue;
  const totalReturn = netWorth - 100000;
  const returnPct = (totalReturn / 100000) * 100;

  /**
   * TRANSACTION ENGINE: Executing Mock Trades
   */
  const handleTrade = async () => {
    if (!user?.uid || !selectedAsset) return;

    const quantity = parseFloat(tradeAmount);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid amount to trade.');
      return;
    }

    const totalCost = quantity * selectedAsset.price;
    const portfolioRef = doc(db, 'user_portfolios', user.uid);
    const transCollection = collection(portfolioRef, 'transactions');

    let updatedCash = cashBalance;
    let updatedHoldings = [...holdings];
    const existingIndex = updatedHoldings.findIndex(h => h.ticker === selectedAsset.ticker);

    if (isBuying) {
      if (totalCost > cashBalance) {
        Alert.alert('Insufficient Funds', 'You do not have enough mock cash for this trade.');
        return;
      }
      updatedCash -= totalCost;
      if (existingIndex > -1) {
        const h = updatedHoldings[existingIndex];
        const newQty = h.quantity + quantity;
        const newBasis = ((h.avgPrice * h.quantity) + totalCost) / newQty;
        updatedHoldings[existingIndex] = { ...h, quantity: newQty, avgPrice: newBasis };
      } else {
        updatedHoldings.push({ ticker: selectedAsset.ticker, quantity, avgPrice: selectedAsset.price });
      }
    } else {
      // Selling
      if (existingIndex === -1 || updatedHoldings[existingIndex].quantity < quantity) {
        Alert.alert('Insufficient Shares', 'You do not own enough of this asset to sell.');
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
      // Atomic persist to Firestore
      await setDoc(portfolioRef, { 
        cashBalance: updatedCash, 
        holdings: updatedHoldings, 
        updatedAt: serverTimestamp() 
      }, { merge: true });

      await addDoc(transCollection, {
        ticker: selectedAsset.ticker,
        type: isBuying ? 'BUY' : 'SELL',
        quantity,
        price: selectedAsset.price,
        timestamp: serverTimestamp(),
      });

      setSelectedAsset(null);
      setTradeAmount('');
      Alert.alert('Success', `Successfully ${isBuying ? 'purchased' : 'sold'} ${quantity} units of ${selectedAsset.ticker}.`);
    } catch (e) {
      Alert.alert('System Error', 'Failed to record transaction.');
    }
  };

  const renderMarketItem = ({ item }: { item: any }) => {
    const holding = holdings.find(h => h.ticker === item.ticker);
    return (
      <Pressable 
        onPress={() => setSelectedAsset(item)}
        style={({ pressed }) => [styles.assetRow, pressed && { opacity: 0.7 }]}
      >
        <AssetLogo ticker={item.ticker} type={item.type} domain={item.domain} emoji={item.emoji} />
        <View style={styles.assetInfo}>
          <Text style={styles.assetTicker}>{item.ticker}</Text>
          <Text style={styles.assetName}>{item.name}</Text>
        </View>
        <View style={styles.assetMetrics}>
          <Text style={styles.assetPrice}>${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          {holding ? (
            <Text style={styles.assetOwned}>{holding.quantity.toFixed(2)} owned</Text>
          ) : (
            <Text style={styles.assetType}>{item.type.toUpperCase()}</Text>
          )}
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
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
            <Text style={styles.totalReturnAmt}>
              {totalReturn >= 0 ? 'Profit' : 'Loss'} of ${Math.abs(totalReturn).toLocaleString()}
            </Text>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cashRow}>
            <View style={styles.cashLabelGroup}>
              <Wallet size={16} color="#64748B" />
              <Text style={styles.cashLabel}>Mock Cash Balance</Text>
            </View>
            <Text style={styles.cashValue}>${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>

        {/* MARKET ASSETS LIST */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MARKET QUOTES</Text>
          <Text style={styles.sectionAction}>View All</Text>
        </View>

        {MARKET_ASSETS.map((asset) => (
          <React.Fragment key={asset.ticker}>
            {renderMarketItem({ item: asset })}
          </React.Fragment>
        ))}

        <View style={styles.infoFooter}>
          <Info size={14} color="#94A3B8" />
          <Text style={styles.infoFooterText}>Prices are simulated for training purposes. This is not a real financial account.</Text>
        </View>
      </ScrollView>

      {/* QUICK TRADE MODAL */}
      <Modal visible={!!selectedAsset} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.tradeContainer}>
            <View style={styles.tradeHeader}>
              <View style={styles.tradeAssetInfo}>
                <AssetLogo ticker={selectedAsset?.ticker} type={selectedAsset?.type} domain={selectedAsset?.domain} emoji={selectedAsset?.emoji} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.tradeTicker}>{selectedAsset?.ticker}</Text>
                  <Text style={styles.tradePrice}>${selectedAsset?.price.toLocaleString()}</Text>
                </View>
              </View>
              <Pressable onPress={() => { setSelectedAsset(null); setTradeAmount(''); }} style={styles.closeBtn}>
                <X size={24} color="#1E293B" />
              </Pressable>
            </View>

            <View style={styles.tradeTypeToggle}>
              <Pressable 
                onPress={() => setIsBuying(true)} 
                style={[styles.toggleBtn, isBuying && { backgroundColor: '#34C759', borderColor: '#34C759' }]}
              >
                <Text style={[styles.toggleText, isBuying && { color: '#FFF' }]}>BUY</Text>
              </Pressable>
              <Pressable 
                onPress={() => setIsBuying(false)} 
                style={[styles.toggleBtn, !isBuying && { backgroundColor: '#FF3B30', borderColor: '#FF3B30' }]}
              >
                <Text style={[styles.toggleText, !isBuying && { color: '#FFF' }]}>SELL</Text>
              </Pressable>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Enter Units</Text>
              <TextInput
                style={styles.tradeInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={tradeAmount}
                onChangeText={setTradeAmount}
                placeholderTextColor="#94A3B8"
              />
              <View style={styles.inputEstimate}>
                <Text style={styles.estLabel}>ESTIMATED {isBuying ? 'COST' : 'PROCEEDS'}</Text>
                <Text style={styles.estValue}>
                  ${(parseFloat(tradeAmount || '0') * (selectedAsset?.price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            <Pressable 
              onPress={handleTrade}
              style={[styles.executeBtn, { backgroundColor: isBuying ? '#111827' : '#111827' }]}
            >
              <Text style={styles.executeBtnText}>Execute Transaction</Text>
              <Zap size={18} color="#FFF" fill="#FFF" style={{ marginLeft: 8 }} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0EA5E9',
    marginLeft: 4,
  },
  wealthCard: {
    padding: 24,
    borderRadius: 28,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF',
    opacity: 0.7,
  },
  netWorthLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  netWorthValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 16,
  },
  returnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  returnChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  returnPct: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 2,
  },
  totalReturnAmt: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginBottom: 20,
  },
  cashRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cashLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cashLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 8,
  },
  cashValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.5,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  logoFallback: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackEmoji: {
    fontSize: 20,
  },
  assetInfo: {
    flex: 1,
    marginLeft: 14,
  },
  assetTicker: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  assetName: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  assetMetrics: {
    alignItems: 'flex-end',
    marginRight: 10,
  },
  assetPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  assetType: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
  },
  assetOwned: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6366F1',
  },
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  infoFooterText: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 10,
    lineHeight: 16,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  tradeContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  tradeAssetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tradeTicker: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  tradePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tradeTypeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  inputContainer: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 12,
  },
  tradeInput: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0F172A',
    padding: 0,
    marginBottom: 16,
  },
  inputEstimate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  estLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
  },
  estValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  executeBtn: {
    width: '100%',
    paddingVertical: 20,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  executeBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
});
