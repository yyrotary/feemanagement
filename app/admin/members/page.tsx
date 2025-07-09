'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './members.module.css';

interface Member {
  id: number;
  name: string;
  nickname?: string;
  phone?: string;
  join_date: string;
  member_type?: 'regular' | 'junior' | 'emeritus';
  member_fee?: number;
}

export default function MembersManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'junior' | 'emeritus' | 'regular'>('all');

  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    phone: '',
    join_date: '',
    member_type: 'regular' // regular, senior, emeritus
  });

  // 통계 정보
  const [stats, setStats] = useState({
    total: 0,
    junior: 0,
    emeritus: 0,
    regular: 0
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/getMembers');
      if (!response.ok) {
        throw new Error('회원 정보 조회 실패');
      }
      const data = await response.json();
      setMembers(data);
      calculateStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원 정보 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (memberList: Member[]) => {
    const junior = memberList.filter(m => m.member_type === 'junior').length;
    const emeritus = memberList.filter(m => m.member_type === 'emeritus').length;
    const regular = memberList.filter(m => !m.member_type || m.member_type === 'regular').length;
    setStats({
      total: memberList.length,
      junior,
      emeritus,
      regular
    });
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Backend 형식에 맞춰 데이터 변환
      const deduction = formData.member_type === 'junior' ? ['junior'] : 
                       formData.member_type === 'emeritus' ? ['emeritus'] : [];
      
      const response = await fetch('/api/addMember', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          nickname: formData.nickname,
          phone: formData.phone,
          joinDate: formData.join_date,
          deduction: deduction
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '회원 추가 실패');
      }
      
      await fetchMembers();
      resetForm();
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원 추가 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    
    try {
      setLoading(true);
      
      // Backend 형식에 맞춰 데이터 변환
      const deduction = formData.member_type === 'junior' ? ['junior'] : 
                       formData.member_type === 'emeritus' ? ['emeritus'] : [];
      
      const response = await fetch('/api/updateMember', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMember.id,
          name: formData.name,
          nickname: formData.nickname,
          phone: formData.phone,
          joinDate: formData.join_date,
          deduction: deduction
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '회원 정보 수정 실패');
      }
      
      await fetchMembers();
      resetForm();
      setEditingMember(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원 정보 수정 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm('정말 이 회원을 삭제하시겠습니까?')) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/deleteMember', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '회원 삭제 실패');
      }
      
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원 삭제 실패');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      nickname: '',
      phone: '',
      join_date: '',
      member_type: 'regular'
    });
  };

  const startEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      nickname: member.nickname || '',
      phone: member.phone || '',
      join_date: member.join_date,
      member_type: member.member_type || 'regular'
    });
  };

  const cancelEdit = () => {
    setEditingMember(null);
    resetForm();
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (member.nickname?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'junior' && member.member_type === 'junior') ||
                         (filterType === 'emeritus' && member.member_type === 'emeritus') ||
                         (filterType === 'regular' && (!member.member_type || member.member_type === 'regular'));
    return matchesSearch && matchesFilter;
  });

  if (loading && members.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>회원 관리</h1>
          <Link href="/admin/dashboard" className={styles.backButton}>
            ← 관리자 메뉴
          </Link>
        </div>
      </div>

             {/* 통계 카드 */}
       <div className={styles.statsGrid}>
         <div className={styles.statCard}>
           <div className={styles.statNumber}>{stats.total}</div>
           <div className={styles.statLabel}>전체 회원</div>
         </div>
         <div className={styles.statCard}>
           <div className={styles.statNumber}>{stats.junior}</div>
           <div className={styles.statLabel}>주니어 회원</div>
         </div>
         <div className={styles.statCard}>
           <div className={styles.statNumber}>{stats.emeritus}</div>
           <div className={styles.statLabel}>원로 회원</div>
         </div>
         <div className={styles.statCard}>
           <div className={styles.statNumber}>{stats.regular}</div>
           <div className={styles.statLabel}>일반 회원</div>
         </div>
       </div>

      {/* 검색 및 필터 */}
      <div className={styles.searchSection}>
        <div className={styles.searchControls}>
          <input
            type="text"
            placeholder="회원명 또는 닉네임 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
                     <select 
             value={filterType} 
             onChange={(e) => setFilterType(e.target.value as 'all' | 'junior' | 'emeritus' | 'regular')}
             className={styles.filterSelect}
           >
             <option value="all">전체</option>
             <option value="junior">주니어</option>
             <option value="emeritus">원로</option>
             <option value="regular">일반</option>
           </select>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className={styles.addButton}
          >
            {showAddForm ? '취소' : '+ 회원 추가'}
          </button>
        </div>
      </div>

      {/* 회원 추가 폼 */}
      {showAddForm && (
        <div className={styles.formSection}>
          <h3>새 회원 추가</h3>
          <form onSubmit={handleAddMember} className={styles.memberForm}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>이름 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>닉네임</label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>전화번호</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className={styles.formGroup}>
                <label>입회일</label>
                <input
                  type="date"
                  value={formData.join_date}
                  onChange={(e) => setFormData({...formData, join_date: e.target.value})}
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>회원 구분</label>
                <select
                  value={formData.member_type}
                  onChange={(e) => setFormData({...formData, member_type: e.target.value as 'regular' | 'junior' | 'emeritus'})}
                  className={styles.selectInput}
                >
                  <option value="regular">일반 회원 (연회비 720,000원)</option>
                  <option value="junior">주니어 회원 (연회비 360,000원)</option>
                  <option value="emeritus">원로 회원 (연회비 200,000원)</option>
                </select>
              </div>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.submitButton}>
                회원 추가
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className={styles.cancelButton}>
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 회원 수정 폼 */}
      {editingMember && (
        <div className={styles.formSection}>
          <h3>회원 정보 수정</h3>
          <form onSubmit={handleUpdateMember} className={styles.memberForm}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>이름 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>닉네임</label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>전화번호</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className={styles.formGroup}>
                <label>입회일</label>
                <input
                  type="date"
                  value={formData.join_date}
                  onChange={(e) => setFormData({...formData, join_date: e.target.value})}
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>회원 구분</label>
                <select
                  value={formData.member_type}
                  onChange={(e) => setFormData({...formData, member_type: e.target.value as 'regular' | 'junior' | 'emeritus'})}
                  className={styles.selectInput}
                >
                  <option value="regular">일반 회원 (연회비 720,000원)</option>
                  <option value="junior">주니어 회원 (연회비 360,000원)</option>
                  <option value="emeritus">원로 회원 (연회비 200,000원)</option>
                </select>
              </div>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.submitButton}>
                수정 완료
              </button>
              <button type="button" onClick={cancelEdit} className={styles.cancelButton}>
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 회원 목록 */}
      <div className={styles.membersList}>
        <div className={styles.listHeader}>
          <h3>회원 목록 ({filteredMembers.length}명)</h3>
        </div>
        
        {filteredMembers.length === 0 ? (
          <div className={styles.noMembers}>
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 회원이 없습니다.'}
          </div>
        ) : (
          <div className={styles.membersGrid}>
            {filteredMembers.map(member => (
              <div key={member.id} className={styles.memberCard}>
                <div className={styles.memberInfo}>
                  <div className={styles.memberName}>
                    {member.name}
                    {member.member_type === 'junior' && (
                      <span className={styles.juniorBadge}>주니어</span>
                    )}
                    {member.member_type === 'emeritus' && (
                      <span className={styles.emeritusBadge}>원로</span>
                    )}
                  </div>
                  {member.nickname && (
                    <div className={styles.memberNickname}>({member.nickname})</div>
                  )}
                  {member.phone && (
                    <div className={styles.memberPhone}>📱 {member.phone}</div>
                  )}
                  <div className={styles.memberJoinDate}>
                    🗓️ {new Date(member.join_date).toLocaleDateString()}
                  </div>
                </div>
                <div className={styles.memberActions}>
                  <button 
                    onClick={() => startEdit(member)}
                    className={styles.editButton}
                  >
                    수정
                  </button>
                  <button 
                    onClick={() => handleDeleteMember(member.id)}
                    className={styles.deleteButton}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
          <button onClick={() => setError(null)} className={styles.closeError}>
            ×
          </button>
        </div>
      )}
    </div>
  );
} 