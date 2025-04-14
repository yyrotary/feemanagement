'use client';
import { useState } from 'react';
import Image from 'next/image';
import styles from './page.module.css';
import Link from 'next/link';
import SpecialFeeSection from './components/SpecialFeeSection';
import ServiceFeeSection from './components/ServiceFeeSection';
import DonationSection from './components/DonationSection';
import InfoSection from './components/InfoSection';

interface FeeHistory {
  date: string;
  paid_fee: number;
  method: string[];
}

interface MemberData {
  id: string;
  name: string;
  nickname: string;
  totalPaid: number;
  remainingFee: number;
  feeHistory: FeeHistory[];
}

export default function Home() {
  const [phone, setPhone] = useState('');
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(false);
  const [feeType, setFeeType] = useState<'general' | 'special' | 'service' | 'donation'>('general');

    // 납부 방법 변환 함수
  const formatPaymentMethod = (methods: string[]): string => {
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/getMemberFees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });
      
      const data = await response.json();
      if (response.ok) {
        setMemberData(data);
        setFeeType('general');
        setPhone('');
      } else {
        alert(data.error || '데이터를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('데이터를 불러오는데 실패했습니다.');
    }
    
    setLoading(false);
  };

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div className={styles.adminLink}>
          <Link href="/admin" className={styles.adminButton}>
            재무로그인
          </Link>
        </div>
        <Image 
          src="/rotary-logo.png"
          alt="영양로타리클럽 로고"
          width={400}
          height={400}
          className={styles.logo}
          priority
        />
        <h1 className={styles.title}>회비 조회 시스템</h1>
      </div>

      {!memberData ? (
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="전화번호 뒷 4자리"
            maxLength={4}
            pattern="\d{4}"
            required
            className={styles.input}
          />
          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? '조회중...' : '조회하기'}
          </button>
          <p className={styles.inputHelp}>권민혁 회원님은 휴대번호 앞 4자리 입력</p>
        </form>
      ) : (
        <InfoSection />
      )}

      {memberData && (
        <div className={styles.result}>
          <h2 className={styles.title1}>{memberData.nickname ? `${memberData.nickname} ` : ''}{memberData.name} 회원님의 회비 현황</h2>
          
          <div className={styles.feeTypeSelector}>
            <button 
              className={`${styles.feeTypeButton} ${feeType === 'general' ? styles.active : ''}`}
              onClick={() => setFeeType('general')}
            >
              연회비
            </button>
            <button 
              className={`${styles.feeTypeButton} ${feeType === 'special' ? styles.active : ''}`}
              onClick={() => setFeeType('special')}
            >
              경조사
            </button>
            <button 
              className={`${styles.feeTypeButton} ${feeType === 'service' ? styles.active : ''}`}
              onClick={() => setFeeType('service')}
            >
              봉사금
            </button>
            <button 
              className={`${styles.feeTypeButton} ${feeType === 'donation' ? styles.active : ''}`}
              onClick={() => setFeeType('donation')}
            >
              기부
            </button>
          </div>
          <p className={styles.accountInfo}>입금계좌: 농협 713014-51-076725 (영양로타리클럽)</p>

          {feeType === 'general' ? (
            <>
              <div className={styles.summaryContainer}>
                <div className={`${styles.summaryBox} ${styles.totalPaid}`}>
                  <h3>납부 총액</h3>
                  <p>{memberData.totalPaid.toLocaleString()}원</p>
                </div>
                <div className={`${styles.summaryBox} ${styles.remainingFee}`}>
                  <h3>미납 총액</h3>
                  <p>{memberData.remainingFee.toLocaleString()}원</p>
                </div>
              </div>
              
              <table className={styles.feeTable}>
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>금액</th>
                    <th>수단</th>
                  </tr>
                </thead>
                <tbody>
                  {memberData.feeHistory.map((fee: FeeHistory, index: number) => (
                    <tr key={index}>
                      <td>{fee.date}</td>
                      <td>{fee.paid_fee.toLocaleString()}원</td>
                      <td>{formatPaymentMethod(fee.method)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : feeType === 'special' ? (
            <SpecialFeeSection 
              memberId={memberData.id}
              memberName={memberData.name}
              nickname={memberData.nickname}
            />
          ) : feeType === 'service' ? (
            <ServiceFeeSection 
              memberId={memberData.id}
              memberName={memberData.name}
              nickname={memberData.nickname}
            />
          ) : (
            <DonationSection 
              memberId={memberData.id}
              memberName={memberData.name}
              nickname={memberData.nickname}
            />
          )}
        </div>
      )}
    </main>
  );
}