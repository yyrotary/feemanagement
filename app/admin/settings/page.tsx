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
  
  // 스케줄러 상태 관련 상태 추가
  const [schedulerStatus, setSchedulerStatus] = useState<{
    schedulerRunning: boolean;
    lastExecutions: Record<string, string>;
    config: {
      dailyIntervalMinutes: number;
      weeklyIntervalDays: number;
    };
  } | null>(null);
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const [schedulerError, setSchedulerError] = useState<string | null>(null);
  const [schedulerSuccess, setSchedulerSuccess] = useState<string | null>(null);
  const [schedulerConfig, setSchedulerConfig] = useState({
    dailyIntervalMinutes: 5, // 기본값: 5분분
    weeklyIntervalDays: 2      // 기본값: 2일
  });

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

  // 스케줄러 상태 조회 함수
  const fetchSchedulerStatus = async () => {
    try {
      setSchedulerLoading(true);
      setSchedulerError(null);
      const response = await fetch('/api/scheduler');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '스케줄러 상태를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setSchedulerStatus(data);
      
      // 스케줄러 설정 업데이트
      if (data.config) {
        setSchedulerConfig(data.config);
      }
    } catch (err) {
      console.error('스케줄러 상태 불러오기 오류:', err);
      setSchedulerError(err instanceof Error ? err.message : '스케줄러 상태를 불러오는데 실패했습니다.');
    } finally {
      setSchedulerLoading(false);
    }
  };
  
  // 스케줄러 제어 함수
  const controlScheduler = async (action: string, forceUpdate: boolean = false) => {
    try {
      setSchedulerLoading(true);
      setSchedulerError(null);
      setSchedulerSuccess(null);
      
      const url = new URL('/api/scheduler', window.location.origin);
      url.searchParams.append('action', action);
      
      if (forceUpdate) {
        url.searchParams.append('forceUpdate', 'true');
      }
      
      const response = await fetch(url.toString(), {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '스케줄러 제어에 실패했습니다.');
      }
      
      const data = await response.json();
      setSchedulerStatus(data);
      setSchedulerSuccess(data.message || '작업이 성공적으로 수행되었습니다.');
      
      // 상태 갱신
      fetchSchedulerStatus();
    } catch (err) {
      console.error('스케줄러 제어 오류:', err);
      setSchedulerError(err instanceof Error ? err.message : '스케줄러 제어에 실패했습니다.');
    } finally {
      setSchedulerLoading(false);
    }
  };
  
  // 스케줄러 설정 업데이트 함수
  const updateSchedulerConfig = async () => {
    try {
      setSchedulerLoading(true);
      setSchedulerError(null);
      setSchedulerSuccess(null);
      
      const url = new URL('/api/scheduler', window.location.origin);
      url.searchParams.append('action', 'config');
      url.searchParams.append('dailyIntervalMinutes', schedulerConfig.dailyIntervalMinutes.toString());
      url.searchParams.append('weeklyIntervalDays', schedulerConfig.weeklyIntervalDays.toString());
      
      const response = await fetch(url.toString(), {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '스케줄러 설정 업데이트에 실패했습니다.');
      }
      
      const data = await response.json();
      setSchedulerStatus(prevStatus => ({
        ...prevStatus!,
        config: data.config
      }));
      setSchedulerSuccess('스케줄러 설정이 업데이트되었습니다.');
      
      // 스케줄러 상태 갱신
      fetchSchedulerStatus();
    } catch (err) {
      console.error('스케줄러 설정 업데이트 오류:', err);
      setSchedulerError(err instanceof Error ? err.message : '스케줄러 설정 업데이트에 실패했습니다.');
    } finally {
      setSchedulerLoading(false);
    }
  };
  
  // 스케줄러 상태 초기 로드
  useEffect(() => {
    fetchSchedulerStatus();
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
  
  // 스케줄러 설정 입력 핸들러
  const handleSchedulerConfigChange = (field: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      setSchedulerConfig(prev => ({
        ...prev,
        [field]: numValue
      }));
    }
  };

  // 시간 표시 헬퍼 함수
  const formatTimeInterval = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}분`;
    } else if (minutes % 60 === 0) {
      return `${minutes / 60}시간`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}시간 ${mins}분`;
    }
  };

  // 날짜 포맷팅 함수
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '없음';
    const date = new Date(dateStr);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
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

      {/* 스케줄러 상태 섹션 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>거래내역 자동 업데이트 설정</h2>
        
        {schedulerLoading && <div className={styles.loading}>로딩 중...</div>}
        {schedulerError && <div className={styles.error}>{schedulerError}</div>}
        {schedulerSuccess && <div className={styles.success}>{schedulerSuccess}</div>}
        
        {schedulerStatus && (
          <div className={styles.schedulerStatus}>
            <p>
              <strong>스케줄러 상태:</strong> {schedulerStatus.schedulerRunning ? '실행 중' : '중지됨'}
            </p>
            <p>
              <strong>마지막 일일 업데이트:</strong> {formatDate(schedulerStatus.lastExecutions?.dailyUpdate || '')}
            </p>
            <p>
              <strong>마지막 주간 업데이트:</strong> {formatDate(schedulerStatus.lastExecutions?.weeklyUpdate || '')}
            </p>
            
            {/* 스케줄러 설정 폼 추가 */}
            <div className={styles.schedulerConfigForm}>
              <h3 className={styles.configTitle}>업데이트 주기 설정</h3>
              
              <div className={styles.configField}>
                <label htmlFor="dailyIntervalMinutes">일일 업데이트 간격:</label>
                <div className={styles.configInputGroup}>
                  <input
                    id="dailyIntervalMinutes"
                    type="number"
                    min="1"
                    value={schedulerConfig.dailyIntervalMinutes}
                    onChange={(e) => handleSchedulerConfigChange('dailyIntervalMinutes', e.target.value)}
                    className={styles.configInput}
                  />
                  <span className={styles.configUnit}>분</span>
                  <span className={styles.configHelp}>
                    ({formatTimeInterval(schedulerConfig.dailyIntervalMinutes)})
                  </span>
                </div>
              </div>
              
              <div className={styles.configField}>
                <label htmlFor="weeklyIntervalDays">주간 전체 동기화 간격:</label>
                <div className={styles.configInputGroup}>
                  <input
                    id="weeklyIntervalDays"
                    type="number"
                    min="1"
                    value={schedulerConfig.weeklyIntervalDays}
                    onChange={(e) => handleSchedulerConfigChange('weeklyIntervalDays', e.target.value)}
                    className={styles.configInput}
                  />
                  <span className={styles.configUnit}>일</span>
                </div>
              </div>
              
              <button 
                type="button" 
                onClick={updateSchedulerConfig}
                disabled={schedulerLoading}
                className={styles.configSaveButton}
              >
                설정 저장
              </button>
            </div>
            
            <div className={styles.buttonRow}>
              <button 
                type="button" 
                onClick={() => controlScheduler('start')}
                disabled={schedulerLoading || schedulerStatus.schedulerRunning}
                className={styles.button}
              >
                시작
              </button>
              
              <button 
                type="button" 
                onClick={() => controlScheduler('stop')}
                disabled={schedulerLoading || !schedulerStatus.schedulerRunning}
                className={styles.button}
              >
                중지
              </button>
              
              <button 
                type="button" 
                onClick={() => controlScheduler('restart')}
                disabled={schedulerLoading}
                className={styles.button}
              >
                재시작
              </button>
            </div>
            
            <div className={styles.buttonRow}>
              <button 
                type="button" 
                onClick={() => controlScheduler('execute', false)}
                disabled={schedulerLoading}
                className={styles.button}
              >
                지금 업데이트 실행
              </button>
              
              <button 
                type="button" 
                onClick={() => controlScheduler('execute', true)}
                disabled={schedulerLoading}
                className={`${styles.button} ${styles.warningButton}`}
              >
                전체 동기화 실행
              </button>
            </div>
            
            <div className={styles.scheduleInfo}>
              <p>일일 업데이트: 현재 {formatTimeInterval(schedulerConfig.dailyIntervalMinutes)}마다 자동 실행</p>
              <p>주간 전체 동기화: 현재 {schedulerConfig.weeklyIntervalDays}일마다 자동 실행</p>
              <p>설정을 변경한 후에는 '설정 저장' 버튼을 클릭하세요.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 