'use client';
import { useState } from 'react';
import Image from 'next/image';
import styles from './page.module.css';
import Link from 'next/link';

interface FeeHistory {
  date: string;
  paid_fee: number;
  method: string[];
}

interface MemberData {
  name: string;
  totalPaid: number;
  remainingFee: number;
  feeHistory: FeeHistory[];
}

export default function Home() {
  const [phone, setPhone] = useState('');
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(false);

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
      </form>

      {memberData && (
        <div className={styles.result}>
          <h2>{memberData.name} 회원님의 회비 현황</h2>
          
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
                <th>납부금액</th>
                <th>납부수단</th>
              </tr>
            </thead>
            <tbody>
              {memberData.feeHistory.map((fee: FeeHistory, index: number) => (
                <tr key={index}>
                  <td>{fee.date}</td>
                  <td>{fee.paid_fee.toLocaleString()}원</td>
                  <td>{fee.method.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}