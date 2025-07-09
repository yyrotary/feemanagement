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
  
  // 경조사 종류 관리 상태
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [newEventType, setNewEventType] = useState('');
  const [isLoadingEventTypes, setIsLoadingEventTypes] = useState(false);
  const [isAddingEventType, setIsAddingEventType] = useState(false);
  const [isDeletingEventType, setIsDeletingEventType] = useState<string | null>(null);
  const [eventTypeError, setEventTypeError] = useState<string | null>(null);
  const [eventTypeSuccess, setEventTypeSuccess] = useState<string | null>(null);

  // 경조사 이벤트 관리 상태
  const [specialEvents, setSpecialEvents] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventSuccess, setEventSuccess] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    memberId: '',
    eventType: '',
    date: ''
  });

  // 경조사 종류 목록 가져오기
  const fetchEventTypes = async () => {
    try {
      setIsLoadingEventTypes(true);
      setEventTypeError(null);
      
      const response = await fetch('/api/getEventTypes');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '경조사 종류를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setEventTypes(data.eventTypes);
    } catch (err) {
      console.error('경조사 종류 불러오기 오류:', err);
      setEventTypeError(err instanceof Error ? err.message : '경조사 종류를 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingEventTypes(false);
    }
  };

  // 경조사 종류 추가
  const addEventType = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEventType.trim()) {
      setEventTypeError('경조사 종류를 입력해주세요.');
      return;
    }
    
    try {
      setIsAddingEventType(true);
      setEventTypeError(null);
      setEventTypeSuccess(null);
      
      const response = await fetch('/api/addEventType', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: newEventType.trim()
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '경조사 종류 추가에 실패했습니다.');
      }
      
      setEventTypes(data.eventTypes);
      setNewEventType('');
      setEventTypeSuccess('경조사 종류가 추가되었습니다.');
    } catch (err) {
      console.error('경조사 종류 추가 오류:', err);
      setEventTypeError(err instanceof Error ? err.message : '경조사 종류 추가에 실패했습니다.');
    } finally {
      setIsAddingEventType(false);
    }
  };

  // 경조사 종류 삭제
  const deleteEventType = async (eventType: string) => {
    if (!confirm(`'${eventType}' 경조사 종류를 삭제하시겠습니까?`)) {
      return;
    }
    
    try {
      setIsDeletingEventType(eventType);
      setEventTypeError(null);
      setEventTypeSuccess(null);
      
      const response = await fetch('/api/deleteEventType', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: eventType
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '경조사 종류 삭제에 실패했습니다.');
      }
      
      setEventTypes(data.eventTypes);
      setEventTypeSuccess('경조사 종류가 삭제되었습니다.');
    } catch (err) {
      console.error('경조사 종류 삭제 오류:', err);
      setEventTypeError(err instanceof Error ? err.message : '경조사 종류 삭제에 실패했습니다.');
    } finally {
      setIsDeletingEventType(null);
    }
  };

  // 경조사 이벤트 목록 가져오기
  const fetchSpecialEvents = async () => {
    try {
      setIsLoadingEvents(true);
      setEventError(null);
      
      const response = await fetch('/api/getSpecialEvents');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '경조사 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setSpecialEvents(data.events);
    } catch (err) {
      console.error('경조사 목록 불러오기 오류:', err);
      setEventError(err instanceof Error ? err.message : '경조사 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // 회원 목록 가져오기
  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/getMembers');
      
      if (!response.ok) {
        throw new Error('회원 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setMembers(data);
    } catch (err) {
      console.error('회원 목록 불러오기 오류:', err);
    }
  };

  // 경조사 이벤트 추가
  const addSpecialEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventForm.memberId || !eventForm.eventType || !eventForm.date) {
      setEventError('모든 필드를 입력해주세요.');
      return;
    }
    
    try {
      setIsLoadingEvents(true);
      setEventError(null);
      setEventSuccess(null);
      
      const selectedMember = members.find(member => member.id === eventForm.memberId);
      
      const response = await fetch('/api/addSpecialEvent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: eventForm.memberId,
          memberName: selectedMember?.name || '',
          nickname: selectedMember?.nickname || '',
          date: eventForm.date,
          eventType: eventForm.eventType
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '경조사 추가에 실패했습니다.');
      }
      
      setEventForm({
        memberId: '',
        eventType: '',
        date: ''
      });
      setEventSuccess('경조사가 추가되었습니다.');
      fetchSpecialEvents();
    } catch (err) {
      console.error('경조사 추가 오류:', err);
      setEventError(err instanceof Error ? err.message : '경조사 추가에 실패했습니다.');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // 경조사 이벤트 삭제
  const deleteSpecialEvent = async (eventId: string, eventName: string) => {
    if (!confirm(`'${eventName}' 경조사를 삭제하시겠습니까?`)) {
      return;
    }
    
    try {
      setIsLoadingEvents(true);
      setEventError(null);
      setEventSuccess(null);
      
      const response = await fetch('/api/deleteSpecialEvent', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: eventId
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '경조사 삭제에 실패했습니다.');
      }
      
      setEventSuccess('경조사가 삭제되었습니다.');
      fetchSpecialEvents();
    } catch (err) {
      console.error('경조사 삭제 오류:', err);
      setEventError(err instanceof Error ? err.message : '경조사 삭제에 실패했습니다.');
    } finally {
      setIsLoadingEvents(false);
    }
  };

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
    fetchEventTypes();
    fetchSpecialEvents();
    fetchMembers();
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

      {/* 경조사 종류 관리 섹션 */}
      <div className={styles.eventTypesSection}>
        <h2>경조사 종류 관리</h2>
        
        {eventTypeError && <div className={styles.error}>{eventTypeError}</div>}
        {eventTypeSuccess && <div className={styles.success}>{eventTypeSuccess}</div>}

        {/* 경조사 종류 추가 폼 */}
        <form className={styles.eventTypeForm} onSubmit={addEventType}>
          <div className={styles.formGroup}>
            <label htmlFor="newEventType" className={styles.label}>
              새 경조사 종류 추가
            </label>
            <div className={styles.inputContainer}>
              <input
                id="newEventType"
                type="text"
                className={styles.input}
                value={newEventType}
                onChange={(e) => setNewEventType(e.target.value)}
                placeholder="경조사 종류를 입력하세요 (예: 승진, 입학)"
                maxLength={20}
              />
              <button 
                type="submit" 
                className={styles.addButton}
                disabled={isAddingEventType || !newEventType.trim()}
              >
                {isAddingEventType ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </form>

        {/* 경조사 종류 목록 */}
        <div className={styles.eventTypesList}>
          <h3>현재 경조사 종류 목록</h3>
          {isLoadingEventTypes ? (
            <div className={styles.loading}>경조사 종류를 불러오는 중...</div>
          ) : (
            <div className={styles.eventTypesGrid}>
              {eventTypes.map((eventType) => {
                const isDefault = ['결혼', '출산', '장례', '병문안', '회갑', '진갑', '칠순', '팔순', '기타'].includes(eventType);
                return (
                  <div key={eventType} className={styles.eventTypeItem}>
                    <span className={styles.eventTypeName}>{eventType}</span>
                    {isDefault ? (
                      <span className={styles.defaultBadge}>기본</span>
                    ) : (
                      <button
                        className={styles.deleteButton}
                        onClick={() => deleteEventType(eventType)}
                        disabled={isDeletingEventType === eventType}
                      >
                        {isDeletingEventType === eventType ? '삭제 중...' : '삭제'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 경조사 이벤트 관리 섹션 */}
      <div className={styles.eventTypesSection}>
        <h2>경조사 이벤트 관리</h2>
        
        {eventError && <div className={styles.error}>{eventError}</div>}
        {eventSuccess && <div className={styles.success}>{eventSuccess}</div>}

        {/* 경조사 이벤트 추가 폼 */}
        <form className={styles.eventTypeForm} onSubmit={addSpecialEvent}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              새 경조사 이벤트 추가
            </label>
            <div className={styles.eventFormContainer}>
              <div className={styles.formRow}>
                <div className={styles.inputGroup}>
                  <label htmlFor="eventMember" className={styles.smallLabel}>회원</label>
                  <select
                    id="eventMember"
                    className={styles.select}
                    value={eventForm.memberId}
                    onChange={(e) => setEventForm({...eventForm, memberId: e.target.value})}
                    required
                  >
                    <option value="">회원을 선택하세요</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} {member.nickname && `(${member.nickname})`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.inputGroup}>
                  <label htmlFor="eventType" className={styles.smallLabel}>경조사 종류</label>
                  <select
                    id="eventType"
                    className={styles.select}
                    value={eventForm.eventType}
                    onChange={(e) => setEventForm({...eventForm, eventType: e.target.value})}
                    required
                  >
                    <option value="">경조사 종류를 선택하세요</option>
                    {eventTypes.map((eventType) => (
                      <option key={eventType} value={eventType}>
                        {eventType}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.inputGroup}>
                  <label htmlFor="eventDate" className={styles.smallLabel}>날짜</label>
                  <input
                    id="eventDate"
                    type="date"
                    className={styles.input}
                    value={eventForm.date}
                    onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                    required
                  />
                </div>
                
                <button 
                  type="submit" 
                  className={styles.addButton}
                  disabled={isLoadingEvents}
                >
                  {isLoadingEvents ? '추가 중...' : '추가'}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* 경조사 이벤트 목록 */}
        <div className={styles.eventTypesList}>
          <h3>현재 경조사 이벤트 목록</h3>
          {isLoadingEvents ? (
            <div className={styles.loading}>경조사 이벤트를 불러오는 중...</div>
          ) : specialEvents.length === 0 ? (
            <div className={styles.empty}>등록된 경조사 이벤트가 없습니다.</div>
          ) : (
            <div className={styles.eventsList}>
              {specialEvents.map((event) => (
                <div key={event.id} className={styles.eventItem}>
                  <div className={styles.eventInfo}>
                    <span className={styles.eventName}>{event.name}</span>
                    <span className={styles.eventTypeTag}>{event.eventType}</span>
                    <span className={styles.eventDate}>{event.date}</span>
                  </div>
                  <button
                    className={styles.deleteButton}
                    onClick={() => deleteSpecialEvent(event.id, `${event.name} ${event.eventType}`)}
                    disabled={isLoadingEvents}
                  >
                    {isLoadingEvents ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              ))}
            </div>
          )}
          {specialEvents.length > 0 && (
            <div className={styles.totalInfo}>
              <p>총 {specialEvents.length}건의 경조사가 등록되어 있습니다.</p>
              <p>경조사 한 건당 {settings?.specialevent_fee || 20000}원이 계산됩니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 