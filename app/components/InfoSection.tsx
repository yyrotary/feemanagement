import { useState, useEffect } from 'react';
import styles from './InfoSection.module.css';

interface Contributor {
  id: string;
  name: string;
  nickname?: string;
  totalAmount: number;
}

interface Notice {
  id: string;
  date: string;
  title: string;
  content: string;
  important: boolean;
}

export default function InfoSection() {
  const [activeTab, setActiveTab] = useState<'notices' | 'contributors'>('contributors');
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rotaryYear, setRotaryYear] = useState<'current' | 'previous'>('current');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 두 API 호출을 병렬로 처리
        const [noticesRes, contributorsRes] = await Promise.all([
          fetch('/api/getNotices'),
          fetch(`/api/getTopContributors?rotaryYear=${rotaryYear}`)
        ]);

        if (!noticesRes.ok) {
          console.error('Notices API error:', noticesRes.status, noticesRes.statusText);
        }
        
        if (!contributorsRes.ok) {
          console.error('Contributors API error:', contributorsRes.status, contributorsRes.statusText);
        }

        if (!noticesRes.ok && !contributorsRes.ok) {
          throw new Error('데이터를 불러오는데 실패했습니다.');
        }

        const noticesData = noticesRes.ok ? await noticesRes.json() : { notices: [] };
        const contributorsData = contributorsRes.ok ? await contributorsRes.json() : { contributors: [] };
        
        console.log('InfoSection - Notices fetched:', noticesData.notices?.length);
        console.log('InfoSection - Contributors fetched:', contributorsData.contributors?.length);

        setNotices(noticesData.notices || []);
        setContributors(contributorsData.contributors || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [rotaryYear]);

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\. /g, '.').replace(/\.$/, '');
  };

  // 금액 포맷 함수
  const formatAmount = (amount: number) => {
    return amount.toLocaleString() + '원';
  };

  // 기여자 정보 표시
  const renderContributor = (contributor: Contributor, index: number) => {
    return (
      <div key={contributor.id} className={styles.contributorItem}>
        <span className={styles.contributorRank}>
          {index + 1}
        </span>
        <div className={styles.contributorInfo}>
          <div className={styles.nameContainer}>
            {contributor.nickname ? (
              <>
                <span className={styles.contributorNickname}>{contributor.nickname}</span>
                <span className={styles.contributorName}>{contributor.name}</span>
              </>
            ) : (
              <span className={styles.contributorName}>{contributor.name}</span>
            )}
          </div>
        </div>
        <span className={styles.contributorAmount}>
          {formatAmount(contributor.totalAmount)}
        </span>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.tabButtons}>
        <button
          className={`${styles.tabButton} ${activeTab === 'notices' ? styles.active : ''}`}
          onClick={() => setActiveTab('notices')}
        >
          공지사항
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'contributors' ? styles.active : ''}`}
          onClick={() => setActiveTab('contributors')}
        >
          기여자 TOP 5
        </button>
      </div>

      <div className={styles.tabContent}>
        {loading ? (
          <div className={styles.loading}>로딩 중...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : activeTab === 'notices' ? (
          <div className={styles.noticesContainer}>
            {notices.length > 0 ? (
              notices.map((notice) => (
                <div 
                  key={notice.id} 
                  className={`${styles.noticeItem} ${notice.important ? styles.important : ''}`}
                >
                  <div className={styles.noticeHeader}>
                    <span className={styles.noticeDate}>{formatDate(notice.date)}</span>
                    <h3 className={styles.noticeTitle}>{notice.title}</h3>
                  </div>
                  <p className={styles.noticeContent}>{notice.content}</p>
                </div>
              ))
            ) : (
              <p className={styles.emptyMessage}>등록된 공지사항이 없습니다.</p>
            )}
          </div>
        ) : (
          <div className={styles.contributorsContainer}>
            <h3 className={styles.contributorsTitle}>기여자 TOP 5</h3>
            <p className={styles.contributorsSubtitle}>(봉사금, 기부금, 우정기부금 합산)</p>
            
            {/* 회기 선택 버튼 */}
            <div className={styles.rotaryYearSelector}>
              <button
                className={rotaryYear === 'current' ? styles.activeRotaryYear : styles.inactiveRotaryYear}
                onClick={() => setRotaryYear('current')}
              >
                현재 회기 (25-26)
              </button>
              <button
                className={rotaryYear === 'previous' ? styles.activeRotaryYear : styles.inactiveRotaryYear}
                onClick={() => setRotaryYear('previous')}
              >
                이전 회기 (24-25)
              </button>
            </div>
            
            {contributors && contributors.length > 0 ? (
              <div className={styles.contributorsList}>
                {contributors.map(renderContributor)}
              </div>
            ) : (
              <p className={styles.emptyMessage}>기여자 정보가 없습니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 