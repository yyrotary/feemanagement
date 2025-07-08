'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './payment-overview.module.css';

type MemberPayment = {
  memberId: number;
  memberName: string;
  nickname: string;
  phone: string;
  isElder: boolean;
  // 연회비
  requiredFee: number;
  totalFees: number;
  remainingFees: number;
  feeCompletionRate: number;
  // 특별회비 (경조사)
  requiredSpecialFees: number;
  totalSpecialFees: number;
  remainingSpecialFees: number;
  specialFeeEvents: number;
  specialCompletionRate: number;
  // 봉사금
  requiredServiceFees: number;
  totalServiceFees: number;
  remainingServiceFees: number;
  serviceCompletionRate: number;
  // 기부금
  totalDonations: number;
  totalFriendDonations: number;
  grandTotalDonations: number;
};

type PaymentSummary = {
  totalMembers: number;
  feeCompleteMembers: number;
  feeCompletionRate: number;
  specialFeeCompleteMembers: number;
  specialCompletionRate: number;
  serviceFeeCompleteMembers: number;
  serviceCompletionRate: number;
  totalCollectedFees: number;
  totalCollectedSpecialFees: number;
  totalCollectedServiceFees: number;
  totalCollectedDonations: number;
};

export default function PaymentOverview() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberPayment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [rotaryYear, setRotaryYear] = useState<'current' | 'previous'>('current');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'feeRate' | 'serviceRate'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchPaymentOverview = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        rotaryYear,
        search: searchTerm
      });
      
      const response = await fetch(`/api/getPaymentOverview?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setMembers(data.members);
        setSummary(data.summary);
      } else {
        console.error('Error:', data.error);
        alert('납부 현황을 가져오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Error fetching payment overview:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentOverview();
  }, [rotaryYear]);

  const handleSearch = () => {
    fetchPaymentOverview();
  };

  const handleSort = (field: 'name' | 'feeRate' | 'serviceRate') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedMembers = [...members].sort((a, b) => {
    let valueA, valueB;
    
    switch (sortBy) {
      case 'name':
        valueA = a.memberName;
        valueB = b.memberName;
        break;
      case 'feeRate':
        valueA = a.feeCompletionRate;
        valueB = b.feeCompletionRate;
        break;
      case 'serviceRate':
        valueA = a.serviceCompletionRate;
        valueB = b.serviceCompletionRate;
        break;
      default:
        valueA = a.memberName;
        valueB = b.memberName;
    }
    
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortOrder === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    } else {
      return sortOrder === 'asc' ? (valueA as number) - (valueB as number) : (valueB as number) - (valueA as number);
    }
  });

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + '원';
  };

  const getCompletionClass = (rate: number) => {
    if (rate >= 100) return styles.complete;
    if (rate >= 50) return styles.partial;
    return styles.incomplete;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingMessage}>납부 현황을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>회기별 납부 현황</h1>
        <Link href="/admin/dashboard" className={styles.backButton}>
          관리자 메뉴로 돌아가기
        </Link>
      </div>

      {/* 회기 선택 */}
      <div className={styles.rotaryYearSelector}>
        <button
          className={rotaryYear === 'current' ? styles.active : ''}
          onClick={() => setRotaryYear('current')}
        >
          현재 회기 (25-26)
        </button>
        <button
          className={rotaryYear === 'previous' ? styles.active : ''}
          onClick={() => setRotaryYear('previous')}
        >
          이전 회기 (24-25)
        </button>
      </div>

      {/* 검색 */}
      <div className={styles.searchSection}>
        <input
          type="text"
          placeholder="회원명 또는 별명으로 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <button onClick={handleSearch} className={styles.searchButton}>검색</button>
      </div>

      {/* 요약 통계 */}
      {summary && (
        <div className={styles.summarySection}>
          <div className={styles.summaryCard}>
            <h3>연회비</h3>
            <div className={styles.summaryStats}>
              <span>완납: {summary.feeCompleteMembers}/{summary.totalMembers}명 ({summary.feeCompletionRate}%)</span>
              <span>수금액: {formatCurrency(summary.totalCollectedFees)}</span>
            </div>
          </div>
          <div className={styles.summaryCard}>
            <h3>특별회비</h3>
            <div className={styles.summaryStats}>
              <span>완납: {summary.specialFeeCompleteMembers}/{summary.totalMembers}명 ({summary.specialCompletionRate}%)</span>
              <span>수금액: {formatCurrency(summary.totalCollectedSpecialFees)}</span>
            </div>
          </div>
          <div className={styles.summaryCard}>
            <h3>봉사금</h3>
            <div className={styles.summaryStats}>
              <span>완납: {summary.serviceFeeCompleteMembers}/{summary.totalMembers}명 ({summary.serviceCompletionRate}%)</span>
              <span>수금액: {formatCurrency(summary.totalCollectedServiceFees)}</span>
            </div>
          </div>
          <div className={styles.summaryCard}>
            <h3>기부금</h3>
            <div className={styles.summaryStats}>
              <span>총 기부액: {formatCurrency(summary.totalCollectedDonations)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 정렬 옵션 */}
      <div className={styles.sortSection}>
        <span>정렬: </span>
        <button 
          className={sortBy === 'name' ? styles.activeSortButton : styles.sortButton}
          onClick={() => handleSort('name')}
        >
          이름 {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
        <button 
          className={sortBy === 'feeRate' ? styles.activeSortButton : styles.sortButton}
          onClick={() => handleSort('feeRate')}
        >
          연회비 납부율 {sortBy === 'feeRate' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
        <button 
          className={sortBy === 'serviceRate' ? styles.activeSortButton : styles.sortButton}
          onClick={() => handleSort('serviceRate')}
        >
          봉사금 납부율 {sortBy === 'serviceRate' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
      </div>

      {/* 회원별 납부 현황 테이블 */}
      <div className={styles.tableContainer}>
        <table className={styles.paymentTable}>
          <thead>
            <tr>
              <th>회원명</th>
              <th>연회비</th>
              <th>특별회비</th>
              <th>봉사금</th>
              <th>기부금</th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member) => (
              <tr key={member.memberId}>
                <td className={styles.memberInfo}>
                  <div className={styles.memberName}>
                    {member.memberName}
                    {member.isElder && <span className={styles.elderBadge}>원로</span>}
                  </div>
                  <div className={styles.memberNickname}>{member.nickname}</div>
                </td>
                <td className={styles.feeCell}>
                  <div className={`${styles.progressBar} ${getCompletionClass(member.feeCompletionRate)}`}>
                    <div className={styles.progressFill} style={{width: `${Math.min(100, member.feeCompletionRate)}%`}}></div>
                    <span className={styles.progressText}>{member.feeCompletionRate}%</span>
                  </div>
                  <div className={styles.feeDetails}>
                    납부: {formatCurrency(member.totalFees)} / {formatCurrency(member.requiredFee)}
                  </div>
                  {member.remainingFees > 0 && (
                    <div className={styles.remainingFee}>미납: {formatCurrency(member.remainingFees)}</div>
                  )}
                </td>
                <td className={styles.feeCell}>
                  <div className={`${styles.progressBar} ${getCompletionClass(member.specialCompletionRate)}`}>
                    <div className={styles.progressFill} style={{width: `${Math.min(100, member.specialCompletionRate)}%`}}></div>
                    <span className={styles.progressText}>{member.specialCompletionRate}%</span>
                  </div>
                  <div className={styles.feeDetails}>
                    경조사 {member.specialFeeEvents}건: {formatCurrency(member.totalSpecialFees)} / {formatCurrency(member.requiredSpecialFees)}
                  </div>
                  {member.remainingSpecialFees > 0 && (
                    <div className={styles.remainingFee}>미납: {formatCurrency(member.remainingSpecialFees)}</div>
                  )}
                </td>
                <td className={styles.feeCell}>
                  <div className={`${styles.progressBar} ${getCompletionClass(member.serviceCompletionRate)}`}>
                    <div className={styles.progressFill} style={{width: `${Math.min(100, member.serviceCompletionRate)}%`}}></div>
                    <span className={styles.progressText}>{member.serviceCompletionRate}%</span>
                  </div>
                  <div className={styles.feeDetails}>
                    납부: {formatCurrency(member.totalServiceFees)} / {formatCurrency(member.requiredServiceFees)}
                  </div>
                  {member.remainingServiceFees > 0 && (
                    <div className={styles.remainingFee}>미납: {formatCurrency(member.remainingServiceFees)}</div>
                  )}
                </td>
                <td className={styles.donationCell}>
                  <div className={styles.donationAmount}>
                    총 {formatCurrency(member.grandTotalDonations)}
                  </div>
                  <div className={styles.donationDetails}>
                    본인: {formatCurrency(member.totalDonations)}
                  </div>
                  {member.totalFriendDonations > 0 && (
                    <div className={styles.donationDetails}>
                      우정기부: {formatCurrency(member.totalFriendDonations)}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {members.length === 0 && !loading && (
        <div className={styles.noData}>조회된 회원이 없습니다.</div>
      )}
    </div>
  );
} 