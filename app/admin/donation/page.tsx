'use client';

import styles from './donation.module.css';
import { useState, useEffect } from 'react';
import Link from 'next/link';
//import Image from 'next/image';

interface Member {
  id: string;
  name: string;
}

interface DonationRecord {
  id: string;
  memberId: string;
  memberName: string;
  paid_fee: number;
  method: 'cash' | 'card' | 'deposit';
  class: string[];
}

interface DonationAPIResponse {
  id: string;
  date: string;
  paid_fee: number;
  method: string[];
  class: string[];
  memberId?: string;
  memberName?: string;
}

const AMOUNTS = [1000000, 500000, 100000, 50000, 30000, 10000];
const METHODS = ['cash', 'card', 'deposit'] as const;
const CLASSES = ['PHF', 'EREY', '자선', '재난지원', '봉사인', '장학금'] as const;

export default function DonationPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [members, setMembers] = useState<Member[]>([]);
  const [records, setRecords] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<typeof METHODS[number] | null>(null);
  const [selectedClass, setSelectedClass] = useState<typeof CLASSES[number] | null>(null);
  const [showMemberSelection, setShowMemberSelection] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [rotaryYear, setRotaryYear] = useState<'current' | 'previous'>('current');

  useEffect(() => {
    const cachedMembers = sessionStorage.getItem('members');
    if (cachedMembers) {
      setMembers(JSON.parse(cachedMembers));
      setLoading(false);
    }

    async function loadMembers() {
      try {
        const response = await fetch('/api/getMembers');
        if (!response.ok) throw new Error('회원 목록 로드 실패');
        const data = await response.json();
        setMembers(data);
        sessionStorage.setItem('members', JSON.stringify(data));
      } catch (err) {
        console.error('Error loading members:', err);
      } finally {
        setLoading(false);
      }
    }

    async function loadExchangeRate() {
      try {
        const response = await fetch('/api/getMasterInfo');
        if (!response.ok) throw new Error('환율 정보 로드 실패');
        const data = await response.json();
        setExchangeRate(data.exchange_rate || 0);
      } catch (err) {
        console.error('Error loading exchange rate:', err);
      }
    }

    if (!cachedMembers) {
      loadMembers();
    }
    loadExchangeRate();
  }, []);

  useEffect(() => {
    const loadDonations = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/getDonations?date=${date}&rotaryYear=${rotaryYear}`);
        if (!response.ok) throw new Error('기부 기록 로드 실패');
        const data = await response.json();
        
        // API는 { donations: [...] } 형식으로 데이터를 반환
        if (Array.isArray(data.donations)) {
          // 받은 데이터 구조를 컴포넌트에서 필요한 구조로 변환
          const formattedRecords = data.donations.map((donation: DonationAPIResponse) => ({
            id: donation.id,
            memberId: donation.memberId || '',
            memberName: donation.memberName || '회원',
            paid_fee: donation.paid_fee || 0,
            method: donation.method[0]?.toLowerCase() || 'deposit',
            class: donation.class || []
          }));
          setRecords(formattedRecords);
        } else {
          console.error('Invalid API response format:', data);
          setRecords([]);
        }
      } catch (err) {
        console.error('Error loading donations:', err);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    loadDonations();
  }, [date, rotaryYear]);

  const handleClassSelect = (donationClass: typeof CLASSES[number]) => {
    setSelectedClass(donationClass);
    
    // PHF나 EREY 선택 시 자동 금액 계산 및 입금 방법 설정
    if (donationClass === 'PHF') {
      const amount = exchangeRate * 1000;
      setSelectedAmount(amount);
      setSelectedMethod('deposit');
      setShowMemberSelection(true);
    } else if (donationClass === 'EREY') {
      const amount = exchangeRate * 100;
      setSelectedAmount(amount);
      setSelectedMethod('deposit');
      setShowMemberSelection(true);
    } else {
      setSelectedAmount(null);
      setSelectedMethod(null);
      setShowMemberSelection(false);
    }
  };

  const handleCellClick = (amount: number, method: typeof METHODS[number]) => {
    if (!selectedClass) {
      alert('기부 종류를 먼저 선택해주세요.');
      return;
    }
    
    setSelectedAmount(amount);
    setSelectedMethod(method);
    setShowMemberSelection(true);
  };

  const handleMemberSelect = async (memberId: string) => {
    if (!selectedAmount || !selectedMethod || !selectedClass || !memberId || isSubmitting) return;

    const member = members.find(m => m.id === memberId);
    if (!member) return;

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/addDonation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date, 
          memberId, 
          paid_fee: selectedAmount, 
          method: selectedMethod,
          class: selectedClass
        }),
      });

      if (!response.ok) throw new Error('기부 기록 실패');

      const data = await response.json();
      // 로컬 상태 즉시 업데이트하여 새로고침 필요 없게 함
      const newRecord = {
        id: data.id,
        memberId,
        memberName: member.name,
        paid_fee: selectedAmount,
        method: selectedMethod,
        class: [selectedClass]
      };
      setRecords(prev => [...prev, newRecord]);
      
      // 선택 초기화 및 회원 선택 화면 닫기
      setSelectedAmount(null);
      setSelectedMethod(null);
      setShowMemberSelection(false);
    } catch (error) {
      console.error('Error adding donation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 닫기 버튼 핸들러 추가
  const handleCloseSelection = () => {
    setSelectedAmount(null);
    setSelectedMethod(null);
    setShowMemberSelection(false);
  };

  const handleDeleteRecord = async (record: DonationRecord) => {
    try {
      const response = await fetch('/api/deleteDonation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: record.id }),
      });

      if (!response.ok) throw new Error('삭제 실패');
      setRecords(prev => prev.filter(r => r.id !== record.id));
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  // 합계 계산 함수
  const calculateTotals = () => {
    const totals = {
      cash: 0,
      card: 0,
      deposit: 0,
      total: 0,
      classes: {} as Record<string, number>
    };

    // 레코드가 배열인지 확인하고 처리
    if (Array.isArray(records)) {
      records.forEach(record => {
        if (record && record.method && typeof record.paid_fee === 'number') {
          totals[record.method] += record.paid_fee;
          totals.total += record.paid_fee;
          
          // 기부 종류별 합계 계산
          record.class.forEach(c => {
            if (!totals.classes[c]) totals.classes[c] = 0;
            totals.classes[c] += record.paid_fee;
          });
        }
      });
    }

    return totals;
  };

  const totals = calculateTotals();

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
  };

  // console.log 추가하여 디버깅
  useEffect(() => {
    console.log('모달 상태 변경:', { showMemberSelection, selectedAmount, selectedMethod });
  }, [showMemberSelection, selectedAmount, selectedMethod]);

  if (loading) return <div className={styles.container}>회원 목록을 불러오는 중...</div>;

  // 회원 이름을 3열로 정렬하기 위해 배열 재구성
  const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name));
  const memberColumns = [[], [], []] as Member[][];
  const itemsPerColumn = Math.ceil(sortedMembers.length / 3);
  
  sortedMembers.forEach((member, index) => {
    const columnIndex = Math.floor(index / itemsPerColumn);
    memberColumns[columnIndex].push(member);
  });

  return (
    <div className={styles.container}>
      <h1>기부금 기록</h1>
      <div className={styles.dateContainer}>
        <label>날짜: </label>
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className={styles.dateInput}
        />
      </div>

      {/* 회기 선택 */}
      <div className={styles.rotaryYearSelector}>
        <button
          className={rotaryYear === 'current' ? styles.activeRotaryYear : styles.inactiveRotaryYear}
          onClick={() => setRotaryYear('current')}
        >
          현재 회기 (25-26)
        </button>
        <button
          className={rotaryYear === 'previous' ? styles.activeRotaryYear : styles.inactiveRotaryYear}
          onClick={() => setRotaryYear('previous')}
        >
          이전 회기 (24-25)
        </button>
      </div>

      {/* 기부 종류 선택 버튼 */}
      <div className={styles.classSelectionContainer}>
        <div className={styles.classButtons}>
          {CLASSES.map(donationClass => (
            <button
              key={donationClass}
              className={`${styles.classButton} ${selectedClass === donationClass ? styles.selectedClass : ''}`}
              onClick={() => handleClassSelect(donationClass)}
            >
              {donationClass}
            </button>
          ))}
        </div>
      </div>

      {/* 금액 및 납부 방법 표 */}
      <table className={styles.feeTable}>
        <thead>
          <tr>
            <th>금액</th>
            <th>현금</th>
            <th>카드</th>
            <th>입금</th>
          </tr>
        </thead>
        <tbody>
          {AMOUNTS.map(amount => (
            <tr key={amount}>
              <td className={styles.amountCell}>{amount.toLocaleString()}원</td>
              {METHODS.map(method => (
                <td 
                  key={method} 
                  className={styles.methodCell}
                  onClick={() => handleCellClick(amount, method)}
                >
                  회원 선택
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* 사용자 지정 금액 입력 */}
      <div className={styles.customAmountContainer}>
        <div className={styles.customAmountWrapper}>
          <h3 className={styles.customAmountTitle}>사용자 지정 금액</h3>
          <input 
            type="number" 
            placeholder="금액 직접 입력 (예: 50000)" 
            className={styles.customAmountInput}
            id="customAmount"
          />
          <div className={styles.customMethodButtons}>
            {METHODS.map(method => (
              <button 
                key={method} 
                className={styles.customMethodButton}
                onClick={() => {
                  const amountInput = document.getElementById('customAmount') as HTMLInputElement;
                  const customAmount = parseInt(amountInput.value);
                  if (customAmount && customAmount > 0) {
                    handleCellClick(customAmount, method);
                    // 입력 필드 초기화
                    amountInput.value = '';
                  } else {
                    alert('유효한 금액을 입력해주세요.');
                  }
                }}
              >
                {method === 'cash' ? '현금' : method === 'card' ? '카드' : '입금'} 납부
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 전회원 EREY 버튼 */}
      <div className={styles.allMemberEreyContainer}>
        <button 
          className={styles.allMemberEreyButton}
          onClick={async () => {
            if (!exchangeRate) {
              alert('환율 정보를 불러올 수 없습니다.');
              return;
            }

            const confirmed = window.confirm('모든 회원에 대해 EREY 기부를 기록하시겠습니까?');
            if (!confirmed) return;

            setIsSubmitting(true);
            const amount = exchangeRate * 100;

            try {
              for (const member of members) {
                await fetch('/api/addDonation', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    date, 
                    memberId: member.id, 
                    paid_fee: amount, 
                    method: 'deposit',
                    class: 'EREY'
                  }),
                });
              }

              // 페이지 새로고침
              window.location.reload();
            } catch (error) {
              console.error('Error adding EREY donations:', error);
              alert('전체 회원 EREY 기록 중 오류가 발생했습니다.');
            } finally {
              setIsSubmitting(false);
            }
          }}
          disabled={isSubmitting}
        >
          전회원 EREY 기록
        </button>
      </div>

      {/* 회원 선택 모달 */}
      {showMemberSelection && selectedAmount && (
        <div className={styles.memberSelectionModal}>
          <div className={styles.memberSelectionContent}>
            <div className={styles.memberSelectionHeader}>
              <div>
                <h3>회원 선택 (금액: {selectedAmount.toLocaleString()}원)</h3>
                {(selectedClass === 'PHF' || selectedClass === 'EREY') && (
                  <div className={styles.methodSelection}>
                    <span>납부 방법: </span>
                    {METHODS.map(method => (
                      <button
                        key={method}
                        className={`${styles.methodButton} ${selectedMethod === method ? styles.selected : ''}`}
                        onClick={() => setSelectedMethod(method)}
                      >
                        {method === 'cash' ? '현금' : method === 'card' ? '카드' : '입금'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button 
                className={styles.closeButton}
                onClick={handleCloseSelection}
              >
                ✕
              </button>
            </div>
            <div className={styles.memberColumnsContainer}>
              {memberColumns.map((column, columnIndex) => (
                <div key={columnIndex} className={styles.memberColumn}>
                  {column.map(member => (
                    <div
                      key={member.id}
                      className={styles.memberItem}
                      onClick={() => handleMemberSelect(member.id)}
                    >
                      {member.name}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 기록된 기부 내역 */}
      {records.length > 0 && (
        <div className={styles.summary}>
          <h2>기록된 기부금</h2>
          <div className={styles.recordsList}>
            {records.map((record, index) => (
              <div key={index} className={styles.recordItem}>
                <span>{record.memberName}: {record.paid_fee.toLocaleString()}원 ({
                  record.method === 'cash' ? '현금' : record.method === 'card' ? '카드' : '입금'
                }) - {record.class.join(', ')}</span>
                <button 
                  onClick={() => handleDeleteRecord(record)}
                  className={styles.deleteButton}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
          
          <div className={styles.totals}>
            <h3>기부금 합계</h3>
            <div>현금 합계: {totals.cash.toLocaleString()}원</div>
            <div>카드 합계: {totals.card.toLocaleString()}원</div>
            <div>입금 합계: {totals.deposit.toLocaleString()}원</div>
            
            {/* 기부 종류별 합계 표시 */}
            {Object.entries(totals.classes).length > 0 && (
              <div className={styles.classTotals}>
                <h4>종류별 합계</h4>
                {Object.entries(totals.classes).map(([className, amount]) => (
                  <div key={className}>{className}: {amount.toLocaleString()}원</div>
                ))}
              </div>
            )}
            
            <div className={styles.grandTotal}>총 합계: {totals.total.toLocaleString()}원</div>
          </div>
        </div>
      )}

      <Link href="/admin/dashboard" className={styles.backButton}>
        관리자 메뉴로 돌아가기
      </Link>
    </div>
  );
} 