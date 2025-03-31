import { useState, useEffect } from 'react';
import { Donation } from '../types/donation';
import styles from './DonationSection.module.css';

interface DonationSectionProps {
  memberId: string;
  memberName: string;
  nickname?: string;
}

export default function DonationSection({ memberId }: DonationSectionProps) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const response = await fetch(`/api/getDonations?memberId=${encodeURIComponent(memberId)}`);
        
        if (!response.ok) {
          throw new Error('기부 내역을 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        setDonations(data.donations || []);
      } catch (err) {
        console.error('Error fetching donations:', err);
        setError(err instanceof Error ? err.message : '기부 내역을 불러오는데 실패했습니다.');
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

  // 금액 포맷 함수
  const formatNumber = (number: number | undefined): string => {
    if (number === undefined) return '0';
    return number.toLocaleString();
  };

  // 납부 방법 변환 함수
  const formatPaymentMethod = (methods: string[]): string => {
    if (!methods || methods.length === 0) return '입금';
    
    return methods.map(method => {
      const lowerMethod = method.toLowerCase().trim();
      if (lowerMethod === 'cash') return '현금';
      if (lowerMethod === 'card') return '카드';
      if (lowerMethod === 'deposit') return '입금';
      return method;
    }).join(', ');
  };

  // 기부 종류 포맷 함수
  const formatDonationClass = (classes: string[]): string => {
    if (!classes || classes.length === 0) return '-';
    return classes.join(', ');
  };

  // 총 납부금액 계산
  const totalPaid = donations.reduce((sum, donation) => sum + (donation.paid_fee || 0), 0);

  return (
    <div className={styles.container}>
      {/* 총 납부금액 섹션 */}
      <div className={styles.totalCard}>
        <h3>총 기부금액</h3>
        <p className={styles.totalAmount}>{formatNumber(totalPaid)}원</p>
      </div>

      {/* 납부 내역 섹션 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>기부 내역</h3>
        <div className={styles.paymentHeader}>
          <span>날짜</span>
          <span>납부금액</span>
          <span>종류</span>
          <span>납부수단</span>
        </div>
        <div className={styles.paymentList}>
          {donations && donations.length > 0 ? (
            <ul className={styles.list}>
              {donations.map((donation) => (
                <li key={donation.id} className={styles.paymentItem}>
                  <span className={styles.paymentDate}>
                    {new Date(donation.date).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    }).replace(/\. /g, '.').replace(/\.$/, '')}
                  </span>
                  <span className={styles.paymentAmount}>
                    {formatNumber(donation.paid_fee)}원
                  </span>
                  <span className={styles.donationClass}>
                    {formatDonationClass(donation.class)}
                  </span>
                  <span className={styles.paymentMethod}>
                    {formatPaymentMethod(donation.method)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyMessage}>기부 내역이 없습니다.</p>
          )}
        </div>
      </section>
    </div>
  );
} 