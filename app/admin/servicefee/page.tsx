'use client';

import styles from './servicefee.module.css';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Member {
  id: string;
  name: string;
}

interface ServiceFeeRecord {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  method: 'cash' | 'card' | 'deposit';
}

interface ServiceFeeAPIResponse {
  id: string;
  date: string;
  amount: number;
  method: string[];
  memberId?: string;
  memberName?: string;
}

const AMOUNTS = [500000, 100000, 50000, 30000, 20000, 10000];
const METHODS = ['cash', 'card', 'deposit'] as const;

export default function ServiceFeePage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [members, setMembers] = useState<Member[]>([]);
  const [records, setRecords] = useState<ServiceFeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<typeof METHODS[number] | null>(null);
  const [showMemberSelection, setShowMemberSelection] = useState(false);

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

    if (!cachedMembers) {
      loadMembers();
    }
  }, []);

  useEffect(() => {
    const loadServiceFees = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/getServiceFees?date=${date}`);
        if (!response.ok) throw new Error('봉사금 기록 로드 실패');
        const data = await response.json();
        
        // API는 { fees: [...] } 형식으로 데이터를 반환
        if (Array.isArray(data.fees)) {
          // 받은 데이터 구조를 컴포넌트에서 필요한 구조로 변환
          const formattedRecords = data.fees.map((fee: ServiceFeeAPIResponse) => ({
            id: fee.id,
            memberId: fee.memberId || '',
            memberName: fee.memberName || '회원',
            amount: fee.amount || 0,
            method: fee.method && fee.method.length > 0 
              ? fee.method[0].toLowerCase() as 'cash' | 'card' | 'deposit'
              : 'deposit'
          }));
          setRecords(formattedRecords);
        } else {
          console.error('Invalid API response format:', data);
          setRecords([]);
        }
      } catch (err) {
        console.error('Error loading service fees:', err);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    loadServiceFees();
    return () => {};
  }, [date]);

  const handleCellClick = (amount: number, method: typeof METHODS[number]) => {
    setSelectedAmount(amount);
    setSelectedMethod(method);
    setShowMemberSelection(true);
  };

  const handleMemberSelect = async (memberId: string) => {
    if (!selectedAmount || !selectedMethod || !memberId || isSubmitting) return;

    const member = members.find(m => m.id === memberId);
    if (!member) return;

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/addServiceFee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date, 
          memberId, 
          amount: selectedAmount, 
          method: selectedMethod 
        }),
      });

      if (!response.ok) throw new Error('봉사금 기록 실패');

      const data = await response.json();
      // 로컬 상태 즉시 업데이트하여 새로고침 필요 없게 함
      const newRecord = {
        id: data.id,
        memberId,
        memberName: member.name,
        amount: selectedAmount,
        method: selectedMethod
      };
      setRecords(prev => [...prev, newRecord]);
      
      // 선택 초기화 및 회원 선택 화면 닫기
      setSelectedAmount(null);
      setSelectedMethod(null);
      setShowMemberSelection(false);
    } catch (error) {
      console.error('Error adding service fee:', error);
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

  const handleDeleteRecord = async (record: ServiceFeeRecord) => {
    try {
      const response = await fetch('/api/deleteServiceFee', {
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
      total: 0
    };

    // 레코드가 배열인지 확인하고 처리
    if (Array.isArray(records)) {
      records.forEach(record => {
        if (record && record.method && typeof record.amount === 'number') {
          totals[record.method] += record.amount;
          totals.total += record.amount;
        }
      });
    }

    return totals;
  };

  const totals = calculateTotals();

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
  };

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
      <h1>봉사금 기록</h1>
      <div className={styles.dateContainer}>
        <label>날짜: </label>
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className={styles.dateInput}
        />
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

      {/* 회원 선택 모달 */}
      {showMemberSelection && selectedAmount && selectedMethod && (
        <div className={styles.memberSelectionModal}>
          <div className={styles.memberSelectionContent}>
            <div className={styles.memberSelectionHeader}>
              <h3>회원 선택 (금액: {selectedAmount.toLocaleString()}원, 방법: {
                selectedMethod === 'cash' ? '현금' : selectedMethod === 'card' ? '카드' : '입금'
              })</h3>
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

      {records.length > 0 && (
        <div className={styles.summary}>
          <h2>기록된 봉사금</h2>
          <div className={styles.recordsList}>
            {records.map((record, index) => (
              <div key={index} className={styles.recordItem}>
                <span>{record.memberName}: {record.amount.toLocaleString()}원 ({
                  record.method === 'cash' ? '현금' : record.method === 'card' ? '카드' : '입금'
                })</span>
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
            <h3>봉사금 합계</h3>
            <div>현금 합계: {totals.cash.toLocaleString()}원</div>
            <div>카드 합계: {totals.card.toLocaleString()}원</div>
            <div>입금 합계: {totals.deposit.toLocaleString()}원</div>
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