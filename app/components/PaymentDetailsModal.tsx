'use client';
import { useState, useEffect } from 'react';
import styles from './PaymentDetailsModal.module.css';

interface PaymentDetail {
  id: number;
  amount: number;
  date: string;
  method: string[] | string;
  class?: string[] | string;
}

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: number;
  memberName: string;
  paymentType: 'fee' | 'special' | 'service' | 'donation';
  rotaryYear: string;
  onUpdate?: () => void;
}

const PAYMENT_TYPE_LABELS = {
  fee: '연회비',
  special: '특별회비',
  service: '봉사금',
  donation: '기부금'
};

const PAYMENT_METHODS = [
  { value: 'cash', label: '현금' },
  { value: 'card', label: '카드' },
  { value: 'deposit', label: '입금' }
];

const DONATION_CLASSES = [
  '폴리오', '재단', '지역사회', '청소년', '환경', '평화', '경제적자립', 
  '모자보건', '기본교육', '물관리', '질병예방', '우정기부'
];

export default function PaymentDetailsModal({
  isOpen,
  onClose,
  memberId,
  memberName,
  paymentType,
  rotaryYear,
  onUpdate
}: PaymentDetailsModalProps) {
  const [details, setDetails] = useState<PaymentDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    date: '',
    method: ['deposit'],
    paymentClass: ['']
  });

  useEffect(() => {
    if (isOpen) {
      fetchPaymentDetails();
    }
  }, [isOpen, memberId, paymentType, rotaryYear]);

  const fetchPaymentDetails = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        memberId: memberId.toString(),
        type: paymentType,
        rotaryYear
      });

      const response = await fetch(`/api/getPaymentDetails?${params}`);
      const data = await response.json();

      if (data.success) {
        setDetails(data.details);
      } else {
        alert('납부 내역을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatPaymentMethod = (methods: string[] | string): string => {
    if (!methods) return '입금';
    
    // 문자열인 경우 배열로 변환
    const methodArray = Array.isArray(methods) ? methods : [methods];
    
    if (methodArray.length === 0) return '입금';
    
    return methodArray.map(method => {
      const lowerMethod = method.toLowerCase().trim();
      if (lowerMethod === 'cash') return '현금';
      if (lowerMethod === 'card') return '카드';
      if (lowerMethod === 'deposit') return '입금';
      return method;
    }).join(', ');
  };

  const formatPaymentClass = (classes: string[] | string): string => {
    if (!classes) return '';
    
    // 문자열인 경우 배열로 변환
    const classArray = Array.isArray(classes) ? classes : [classes];
    
    if (classArray.length === 0) return '';
    return classArray.join(', ');
  };

  const startEdit = (detail: PaymentDetail) => {
    setEditingId(detail.id);
    setEditForm({
      amount: detail.amount.toString(),
      date: detail.date,
      method: Array.isArray(detail.method) ? detail.method : [detail.method || 'deposit'],
      paymentClass: Array.isArray(detail.class) ? detail.class : [detail.class || '']
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      amount: '',
      date: '',
      method: ['deposit'],
      paymentClass: ['']
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;

    try {
      const updateData: any = {
        id: editingId,
        paymentType,
        amount: parseFloat(editForm.amount),
        date: editForm.date,
        method: editForm.method
      };

      // 기부금의 경우 class 정보 추가
      if (paymentType === 'donation') {
        updateData.paymentClass = editForm.paymentClass.filter(c => c.trim() !== '');
      }

      const response = await fetch('/api/updatePaymentDetail', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (data.success) {
        alert('납부 내역이 수정되었습니다.');
        await fetchPaymentDetails();
        if (onUpdate) onUpdate();
        cancelEdit();
      } else {
        alert(data.error || '수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error updating payment detail:', error);
      alert('서버 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 납부 내역을 삭제하시겠습니까?')) return;

    try {
      const params = new URLSearchParams({
        id: id.toString(),
        type: paymentType
      });

      const response = await fetch(`/api/updatePaymentDetail?${params}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('납부 내역이 삭제되었습니다.');
        await fetchPaymentDetails();
        if (onUpdate) onUpdate();
      } else {
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting payment detail:', error);
      alert('서버 오류가 발생했습니다.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{memberName} - {PAYMENT_TYPE_LABELS[paymentType]} 납부 내역</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          {loading ? (
            <div className={styles.loading}>납부 내역을 불러오는 중...</div>
          ) : details.length === 0 ? (
            <div className={styles.empty}>납부 내역이 없습니다.</div>
          ) : (
            <div className={styles.detailsList}>
              {details.map((detail) => (
                <div key={detail.id} className={styles.detailItem}>
                  {editingId === detail.id ? (
                    // 수정 모드
                    <div className={styles.editForm}>
                      <div className={styles.formRow}>
                        <label>날짜:</label>
                        <input
                          type="date"
                          value={editForm.date}
                          onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                          className={styles.input}
                        />
                      </div>
                      <div className={styles.formRow}>
                        <label>금액:</label>
                        <input
                          type="number"
                          value={editForm.amount}
                          onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                          className={styles.input}
                        />
                      </div>
                      <div className={styles.formRow}>
                        <label>납부방법:</label>
                        <select
                          value={editForm.method[0] || 'deposit'}
                          onChange={(e) => setEditForm({...editForm, method: [e.target.value]})}
                          className={styles.select}
                        >
                          {PAYMENT_METHODS.map(method => (
                            <option key={method.value} value={method.value}>
                              {method.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {paymentType === 'donation' && (
                        <div className={styles.formRow}>
                          <label>기부 분류:</label>
                          <select
                            value={editForm.paymentClass[0] || ''}
                            onChange={(e) => setEditForm({...editForm, paymentClass: [e.target.value]})}
                            className={styles.select}
                          >
                            <option value="">선택하세요</option>
                            {DONATION_CLASSES.map(className => (
                              <option key={className} value={className}>
                                {className}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className={styles.formActions}>
                        <button onClick={handleUpdate} className={styles.saveButton}>
                          저장
                        </button>
                        <button onClick={cancelEdit} className={styles.cancelButton}>
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 보기 모드
                    <div className={styles.detailContent}>
                      <div className={styles.detailInfo}>
                        <span className={styles.date}>
                          {new Date(detail.date).toLocaleDateString('ko-KR')}
                        </span>
                        <span className={styles.amount}>
                          {detail.amount.toLocaleString()}원
                        </span>
                        <span className={styles.method}>
                          {formatPaymentMethod(detail.method)}
                        </span>
                        {paymentType === 'donation' && detail.class && (
                          <span className={styles.class}>
                            {formatPaymentClass(detail.class)}
                          </span>
                        )}
                      </div>
                      <div className={styles.actions}>
                        <button 
                          onClick={() => startEdit(detail)}
                          className={styles.editButton}
                        >
                          수정
                        </button>
                        <button 
                          onClick={() => handleDelete(detail.id)}
                          className={styles.deleteButton}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 