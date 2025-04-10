import React, { useState, useEffect } from 'react';
import styles from './DonationSection.module.css';
import { Donation } from '@/app/types/donation';

interface DonationSectionProps {
  memberId: string;
  memberName: string;
  nickname?: string;
}

export default function DonationSection({ memberId }: DonationSectionProps) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [friendDonations, setFriendDonations] = useState<Donation[]>([]);
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

        // 기존 기부 데이터 조회
        const response = await fetch(`/api/getDonations?memberId=${encodeURIComponent(memberId)}`);
        
        if (!response.ok) {
          throw new Error('기부 내역을 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        setDonations(data.donations || []);
        
        // 우정기부 데이터 조회 (from_friend가 현재 회원인 기부 내역)
        const friendResponse = await fetch(`/api/getFriendDonations?friendId=${encodeURIComponent(memberId)}`);
        
        if (friendResponse.ok) {
          const friendData = await friendResponse.json();
          setFriendDonations(friendData.donations || []);
        }
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
  
  // 우정기부 총액 계산
  const totalFriendDonations = friendDonations.reduce((sum, donation) => sum + (donation.paid_fee || 0), 0);
  
  // 기부 총액 (본인 기부 + 우정기부)
  const grandTotal = totalPaid + totalFriendDonations;

  return (
    <div className={styles.container}>
      {/* 총 납부금액 섹션 */}
      <div className={styles.totalCard}>
        <h3>총 기부금액</h3>
        <p className={styles.totalAmount}>{formatNumber(grandTotal)}원</p>
      </div>
      
      {/* 우정기부 섹션 */}
      {friendDonations.length > 0 && (
        <div className={styles.friendDonationCard}>
          <h3>우정 기부</h3>
          <p className={styles.friendDonationAmount}>{formatNumber(totalFriendDonations)}원</p>
        </div>
      )}

      {/* 납부 내역 섹션 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>기부 내역</h3>
        <div className={styles.paymentHeader}>
          <span>날짜</span>
          <span>금액</span>
          <span>종류</span>
          <span>납부</span>
          <span>우정</span>
        </div>
        <div className={styles.paymentList}>
          {donations && donations.length > 0 ? (
            <ul className={styles.list}>
              {donations.map((donation) => (
                <li key={donation.id} className={styles.paymentItem}>
                  <span className={styles.paymentDate}>
                    {new Date(donation.date).toLocaleDateString('ko-KR', {
                      year: '2-digit',
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
                  <span className={styles.fromFriend}>
                    {donation.from_friend?.name || '-'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyMessage}>기부 내역이 없습니다.</p>
          )}
        </div>
      </section>
      
      {/* 우정기부 내역 섹션 */}
      {friendDonations.length > 0 && (
        <section className={`${styles.section} ${styles.friendDonationSection}`}>
          <h3 className={styles.sectionTitle}>우정기부 내역</h3>
          <div className={styles.paymentHeader}>
            <span>날짜</span>
            <span>금액</span>
            <span>종류</span>
            <span>납부</span>
            <span>대상</span>
          </div>
          <div className={styles.paymentList}>
            <ul className={styles.list}>
              {friendDonations.map((donation) => (
                <li key={donation.id} className={styles.paymentItem}>
                  <span className={styles.paymentDate}>
                    {new Date(donation.date).toLocaleDateString('ko-KR', {
                      year: '2-digit',
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
                  <span className={styles.fromFriend}>
                    {donation.memberName || '-'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
} 