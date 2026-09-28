import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_BASE_URL = 'http://119.59.102.161:3100/api';

type ClaimableItem = { order_item_id: number; product_name: string; quantity: number; order_id: number; created_at: string };
type Claim = { id: number; product_name: string; reason: string; stage_name: string; stage_order: number; created_at: string };
type ClaimDetail = Claim & { description: string; allStages: { id: number; name: string; step_order: number }[]; currentStage: { step_order: number } };

const REASONS = ['จอไม่แสดงผล / ไม่ติด', 'พัดลมมีเสียงดัง', 'เครื่องรีสตาร์ทเอง', 'อื่นๆ'];

export default function ClaimScreen() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimableItems, setClaimableItems] = useState<ClaimableItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState<ClaimableItem | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [selectedDetail, setSelectedDetail] = useState<ClaimDetail | null>(null);

  const userId = Platform.OS === 'web' ? window.localStorage.getItem('userId') : null;

  const fetchAll = async () => {
    if (!userId) { router.replace('/login'); return; }
    try {
      setLoading(true);
      const [claimsRes, itemsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/claims/${userId}`),
        fetch(`${API_BASE_URL}/orders/${userId}/claimable`),
      ]);
      if (claimsRes.ok) setClaims(await claimsRes.json());
      if (itemsRes.ok) setClaimableItems(await itemsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const openDetail = async (claimId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/claims/detail/${claimId}`);
      if (res.ok) setSelectedDetail(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleSubmitClaim = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_item_id: selectedItem.order_item_id,
          user_id: userId,
          reason,
          description,
        }),
      });
      if (res.ok) {
        setView('list');
        setSelectedItem(null);
        setDescription('');
        fetchAll();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><View style={styles.centerContainer}><ActivityIndicator size="large" color="#f43f5e" /></View></SafeAreaView>;
  }

  // ---------- หน้าฟอร์มยื่นเคลม ----------
  if (view === 'form') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f1722" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setView('list'); setSelectedItem(null); }}><Text style={styles.backText}>{'< ย้อนกลับ'}</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Request Claim</Text>
        </View>

        <ScrollView contentContainerStyle={styles.formPadding}>
          {!selectedItem ? (
            <>
              <Text style={styles.sectionLabel}>เลือกสินค้าที่จะเคลม</Text>
              {claimableItems.length === 0 ? (
                <Text style={styles.emptyText}>คุณยังไม่มีสินค้าที่ซื้อไว้ให้เคลม</Text>
              ) : claimableItems.map(item => (
                <TouchableOpacity key={item.order_item_id} style={styles.itemPickCard} onPress={() => setSelectedItem(item)}>
                  <Text style={styles.itemPickName}>{item.product_name}</Text>
                  <Text style={styles.itemPickMeta}>Order #{item.order_id} · {new Date(item.created_at).toLocaleDateString('th-TH')}</Text>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              <View style={styles.selectedItemCard}>
                <Text style={styles.itemPickName}>{selectedItem.product_name}</Text>
                <Text style={styles.itemPickMeta}>Order #{selectedItem.order_id}</Text>
              </View>

              <Text style={styles.sectionLabel}>อาการที่พบ</Text>
              <View style={styles.reasonGroup}>
                {REASONS.map(r => (
                  <TouchableOpacity key={r} style={[styles.reasonChip, reason === r && styles.reasonChipActive]} onPress={() => setReason(r)}>
                    <Text style={[styles.reasonChipText, reason === r && styles.reasonChipTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>รายละเอียดเพิ่มเติม</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                placeholder="อธิบายอาการที่พบเพิ่มเติม..."
                placeholderTextColor="#4c5b6a"
              />

              <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmitClaim} disabled={submitting}>
                <Text style={styles.submitBtnText}>{submitting ? 'กำลังส่ง...' : 'ส่งเรื่องเคลม'}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------- หน้าลิสต์เคลม ----------
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1722" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Warranty / Claim</Text>
          <Text style={styles.headerSubtitle}>ประวัติการเคลมของคุณ</Text>
        </View>
        <TouchableOpacity style={styles.newClaimBtn} onPress={() => setView('form')}>
          <Text style={styles.newClaimBtnText}>+ เคลมใหม่</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listPadding}>
        {claims.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyText}>ยังไม่มีประวัติการเคลม</Text>
          </View>
        ) : claims.map(c => (
          <TouchableOpacity key={c.id} style={styles.claimCard} onPress={() => openDetail(c.id)}>
            <View style={styles.claimCardHeader}>
              <Text style={styles.claimProductName} numberOfLines={1}>{c.product_name}</Text>
              <View style={styles.stageBadge}>
                <Text style={styles.stageBadgeText}>{c.stage_name}</Text>
              </View>
            </View>
            <Text style={styles.claimReason}>{c.reason}</Text>
            <Text style={styles.claimDate}>ส่งเรื่องเมื่อ {new Date(c.created_at).toLocaleDateString('th-TH')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Modal Timeline */}
      {selectedDetail && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDetail.product_name}</Text>
              <TouchableOpacity onPress={() => setSelectedDetail(null)}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
            </View>
            <Text style={styles.claimReason}>{selectedDetail.reason}</Text>
            {!!selectedDetail.description && <Text style={styles.descText}>{selectedDetail.description}</Text>}

            <View style={{ marginTop: 16 }}>
              {selectedDetail.allStages.map((stage, i) => {
                const isDone = stage.step_order <= selectedDetail.currentStage.step_order;
                const isCurrent = stage.step_order === selectedDetail.currentStage.step_order;
                return (
                  <View key={stage.id} style={styles.timelineRow}>
                    <View style={styles.timelineDotCol}>
                      <View style={[styles.timelineDot, isDone && styles.timelineDotDone, isCurrent && styles.timelineDotCurrent]} />
                      {i < selectedDetail.allStages.length - 1 && <View style={[styles.timelineLine, isDone && styles.timelineLineDone]} />}
                    </View>
                    <Text style={[styles.timelineLabel, isCurrent && styles.timelineLabelCurrent]}>{stage.name}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e141b' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'web' ? 30 : 20, backgroundColor: '#0f1722', borderBottomWidth: 1, borderBottomColor: '#1e2d3e' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  headerSubtitle: { fontSize: 12, color: '#4c5b6a', marginTop: 2 },
  backText: { color: '#66c0f4', fontSize: 14, fontWeight: '700', marginBottom: 8 },

  newClaimBtn: { backgroundColor: '#f43f5e', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  newClaimBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  listPadding: { padding: 16 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#4c5b6a', textAlign: 'center' },

  claimCard: { backgroundColor: '#17202d', borderWidth: 1, borderColor: '#2a475e', borderRadius: 12, padding: 14, marginBottom: 10 },
  claimCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  claimProductName: { fontSize: 14, fontWeight: '700', color: '#ffffff', flex: 1, marginRight: 8 },
  stageBadge: { backgroundColor: 'rgba(102,192,244,0.15)', borderWidth: 1, borderColor: '#66c0f4', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  stageBadgeText: { fontSize: 11, fontWeight: '700', color: '#66c0f4' },
  claimReason: { fontSize: 13, color: '#c7d5e0', marginBottom: 4 },
  claimDate: { fontSize: 11, color: '#4c5b6a' },

  formPadding: { padding: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#4c5b6a', textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },

  itemPickCard: { backgroundColor: '#17202d', borderWidth: 1, borderColor: '#2a475e', borderRadius: 12, padding: 14, marginBottom: 10 },
  itemPickName: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  itemPickMeta: { fontSize: 11, color: '#4c5b6a', marginTop: 4 },

  selectedItemCard: { backgroundColor: '#17202d', borderWidth: 1, borderColor: '#f43f5e', borderRadius: 12, padding: 14, marginBottom: 20 },

  reasonGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  reasonChip: { borderWidth: 1, borderColor: '#2a475e', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  reasonChipActive: { backgroundColor: '#f43f5e', borderColor: '#f43f5e' },
  reasonChipText: { fontSize: 12, color: '#c7d5e0' },
  reasonChipTextActive: { color: '#fff', fontWeight: '700' },

  textArea: { backgroundColor: '#17202d', borderWidth: 1, borderColor: '#2a475e', borderRadius: 10, padding: 12, color: '#c7d5e0', fontSize: 13, minHeight: 90, textAlignVertical: 'top', marginBottom: 20 },
  submitBtn: { backgroundColor: '#f43f5e', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#17202d', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: '#2a475e' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#ffffff', flex: 1 },
  closeBtn: { fontSize: 18, color: '#4c5b6a', padding: 4 },
  descText: { fontSize: 12, color: '#4c5b6a', marginBottom: 6 },

  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineDotCol: { alignItems: 'center', width: 24 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#2a475e', marginTop: 3 },
  timelineDotDone: { backgroundColor: '#a4d007' },
  timelineDotCurrent: { backgroundColor: '#66c0f4' },
  timelineLine: { width: 2, flex: 1, minHeight: 24, backgroundColor: '#2a475e' },
  timelineLineDone: { backgroundColor: '#a4d007' },
  timelineLabel: { fontSize: 13, color: '#4c5b6a', marginLeft: 10, paddingBottom: 20 },
  timelineLabelCurrent: { color: '#ffffff', fontWeight: '700' },
});
