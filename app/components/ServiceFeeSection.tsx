import { useState, useEffect } from 'react';
import styles from './ServiceFeeSection.module.css';

// 금액 포맷 함수 추가
const formatNumber = (number: number | undefined): string => {
  if (number === undefined) return '0';
  return number.toLocaleString();
};

interface ServiceFee {
  id: string;
  date: string;
  amount: number;
  method: string[];
}

interface ServiceFeeSectionProps {
  memberId: string;
  memberName: string;
  nickname?: string;
  date?: string;
}

// 납부 방법 변환 함수
const formatPaymentMethod = (methods: string[] | undefined): string => {
  console.log('Service Fee methods received:', methods);
  
  if (!methods || methods.length === 0) return '입금';
  
  return methods.map(method => {
    const lowerMethod = method.toLowerCase().trim();
    if (lowerMethod === 'cash') return '현금';
    if (lowerMethod === 'card') return '카드';
    if (lowerMethod === 'deposit') return '입금';
    return method;
  }).join(', ');
};

export default function ServiceFeeSection({ memberId, date }: ServiceFeeSectionProps) {
  const [fees, setFees] = useState<ServiceFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const REQUIRED_SERVICE_FEE = 500000;

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

        // 쿼리 파라미터 구성
        const queryParams = new URLSearchParams();
        queryParams.append('memberId', memberId);
        
        // 날짜가 있는 경우 추가
        if (date) {
          queryParams.append('date', date);
        }
        
        const response = await fetch(`/api/getServiceFees?${queryParams.toString()}`);
        
        // 응답이 성공적이지 않은 경우
        if (!response.ok) {
          const errorText = await response.text(); // 텍스트로 읽어보기
          console.error('API error response:', response.status, errorText);
          
          try {
            // JSON 형식인 경우 파싱
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || '봉사금 내역을 불러오는데 실패했습니다.');
          } catch (e) {
            // JSON 파싱 실패 시 상태 코드와 함께 에러 메시지 표시
            console.error('Error fetching service fee data:', e);
            throw new Error(`봉사금 내역을 불러오는데 실패했습니다. (${response.status})`);
          }
        }

        const data = await response.json();
        
        // fees 배열이 있는지 확인
        if (Array.isArray(data.fees)) {
          setFees(data.fees);
        } else {
          console.error('Invalid API response format:', data);
          setFees([]);
          setError('서버에서 잘못된 형식의 데이터를 반환했습니다.');
        }
      } catch (err) {
        console.error('Error fetching service fee data:', err);
        setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
        setFees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [memberId, date]);

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
          <p>{formatNumber(totalPaid)}원</p>
        </div>

        {/* 미납 총액 */}
        <div className={styles.unpaidAmount}>
          <h3>미납 봉사금</h3>
          <p>
            {formatNumber(remainingFee)}원
            <span className={styles.requiredFee}>(의무봉사금 {formatNumber(REQUIRED_SERVICE_FEE)}원)</span>
          </p>
        </div>
      </div>

      {/* 납부 내역 */}
      <section className={styles.section}>
        <div className={styles.paymentHeader}>
          <span>날짜</span>
          <span>금액</span>
          <span>납부</span>
        </div>
        <div className={styles.paymentList}>
          {fees && fees.length > 0 ? (
            <ul className={styles.list}>
              {fees.map((fee) => (
                <li key={fee.id} className={styles.paymentItem}>
                  <span className={styles.paymentDate}>
                    {new Date(fee.date).toLocaleDateString('ko-KR', {
                      year: '2-digit',
                      month: '2-digit',
                      day: '2-digit',
                    }).replace(/\. /g, '.').replace(/\.$/, '')}
                  </span>
                  <span className={styles.paymentAmount}>{formatNumber(fee.amount)}원</span>
                  <span className={styles.paymentMethod}>
                    {formatPaymentMethod(fee.method)}
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