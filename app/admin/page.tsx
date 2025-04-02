'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/verifyAdmin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push('/admin/dashboard');
      } else {
        alert(data.error || '비밀번호가 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.logoContainer}>
          <Image
            src="/logo.png"
            alt="로고"
            width={200}
            height={200}
            priority
          />
        </div>
        <button onClick={() => router.push('/admin/dashboard')} className={styles.loginButton}>
          관리자 메뉴로 들어가기
        </button>
      </div>
    </div>
  );
}

export function AdminPage() {
  return (
    <div className={styles.container}>
      <h1>관리자 메뉴</h1>
      <div className={styles.menuGrid}>
        <Link href="/admin/fee" className={styles.menuItem}>
          <div className={styles.menuIcon}>
            <Image
              src="/icons/fee.png"
              alt="회비 아이콘"
              width={48}
              height={48}
            />
          </div>
          <span>회비 기록</span>
        </Link>
        <Link href="/admin/servicefee" className={styles.menuItem}>
          <div className={styles.menuIcon}>
            <Image
              src="/icons/service.png"
              alt="봉사 아이콘"
              width={48}
              height={48}
            />
          </div>
          <span>봉사 회비 기록</span>
        </Link>
        <Link href="/admin/donation" className={styles.menuItem}>
          <div className={styles.menuIcon}>
            <Image
              src="/icons/donation.png"
              alt="기부 아이콘"
              width={48}
              height={48}
            />
          </div>
          <span>기부 기록</span>
        </Link>
        <Link href="/admin/masterinfo" className={styles.menuItem}>
          <div className={styles.menuIcon}>
            <Image
              src="/icons/settings.png"
              alt="설정 아이콘"
              width={48}
              height={48}
            />
          </div>
          <span>기본 정보 관리</span>
        </Link>
      </div>
    </div>
  );
}