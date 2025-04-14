import { useState, useEffect, useCallback } from 'react';
import { SpecialFee, SpecialFeeCalculation } from '../types/specialFee';
import styles from './SpecialFeeSection.module.css';

interface SpecialEvent {
  id: string;
  date: string;
  name: string;
  nickname?: string;
  events: string;
}

// 금액 포맷 함수
const formatNumber = (number: number | undefined): string => {
  if (number === undefined) return '0';
  return number.toLocaleString();
};

interface SpecialFeeSectionProps {
  memberId: string;
  memberName: string;
  nickname?: string;
}

export default function SpecialFeeSection({ memberId, memberName }: SpecialFeeSectionProps) {
  const [calculation, setCalculation] = useState<SpecialFeeCalculation | null>(null);
  const [fees, setFees] = useState<SpecialFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEventsCollapsed, setIsEventsCollapsed] = useState(true);
  const [isEventsFetched, setIsEventsFetched] = useState(false);

  // 경조사 목록 토글 핸들러
  const handleEventsToggle = useCallback(() => {
    setIsEventsCollapsed(!isEventsCollapsed);
  }, [isEventsCollapsed]);

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

        // 한 번에 모든 데이터 요청 (경조사 목록 포함)
        const [calcResponse, feesResponse] = await Promise.all([
          fetch(`/api/calculateSpecialFee?memberName=${encodeURIComponent(memberName)}`),
          fetch(`/api/getSpecialFees?memberId=${encodeURIComponent(memberId)}`)
        ]);

        if (!calcResponse.ok || !feesResponse.ok) {
          throw new Error('데이터를 불러오는데 실패했습니다.');
        }

        const [calcData, feesData] = await Promise.all([
          calcResponse.json(),
          feesResponse.json()
        ]);

        // 모든 데이터를 한 번에 설정
        setCalculation({
          events: calcData.events || [],
          totalFee: calcData.totalFee,
          specialEventFee: calcData.specialEventFee
        });
        setFees(feesData.fees || []);
        setIsEventsFetched(true);
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
    
    // 이 부분이 중요! 의존성 배열에 memberName과 memberId만 포함
  }, [memberId, memberName]);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!calculation) {
    return <div>데이터를 불러올 수 없습니다.</div>;
  }

  // 납부 금액 계산
  const totalPaid = fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
  const remainingFee = calculation.totalFee - totalPaid;
  const events = calculation.events || [];
  const eventCount = events.length;

  // 납부 방법 변환 함수
  const formatPaymentMethod = (methods: string[] | undefined): string => {
    if (!methods || methods.length === 0) return '입금';
    return methods.map(method => {
      const lowerMethod = method.toLowerCase().trim();
      if (lowerMethod === 'cash') return '현금';
      if (lowerMethod === 'card') return '카드';
      if (lowerMethod === 'deposit') return '입금';
      if (lowerMethod === 'deposit_pending') return '입금대기';
      return method;
    }).join(', ');
  };

  return (
    <div className={styles.container}>
      {/* 경조사 목록 */}
      <section className={styles.section}>
        <h3 
          className={styles.sectionTitle} 
          onClick={handleEventsToggle}
          style={{ cursor: 'pointer' }}
        >
          경조사 목록 {isEventsCollapsed ? '▼' : '▲'}
        </h3>
        <div className={`${styles.eventsList} ${isEventsCollapsed ? styles.collapsed : ''}`}>
          {events.length > 0 ? (
            <ul className={styles.list}>
              {events.map((event) => (
                <li key={event.id} className={styles.eventItem}>
                  <span className={styles.eventDate}>{event.date}</span>
                  <span className={styles.eventName}>
                    {event.nickname ? `${event.nickname} ` : ''}{event.name}
                  </span>
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
          {formatNumber(calculation.totalFee)}원
          <span className={styles.eventCount}>({eventCount}건 x {formatNumber(calculation.specialEventFee)}원)</span>
        </p>
      </div>

      {/* 납부/미납 총액 */}
      <div className={styles.feeContainer}>
        <div className={styles.paidAmount}>
          <h3>납부 하신 금액</h3>
          <p>{formatNumber(totalPaid)}원</p>
        </div>

        <div className={styles.unpaidAmount}>
          <h3>납부 하실 금액</h3>
          <p>{formatNumber(remainingFee)}원</p>
        </div>
      </div>

      {/* 납부 내역 */}
      <section className={styles.section}>
        <div className={styles.paymentHeader}>
          <span>날짜</span>
          <span>금액</span>
          <span>납부</span>
        </div>
        <div className={styles.paymentList}>
          {fees && fees.length > 0 ? (
            <ul className={styles.list}>
              {fees.map((fee) => (
                <li key={fee.id} className={styles.paymentItem}>
                  <span className={styles.paymentDate}>
                    {new Date(fee.date).toLocaleDateString('ko-KR', {
                      year: '2-digit',
                      month: '2-digit',
                      day: '2-digit',
                    }).replace(/\. /g, '.').replace(/\.$/, '')}
                  </span>
                  <span className={styles.paymentAmount}>
                    {formatNumber(fee.amount)}원
                  </span>
                  <span className={styles.paymentMethod}>
                    {formatPaymentMethod(fee.method)}
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
