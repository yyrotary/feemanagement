'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './settings.module.css';

interface MasterInfo {
  id: string;
  exchange_rate: number;
  specialevent_fee: number;
  pass: string;
  sdonation: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<MasterInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch('/api/getAllMasterInfo');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '설정을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        setSettings(data);
      } catch (err) {
        console.error('설정 불러오기 오류:', err);
        setError(err instanceof Error ? err.message : '설정을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/updateMasterInfo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: settings.id,
          exchange_rate: settings.exchange_rate,
          specialevent_fee: settings.specialevent_fee,
          pass: settings.pass,
          sdonation: settings.sdonation,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '설정 저장에 실패했습니다.');
      }
      
      await response.json();
      setSuccess('설정이 성공적으로 저장되었습니다.');
    } catch (err) {
      console.error('설정 저장 오류:', err);
      setError(err instanceof Error ? err.message : '설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof MasterInfo, value: number) => {
    if (settings) {
      setSettings({
        ...settings,
        [field]: value
      });
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <p>설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h2>오류 발생</h2>
          <p>{error}</p>
          <Link href="/admin/dashboard" className={styles.backButton}>
            상위 메뉴로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>관리자 설정</h1>
        <Link href="/admin/dashboard" className={styles.backButton}>
          ← 대시보드로 돌아가기
        </Link>
      </header>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="exchange_rate" className={styles.label}>
            환율 (원/달러)
          </label>
          <input
            id="exchange_rate"
            type="number"
            className={styles.input}
            value={settings?.exchange_rate || 0}
            onChange={(e) => handleChange('exchange_rate', parseFloat(e.target.value))}
            min="0"
            step="0.01"
            required
          />
          <p className={styles.helpText}>달러당 원화 금액을 설정합니다.</p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="specialevent_fee" className={styles.label}>
            특별 행사비 (원)
          </label>
          <input
            id="specialevent_fee"
            type="number"
            className={styles.input}
            value={settings?.specialevent_fee || 10000}
            onChange={(e) => handleChange('specialevent_fee', parseFloat(e.target.value))}
            min="0"
            step="1000"
            required
          />
          <p className={styles.helpText}>경조사 기본 비용을 설정합니다.</p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="pass" className={styles.label}>
            비밀번호
          </label>
          <input
            id="pass"
            type="password"
            className={styles.input}
            value={settings?.pass || ''}
            onChange={(e) => {
              if (settings) {
                setSettings({
                  ...settings,
                  pass: e.target.value
                });
              }
            }}
            required
          />
          <p className={styles.helpText}>관리자 접근을 위한 비밀번호를 설정합니다.</p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="sdonation" className={styles.label}>
            봉사인 (원)
          </label>
          <input
            id="sdonation"
            type="number"
            className={styles.input}
            value={settings?.sdonation || 0}
            onChange={(e) => handleChange('sdonation', parseFloat(e.target.value))}
            min="0"
            step="1000"
            required
          />
          <p className={styles.helpText}>봉사인 금액을 설정합니다.</p>
        </div>

        <div className={styles.buttonContainer}>
          <button 
            type="submit" 
            className={styles.saveButton}
            disabled={isSaving}
          >
            {isSaving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </form>
    </div>
  );
} 