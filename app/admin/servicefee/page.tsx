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
  method: string;
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
            method: fee.method || 'cash'
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

    const timeoutId = setTimeout(loadServiceFees, 300);
    return () => clearTimeout(timeoutId);
  }, [date]);

  const handleMemberSelect = async (amount: number, method: typeof METHODS[number], memberId: string) => {
    if (!memberId || isSubmitting) return;

    const member = members.find(m => m.id === memberId);
    if (!member) return;

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/addServiceFee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, memberId, amount, method }),
      });

      if (!response.ok) throw new Error('봉사금 기록 실패');

      const data = await response.json();
      setRecords(prev => [...prev, {
        id: data.id,
        memberId,
        memberName: member.name,
        amount,
        method
      }]);
    } catch (error) {
      console.error('Error adding service fee:', error);
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <div className={styles.container}>
      <h1>주회 기록지</h1>
      <div className={styles.dateContainer}>
        <label>날짜: </label>
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className={styles.dateInput}
        />
      </div>

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
              <td>{amount.toLocaleString()}원</td>
              {METHODS.map(method => (
                <td key={method}>
                  <select
                    onChange={(e) => handleMemberSelect(amount, method, e.target.value)}
                    value=""
                    className={styles.memberSelect}
                  >
                    <option value="">회원 선택</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {records.length > 0 && (
        <div className={styles.summary}>
          <h2>기록된 봉사금</h2>
          <div className={styles.recordsList}>
            {records.map((record, index) => (
              <div key={index} className={styles.recordItem}>
                <span>{record.memberName}: {record.amount.toLocaleString()}원 ({record.method})</span>
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