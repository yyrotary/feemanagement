'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './transactions.module.css';
import { Transaction } from '@/app/types/transaction';
import React from 'react';
import { checkAuthStatus, authenticateGmail, updateLatestTransactions } from '@/app/utils/gmailAuth';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 초기 로드 시 최근 1개월 거래내역 가져오기 및 인증 상태 확인
  useEffect(() => {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(oneMonthAgo.toISOString().split('T')[0]);
    
    fetchTransactions(oneMonthAgo.toISOString().split('T')[0], today.toISOString().split('T')[0]);
    
    // 인증 상태 확인
    checkAuthStatus();
  }, []);

  // 거래내역 조회 함수
  const fetchTransactions = async (start: string, end: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (start) queryParams.append('startDate', start);
      if (end) queryParams.append('endDate', end);
      
      const response = await fetch(`/api/getTransactions?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('거래내역을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : '거래내역을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 메일로부터 거래내역 동기화
  const syncTransactionsFromEmail = async () => {
    try {
      setSyncLoading(true);
      setError(null);
      
      const response = await fetch('/api/syncTransactions', {
        method: 'POST',
      });
      
      // 응답 데이터 추출
      const data = await response.json();
      
      if (!response.ok) {
        // 오류 메시지 표시
        const errorMessage = data.error || '거래내역 동기화에 실패했습니다.';
        
        // 인증 오류인 경우 인증 절차 안내
        if (errorMessage.includes('OAuth 인증 토큰이 없습니다') || 
            errorMessage.includes('인증 파일') || 
            errorMessage.includes('token')) {
          const confirmAuth = window.confirm(
            'Gmail API 인증이 필요합니다. 인증 절차를 진행하시겠습니까?'
          );
          
          if (confirmAuth) {
            await authenticateGmail();
            return;
          }
        } else if (errorMessage.includes('access_denied')) {
          // 액세스 거부 오류인 경우
          const confirmAuth = window.confirm(
            '이전 인증 요청이 거부되었습니다. 재인증을 진행하시겠습니까?'
          );
          
          if (confirmAuth) {
            await authenticateGmail();
            return;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // 성공 메시지 표시
      alert(`${data.message}\n\n동기화된 거래내역: ${data.count}건`);
      
      // 동기화 후 거래내역 다시 불러오기
      fetchTransactions(startDate, endDate);
      
      // 인증 상태 업데이트
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Error syncing transactions:', err);
      setError(err instanceof Error ? err.message : '거래내역 동기화에 실패했습니다.');
      alert(`오류: ${err instanceof Error ? err.message : '거래내역 동기화에 실패했습니다.'}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // 최신 거래내역 업데이트
  const updateLatestTransactions = async () => {
    try {
      setUpdateLoading(true);
      setError(null);
      
      const response = await fetch('/api/updateTransactions', {
        method: 'POST',
      });
      
      // 응답 데이터 추출
      const data = await response.json();
      
      if (!response.ok) {
        // 오류 메시지 표시
        const errorMessage = data.error || '거래내역 업데이트에 실패했습니다.';
        
        // 인증 오류인 경우 인증 절차 안내
        if (errorMessage.includes('OAuth 인증 토큰이 없습니다') || 
            errorMessage.includes('인증 파일') || 
            errorMessage.includes('token')) {
          const confirmAuth = window.confirm(
            'Gmail API 인증이 필요합니다. 인증 절차를 진행하시겠습니까?'
          );
          
          if (confirmAuth) {
            await authenticateGmail();
            return;
          }
        } else if (errorMessage.includes('access_denied')) {
          // 액세스 거부 오류인 경우
          const confirmAuth = window.confirm(
            '이전 인증 요청이 거부되었습니다. 재인증을 진행하시겠습니까?'
          );
          
          if (confirmAuth) {
            await authenticateGmail();
            return;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // 성공 메시지 표시
      const sinceDate = data.sinceDate ? new Date(data.sinceDate).toLocaleDateString() : '전체';
      alert(`${data.message}\n\n업데이트된 거래내역: ${data.count}건\n(${sinceDate} 이후 데이터)`);
      
      // 업데이트 후 거래내역 다시 불러오기
      fetchTransactions(startDate, endDate);
      
      // 인증 상태 업데이트
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Error updating transactions:', err);
      setError(err instanceof Error ? err.message : '거래내역 업데이트에 실패했습니다.');
      alert(`오류: ${err instanceof Error ? err.message : '거래내역 업데이트에 실패했습니다.'}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions(startDate, endDate);
  };

  // 금액 포맷 함수
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // 입금 금액 표시를 위한 스타일 클래스
  const getInAmountClass = (amount?: number): string => {
    return amount && amount > 0 ? styles.deposit : '';
  };

  // 출금 금액 표시를 위한 스타일 클래스 
  const getOutAmountClass = (amount?: number): string => {
    return amount && amount > 0 ? styles.withdrawal : '';
  };

  // 인증 상태에 따른 버튼 텍스트
  const getAuthButtonText = () => {
    if (authLoading) return 'Gmail 인증 중...';
    if (isAuthenticated === true) return 'Gmail API 인증됨 ✓';
    if (isAuthenticated === false) return 'Gmail API 인증하기';
    return 'Gmail API 인증 상태 확인 중...';
  };

  // 인증 상태에 따른 버튼 클래스
  const getAuthButtonClass = () => {
    if (isAuthenticated === true) {
      return `${styles.authButton} ${styles.authButtonSuccess}`;
    }
    return styles.authButton;
  };

  // CSV 파일 업로드
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadLoading(true);
      setError(null);

      // FormData 생성
      const formData = new FormData();
      formData.append('file', file);

      // API 호출
      const response = await fetch('/api/uploadTransactions', {
        method: 'POST',
        body: formData,
      });

      // 응답 데이터 추출
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'CSV 파일 업로드에 실패했습니다.');
      }

      // 성공 메시지 표시
      alert(`CSV 파일 업로드 완료!\n\n추가된 거래내역: ${data.newTransactions}건`);
      
      // 최신 데이터 다시 불러오기
      fetchTransactions(startDate, endDate);
      
    } catch (err) {
      console.error('Error uploading CSV:', err);
      setError(err instanceof Error ? err.message : 'CSV 파일 업로드에 실패했습니다.');
      alert(`오류: ${err instanceof Error ? err.message : 'CSV 파일 업로드에 실패했습니다.'}`);
    } finally {
      setUploadLoading(false);
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // CSV 파일 업로드 버튼 클릭 시 파일 선택 다이얼로그 표시
  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>통장 거래내역</h1>
        <div className={styles.buttonGroup}>
          <button 
            className={getAuthButtonClass()}
            onClick={authenticateGmail}
            disabled={authLoading || isAuthenticated === true}
          >
            {getAuthButtonText()}
          </button>
          <button 
            className={styles.syncButton} 
            onClick={syncTransactionsFromEmail}
            disabled={syncLoading}
          >
            {syncLoading ? '동기화 중...' : '이메일에서 거래내역 동기화'}
          </button>
          <button 
            className={styles.updateButton} 
            onClick={updateLatestTransactions}
            disabled={updateLoading}
          >
            {updateLoading ? '업데이트 중...' : '최신 거래내역 업데이트'}
          </button>
          <button 
            className={styles.uploadButton} 
            onClick={handleUploadButtonClick}
            disabled={uploadLoading}
          >
            {uploadLoading ? 'CSV 업로드 중...' : 'CSV 파일로 거래내역 추가'}
          </button>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef}
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSearch} className={styles.filtersContainer}>
        <div className={styles.filterGroup}>
          <label htmlFor="startDate" className={styles.label}>조회 시작일</label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={styles.input}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <label htmlFor="endDate" className={styles.label}>조회 종료일</label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={styles.input}
          />
        </div>
        
        <button type="submit" className={styles.searchButton} disabled={loading}>
          {loading ? '조회 중...' : '조회하기'}
        </button>
      </form>

      {loading ? (
        <div className={styles.loading}>거래내역을 불러오는 중...</div>
      ) : transactions.length > 0 ? (
        <table className={styles.transactionsTable}>
          <thead>
            <tr>
              <th>거래일</th>
              <th>입금</th>
              <th>출금</th>
              <th>잔액</th>
              <th>내용</th>
              <th>거래점</th>
              <th>거래은행</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td data-label="거래일">{transaction.date}</td>
                <td data-label="입금" className={`${styles.amount} ${getInAmountClass(transaction.in)}`}>
                  {transaction.in && transaction.in > 0 ? `${formatNumber(transaction.in)}원` : '-'}
                </td>
                <td data-label="출금" className={`${styles.amount} ${getOutAmountClass(transaction.out)}`}>
                  {transaction.out && transaction.out > 0 ? `${formatNumber(transaction.out)}원` : '-'}
                </td>
                <td data-label="잔액" className={styles.amount}>{formatNumber(transaction.balance)}원</td>
                <td data-label="내용" className={styles.description}>{transaction.description}</td>
                <td data-label="거래점">{transaction.branch}</td>
                <td data-label="거래은행">{transaction.bank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className={styles.noData}>
          조회된 거래내역이 없습니다.
        </div>
      )}

      <Link href="/admin/dashboard" className={styles.backButton}>
        관리자 메뉴로 돌아가기
      </Link>
    </div>
  );
} 