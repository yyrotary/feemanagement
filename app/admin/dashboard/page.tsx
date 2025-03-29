'use client';
import Link from 'next/link';
import styles from './dashboard.module.css';

export default function Dashboard() {
  return (
    <div className={styles.container}>
      <h1>관리자 메뉴</h1>
      <div className={styles.menuGrid}>
        <Link href="/admin/servicefee" className={styles.menuItem}>
          주회 기록지
        </Link>
      </div>
      <Link href="/" className={styles.backButton}>
        메인으로 돌아가기
      </Link>
    </div>
  );
}