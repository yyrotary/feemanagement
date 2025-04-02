'use client';

import styles from './fee.module.css';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Member {
  id: string;
  name: string;
}

interface FeeRecord {
  id: string;
  memberId: string;
  memberName: string;
  paid_fee: number;
  method: 'cash' | 'card' | 'deposit';
}

interface FeeResponse {
  id: string;
  memberId: string;
  memberName: string;
  paid_fee: number;
  method: 'cash' | 'card' | 'deposit';
}

const METHODS = ['cash', 'card', 'deposit'] as const;

export default function FeePage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [members, setMembers] = useState<Member[]>([]);
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<typeof METHODS[number] | null>(null);
  const [showMemberSelection, setShowMemberSelection] = useState(false);
  const [feeType, setFeeType] = useState<'general' | 'special'>('general');

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
    const loadFees = async () => {
      try {
        setLoading(true);
        const endpoint = feeType === 'general' ? '/api/getFees' : '/api/getSpecialFees';
        const response = await fetch(`${endpoint}?date=${date}`);
        if (!response.ok) throw new Error('회비 기록 로드 실패');
        const data = await response.json();
        
        if (Array.isArray(data.fees)) {
          const formattedRecords = data.fees.map((fee: FeeResponse) => ({
            id: fee.id,
            memberId: fee.memberId || '',
            memberName: fee.memberName || '회원',
            paid_fee: fee.paid_fee || 0,
            method: fee.method[0]?.toLowerCase() || 'deposit'
          }));
          setRecords(formattedRecords);
        } else {
          console.error('Invalid API response format:', data);
          setRecords([]);
        }
      } catch (err) {
        console.error('Error loading fees:', err);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    loadFees();
  }, [date, feeType]);

  const handleMethodSelect = (method: typeof METHODS[number]) => {
    setSelectedMethod(method);
    setShowMemberSelection(true);
  };

  const handleMemberSelect = async (memberId: string) => {
    if (!selectedMethod || !memberId || isSubmitting) return;

    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const amountInput = document.getElementById('customAmount') as HTMLInputElement;
    const customAmount = parseInt(amountInput.value.replace(/,/g, ''));
    
    if (!customAmount || customAmount <= 0) {
      alert('유효한 금액을 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      const endpoint = feeType === 'general' ? '/api/addFee' : '/api/addSpecialFee';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date, 
          memberId, 
          paid_fee: customAmount, 
          method: selectedMethod
        }),
      });

      if (!response.ok) throw new Error('회비 기록 실패');

      const data = await response.json();
      const newRecord = {
        id: data.id,
        memberId,
        memberName: member.name,
        paid_fee: customAmount,
        method: selectedMethod
      };
      setRecords(prev => [...prev, newRecord]);
      
      setSelectedMethod(null);
      setShowMemberSelection(false);
      amountInput.value = '';
    } catch (error) {
      console.error('Error adding fee:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSelection = () => {
    setSelectedMethod(null);
    setShowMemberSelection(false);
  };

  const handleDeleteRecord = async (record: FeeRecord) => {
    try {
      const endpoint = feeType === 'general' ? '/api/deleteFee' : '/api/deleteSpecialFee';
      const response = await fetch(endpoint, {
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

  const calculateTotals = () => {
    const totals = {
      cash: 0,
      card: 0,
      deposit: 0,
      total: 0
    };

    records.forEach(record => {
      if (record.method && typeof record.paid_fee === 'number') {
        totals[record.method] += record.paid_fee;
        totals.total += record.paid_fee;
      }
    });

    return totals;
  };

  const totals = calculateTotals();

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
  };

  const formatNumber = (value: number) => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const formattedValue = formatNumber(parseInt(value || '0'));
    e.target.value = formattedValue;
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
      <h1>회비 기록</h1>
      <div className={styles.dateContainer}>
        <label>날짜: </label>
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className={styles.dateInput}
        />
      </div>

      {/* 회비 종류 선택 버튼 */}
      <div className={styles.feeTypeContainer}>
        <div className={styles.feeTypeButtons}>
          <button
            className={`${styles.feeTypeButton} ${feeType === 'general' ? styles.selectedFeeType : ''}`}
            onClick={() => setFeeType('general')}
          >
            일반회비
          </button>
          <button
            className={`${styles.feeTypeButton} ${feeType === 'special' ? styles.selectedFeeType : ''}`}
            onClick={() => setFeeType('special')}
          >
            특별회비
          </button>
        </div>
      </div>

      {/* 사용자 지정 금액 입력 */}
      <div className={styles.customAmountContainer}>
        <div className={styles.customAmountWrapper}>
          <h3 className={styles.customAmountTitle}>사용자 지정 금액</h3>
          <input 
            type="text" 
            placeholder="금액 직접 입력 (예: 50,000)" 
            className={styles.customAmountInput}
            id="customAmount"
            onChange={handleAmountChange}
          />
          <div className={styles.customMethodButtons}>
            {METHODS.map(method => (
              <button 
                key={method} 
                className={styles.customMethodButton}
                onClick={() => handleMethodSelect(method)}
              >
                {method === 'cash' ? '현금' : method === 'card' ? '카드' : '입금'} 납부
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 회원 선택 모달 */}
      {showMemberSelection && selectedMethod && (
        <div className={styles.memberSelectionModal}>
          <div className={styles.memberSelectionContent}>
            <div className={styles.memberSelectionHeader}>
              <h3>회원 선택</h3>
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

      {/* 기록된 회비 내역 */}
      {records.length > 0 && (
        <div className={styles.summary}>
          <h2>기록된 회비</h2>
          <div className={styles.recordsList}>
            {records.map((record, index) => (
              <div key={index} className={styles.recordItem}>
                <span>{record.memberName}: {record.paid_fee.toLocaleString()}원 ({
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
            <h3>회비 합계</h3>
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