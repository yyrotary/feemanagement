import { useState, useEffect } from 'react';
import { SpecialFeeCalculation } from '../types/specialFee';
import styles from './SpecialFeeSection.module.css';
//import Image from 'next/image';

interface SpecialFeeSectionProps {
  memberId: string;
  memberName: string;
}

export default function SpecialFeeSection({ memberId, memberName }: SpecialFeeSectionProps) {
  const [calculation, setCalculation] = useState<SpecialFeeCalculation | null>(null);
  const [fees, setFees] = useState<SpecialFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEventsCollapsed, setIsEventsCollapsed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!memberId || !memberName) {
        setError('회원 정보가 올바르지 않습니다.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 특별회비 계산과 납부 내역을 병렬로 요청
        const [calcResponse, feesResponse] = await Promise.all([
          fetch(`/api/calculateSpecialFee?memberName=${encodeURIComponent(memberName)}`),
          fetch(`/api/getSpecialFees?memberId=${encodeURIComponent(memberId)}`)
        ]);

        if (!calcResponse.ok) {
          const errorData = await calcResponse.json();
          throw new Error(errorData.error || '특별회비 계산에 실패했습니다.');
        }
        if (!feesResponse.ok) {
          const errorData = await feesResponse.json();
          throw new Error(errorData.error || '특별회비 납부 내역을 불러오는데 실패했습니다.');
        }

        const [calcData, feesData] = await Promise.all([
          calcResponse.json(),
          feesResponse.json()
        ]);

        setCalculation(calcData);
        setFees(feesData.fees || []);
      } catch (err) {
        console.error('Error fetching special fee data:', err);
        setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
        setCalculation(null);
        setFees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [memberId, memberName]);

  if (loading) {
    return <div className={styles.loading}>로딩 중...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!calculation) {
    return <div className={styles.error}>데이터를 불러올 수 없습니다.</div>;
  }

  // 납부 금액 계산
  const totalPaid = fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
  const remainingFee = calculation.totalFee - totalPaid;
  const eventCount = calculation.events?.length || 0;

  return (
    <div className={styles.container}>
      {/* 경조사 목록 */}
      <section className={styles.section}>
        <h3 
          className={styles.sectionTitle} 
          onClick={() => setIsEventsCollapsed(!isEventsCollapsed)}
          style={{ cursor: 'pointer' }}
        >
          경조사 목록 {isEventsCollapsed ? '▼' : '▲'}
        </h3>
        <div className={`${styles.eventsList} ${isEventsCollapsed ? styles.collapsed : ''}`}>
          {calculation.events && calculation.events.length > 0 ? (
            <ul className={styles.list}>
              {calculation.events.map((event) => (
                <li key={event.id} className={styles.eventItem}>
                  <span className={styles.eventDate}>{event.date}</span>
                  <span className={styles.eventName}>{event.name}</span>
                  <span className={styles.eventType}>{event.events}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyMessage}>경조사 목록이 없습니다.</p>
          )}
        </div>
      </section>

      {/* 납부해야할 특별회비 */}
      <div className={styles.totalFeeCard}>
        <h3>특별회비 총액</h3>
        <p>
          {calculation.totalFee.toLocaleString()}원
          <span className={styles.eventCount}>({eventCount}건)</span>
        </p>
      </div>

      {/* 납부/미납 총액 */}
      <div className={styles.feeContainer}>
        {/* 납부 총액 */}
        <div className={styles.paidAmount}>
          <h3>납부 총액</h3>
          <p>{totalPaid.toLocaleString()}원</p>
        </div>

        {/* 미납 총액 */}
        <div className={styles.unpaidAmount}>
          <h3>미납 총액</h3>
          <p>{remainingFee.toLocaleString()}원</p>
        </div>
      </div>

      {/* 납부 내역 */}
      <section className={styles.section}>
        <div className={styles.paymentHeader}>
          <span>날짜</span>
          <span>납부금액</span>
          <span>납부수단</span>
        </div>
        <div className={styles.paymentList}>
          {fees && fees.length > 0 ? (
            <ul className={styles.list}>
              {fees.map((fee) => (
                <li key={fee.id} className={styles.paymentItem}>
                  <span>{fee.date}</span>
                  <span className={styles.paymentAmount}>{fee.amount.toLocaleString()}원</span>
                  <span className={`${styles.paymentMethod} ${styles[fee.method || '']}`}>
                    {fee.method}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyMessage}>납부 내역이 없습니다.</p>
          )}
        </div>
      </section>
    </div>
  );
} 