import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_BASE_URL = 'http://119.59.102.161:3100/api';

type Stage = { id: number; name: string; step_order: number };
type Claim = { id: number; username: string; product_name: string; reason: string; stage_name: string; stage_order: number; created_at: string; current_stage_id: number };

export default function ClaimAdminScreen() {
  const [tab, setTab] = useState<'claims' | 'stages'>('claims');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStageName, setNewStageName] = useState('');

  const fetchAll = async () => {
    const role = Platform.OS === 'web' ? window.localStorage.getItem('role') : null;
    if (role !== 'admin') { router.replace('/'); return; }

    try {
      setLoading(true);
      const [claimsRes, stagesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/claims`),
        fetch(`${API_BASE_URL}/claim-stages`),
      ]);
      if (claimsRes.ok) setClaims(await claimsRes.json());
      if (stagesRes.ok) setStages(await stagesRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const advanceStage = async (claim: Claim, direction: 1 | -1) => {
    const idx = stages.findIndex(s => s.id === claim.current_stage_id);
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= stages.length) return;

    try {
      await fetch(`${API_BASE_URL}/claims/${claim.id}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: stages[nextIdx].id }),
      });
      fetchAll();
    } catch (err) { console.error(err); }
  };

  const addStage = async () => {
    if (!newStageName.trim()) return;
    const nextOrder = stages.length ? Math.max(...stages.map(s => s.step_order)) + 1 : 1;
    try {
      await fetch(`${API_BASE_URL}/claim-stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStageName, step_order: nextOrder }),
      });
      setNewStageName('');
      fetchAll();
    } catch (err) { console.error(err); }
  };

  const deleteStage = async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/claim-stages/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><View style={styles.centerContainer}><ActivityIndicator size="large" color="#66c0f4" /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1722" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Claim Management</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'claims' && styles.tabBtnActive]} onPress={() => setTab('claims')}>
          <Text style={[styles.tabBtnText, tab === 'claims' && styles.tabBtnTextActive]}>เคลมทั้งหมด</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'stages' && styles.tabBtnActive]} onPress={() => setTab('stages')}>
          <Text style={[styles.tabBtnText, tab === 'stages' && styles.tabBtnTextActive]}>ตั้งค่าขั้นตอน</Text>
        </TouchableOpacity>
      </View>

      {tab === 'claims' ? (
        <ScrollView contentContainerStyle={styles.scrollPadding}>
          {claims.length === 0 ? (
            <Text style={styles.emptyText}>ยังไม่มีเคลมในระบบ</Text>
          ) : claims.map(c => {
            const isLast = c.stage_order === Math.max(...stages.map(s => s.step_order));
            const isFirst = c.stage_order === Math.min(...stages.map(s => s.step_order));
            return (
              <View key={c.id} style={styles.claimCard}>
                <View style={styles.claimCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.claimProduct} numberOfLines={1}>{c.product_name}</Text>
                    <Text style={styles.claimMeta}>โดย {c.username} · {new Date(c.created_at).toLocaleDateString('th-TH')}</Text>
                  </View>
                </View>
                <Text style={styles.claimReason}>{c.reason}</Text>

                <View style={styles.stageControlRow}>
                  <TouchableOpacity style={[styles.stageBtn, isFirst && styles.stageBtnDisabled]} onPress={() => advanceStage(c, -1)} disabled={isFirst}>
                    <Text style={styles.stageBtnText}>◀ ย้อน</Text>
                  </TouchableOpacity>
                  <View style={styles.currentStagePill}>
                    <Text style={styles.currentStageText}>{c.stage_name}</Text>
                  </View>
                  <TouchableOpacity style={[styles.stageBtn, isLast && styles.stageBtnDisabled]} onPress={() => advanceStage(c, 1)} disabled={isLast}>
                    <Text style={styles.stageBtnText}>เลื่อน ▶</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollPadding}>
          <View style={styles.addStageRow}>
            <TextInput
              style={styles.addStageInput}
              value={newStageName}
              onChangeText={setNewStageName}
              placeholder="ชื่อขั้นตอนใหม่ เช่น รอตรวจสอบเพิ่มเติม"
              placeholderTextColor="#4c5b6a"
            />
            <TouchableOpacity style={styles.addStageBtn} onPress={addStage}>
              <Text style={styles.addStageBtnText}>+ เพิ่ม</Text>
            </TouchableOpacity>
          </View>

          {stages.map((s, i) => (
            <View key={s.id} style={styles.stageRow}>
              <Text style={styles.stageOrder}>{i + 1}</Text>
              <Text style={styles.stageName}>{s.name}</Text>
              <TouchableOpacity onPress={() => deleteStage(s.id)}>
                <Text style={styles.deleteStageText}>ลบ</Text>
              </TouchableOpacity>
            </View>
          ))}
          <Text style={styles.hintText}>ลำดับขั้นตอนเรียงตามที่เพิ่มก่อน-หลัง ถ้าจะจัดลำดับใหม่ ลองลบแล้วเพิ่มใหม่ตามลำดับที่ต้องการ</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e141b' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: Platform.OS === 'web' ? 30 : 20, backgroundColor: '#0f1722', borderBottomWidth: 1, borderBottomColor: '#1e2d3e' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff' },

  tabRow: { flexDirection: 'row', padding: 16, gap: 10 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#17202d', borderWidth: 1, borderColor: '#2a475e' },
  tabBtnActive: { backgroundColor: '#66c0f4', borderColor: '#66c0f4' },
  tabBtnText: { color: '#4c5b6a', fontSize: 13, fontWeight: '700' },
  tabBtnTextActive: { color: '#0e141b' },

  scrollPadding: { padding: 16, paddingTop: 0 },
  emptyText: { fontSize: 13, color: '#4c5b6a', textAlign: 'center', marginTop: 30 },

  claimCard: { backgroundColor: '#17202d', borderWidth: 1, borderColor: '#2a475e', borderRadius: 12, padding: 14, marginBottom: 10 },
  claimCardHeader: { flexDirection: 'row', marginBottom: 6 },
  claimProduct: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  claimMeta: { fontSize: 11, color: '#4c5b6a', marginTop: 2 },
  claimReason: { fontSize: 13, color: '#c7d5e0', marginBottom: 12 },

  stageControlRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stageBtn: { backgroundColor: '#0f1722', borderWidth: 1, borderColor: '#2a475e', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  stageBtnDisabled: { opacity: 0.3 },
  stageBtnText: { fontSize: 11, color: '#c7d5e0', fontWeight: '700' },
  currentStagePill: { flex: 1, backgroundColor: 'rgba(102,192,244,0.15)', borderWidth: 1, borderColor: '#66c0f4', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  currentStageText: { fontSize: 12, color: '#66c0f4', fontWeight: '700' },

  addStageRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  addStageInput: { flex: 1, backgroundColor: '#17202d', borderWidth: 1, borderColor: '#2a475e', borderRadius: 10, padding: 12, color: '#c7d5e0', fontSize: 13 },
  addStageBtn: { backgroundColor: '#a4d007', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 10 },
  addStageBtnText: { color: '#0e141b', fontWeight: '800', fontSize: 13 },

  stageRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#17202d', borderWidth: 1, borderColor: '#2a475e', borderRadius: 10, padding: 12, marginBottom: 8 },
  stageOrder: { width: 24, fontSize: 13, fontWeight: '800', color: '#66c0f4' },
  stageName: { flex: 1, fontSize: 13, color: '#ffffff' },
  deleteStageText: { fontSize: 12, color: '#f43f5e', fontWeight: '700' },
  hintText: { fontSize: 11, color: '#4c5b6a', marginTop: 8, lineHeight: 16 },
});
