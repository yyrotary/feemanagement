import { useState, useEffect } from 'react';
import styles from './ServiceFeeSection.module.css';

interface ServiceFee {
  id: string;
  date: string;
  amount: number;
  method: string;
}

interface ServiceFeeSectionProps {
  memberId: string;
  memberName: string;
  nickname?: string;
}

export default function ServiceFeeSection({ memberId }: ServiceFeeSectionProps) {
  const [fees, setFees] = useState<ServiceFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const REQUIRED_SERVICE_FEE = 540000;

  useEffect(() => {
    const fetchData = async () => {
      if (!memberId) {
        setError('회원 정보가 올바르지 않습니다.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/getServiceFees?memberId=${encodeURIComponent(memberId)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '봉사금 내역을 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        setFees(data.fees || []);
      } catch (err) {
        console.error('Error fetching service fee data:', err);
        setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
        setFees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [memberId]);

  if (loading) {
    return <div className={styles.loading}>로딩 중...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  // 납부 금액 계산
  const totalPaid = fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
  const remainingFee = Math.max(0, REQUIRED_SERVICE_FEE - totalPaid);

  return (
    <div className={styles.container}>
      {/* 납부/미납 총액 */}
      <div className={styles.summaryContainer}>
        {/* 납부 총액 */}
        <div className={styles.paidAmount}>
          <h3>납부 봉사금</h3>
          <p>{totalPaid.toLocaleString()}원</p>
        </div>

        {/* 미납 총액 */}
        <div className={styles.unpaidAmount}>
          <h3>미납 봉사금</h3>
          <p>
            {remainingFee.toLocaleString()}원
            <span className={styles.requiredFee}>(의무봉사금 {REQUIRED_SERVICE_FEE.toLocaleString()}원)</span>
          </p>
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