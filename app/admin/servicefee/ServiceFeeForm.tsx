const handleMemberSelect = async (amount: number, method: typeof METHODS[number], memberId: string) => {
    if (!memberId) return;
  
    const member = members.find(m => m.id === memberId);
    if (!member) return;
  
    try {
      const response = await fetch('/api/addServiceFee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          memberId,
          amount,
          method
        }),
      });
  
      if (!response.ok) {
        throw new Error('봉사금 기록에 실패했습니다.');
      }
  
      const data = await response.json();
      console.log('Added service fee response:', data); // 응답 데이터 로깅
  
      setRecords(prev => [...prev, {
        id: data.id, // Notion에서 반환된 페이지 ID
        memberId,
        memberName: member.name,
        amount,
        method
      }]);
  
      // 성공 메시지 표시
      alert(`${member.name} 회원의 봉사금이 기록되었습니다.`);
    } catch (error) {
      console.error('Error adding service fee:', error);
      alert(error instanceof Error ? error.message : '봉사금 기록에 실패했습니다.');
    }
  };
  
  const handleDeleteRecord = async (record: ServiceFeeRecord) => {
    if (!confirm(`${record.memberName}님의 ${record.amount.toLocaleString()}원 기록을 삭제하시겠습니까?`)) {
      return;
    }
  
    try {
      console.log('Deleting record:', record); // 삭제할 레코드 로깅
  
      const response = await fetch('/api/deleteServiceFee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recordId: record.id }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '기록 삭제에 실패했습니다.');
      }
  
      setRecords(prev => prev.filter(r => r.id !== record.id));
      alert('기록이 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting record:', error);
      alert(error instanceof Error ? error.message : '기록 삭제에 실패했습니다.');
    }
  };