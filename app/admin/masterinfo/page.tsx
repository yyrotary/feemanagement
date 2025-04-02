'use client';

import { useState, useEffect } from 'react';
import styles from './masterinfo.module.css';
import Link from 'next/link';

interface MasterInfo {
  id: string;
  fields: Record<string, string>;
}

export default function MasterInfoPage() {
  const [masterInfo, setMasterInfo] = useState<MasterInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadMasterInfo();
  }, []);

  const loadMasterInfo = async () => {
    try {
      const response = await fetch('/api/getMasterInfo');
      if (!response.ok) throw new Error('기본 정보 로드 실패');
      const data = await response.json();
      setMasterInfo(data);
    } catch (error) {
      console.error('Error loading master info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (fieldName: string, value: string) => {
    setEditingField(fieldName);
    setEditValue(value);
  };

  const handleSave = async () => {
    if (!editingField || !masterInfo) return;

    try {
      const response = await fetch('/api/updateMasterInfo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: masterInfo.id,
          fieldName: editingField,
          value: editValue,
        }),
      });

      if (!response.ok) throw new Error('기본 정보 업데이트 실패');
      await loadMasterInfo();
      setEditingField(null);
    } catch (error) {
      console.error('Error updating master info:', error);
    }
  };

  const handleCancel = () => {
    setEditingField(null);
  };

  if (loading) return <div className={styles.container}>기본 정보를 불러오는 중...</div>;
  if (!masterInfo) return <div className={styles.container}>기본 정보를 찾을 수 없습니다.</div>;

  return (
    <div className={styles.container}>
      <h1>기본 정보 관리</h1>
      <div className={styles.infoList}>
        {Object.entries(masterInfo.fields).map(([fieldName, value]) => (
          <div key={fieldName} className={styles.infoItem}>
            <div className={styles.infoHeader}>
              <h3>{fieldName}</h3>
              {editingField === fieldName ? (
                <div className={styles.editActions}>
                  <button onClick={handleSave} className={styles.saveButton}>
                    저장
                  </button>
                  <button onClick={handleCancel} className={styles.cancelButton}>
                    취소
                  </button>
                </div>
              ) : (
                <button onClick={() => handleEdit(fieldName, value)} className={styles.editButton}>
                  수정
                </button>
              )}
            </div>
            <div className={styles.infoContent}>
              {editingField === fieldName ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className={styles.editInput}
                  placeholder="값을 입력하세요"
                />
              ) : (
                <div className={styles.value}>{value}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      <Link href="/admin/dashboard" className={styles.backButton}>
        관리자 메뉴로 돌아가기
      </Link>
    </div>
  );
} 