'use client';
import Link from 'next/link';
import styles from './dashboard.module.css';
import Image from 'next/image';

export default function Dashboard() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Image
          src="/rotary-logo.png"
          alt="로타리 로고"
          width={80}
          height={80}
          className={styles.logo}
        />
        <h1>관리자 메뉴</h1>
      </div>
      <div className={styles.menuGrid}>
        <Link href="/admin/servicefee" className={styles.menuItem}>
          <span className={styles.menuIcon}>📝</span>
          <span className={styles.menuText}>봉사금 기록</span>
        </Link>
        <Link href="/admin/donation" className={styles.menuItem}>
          <span className={styles.menuIcon}>🎁</span>
          <span className={styles.menuText}>기부금 기록</span>
        </Link>
      </div>
      <Link href="/" className={styles.backButton}>
        메인으로 돌아가기
      </Link>
    </div>
  );
}