import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 공지사항 데이터 조회 (최근 5개)
    const { data: notices, error } = await supabase
      .from('notices')
      .select('*')
      .order('date', { ascending: false })
      .limit(5);

    if (error) {
      throw new Error(`공지사항 조회 실패: ${error.message}`);
    }

    // 데이터 매핑
    const mappedNotices = notices?.map(notice => ({
      id: notice.id,
      date: notice.date || '',
      title: notice.title || '제목 없음',
      content: notice.content || '내용 없음',
      important: notice.important || false,
    })) || [];

    // notices 데이터가 없을 경우 기본 공지사항 반환
    if (mappedNotices.length === 0) {
      const defaultNotices = [
        {
          id: '1',
          date: new Date().toISOString().split('T')[0],
          title: '공지사항 기능이 준비 중입니다',
          content: '공지사항 기능이 곧 추가될 예정입니다. 조금만 기다려주세요.',
          important: true,
        }
      ];
      return NextResponse.json({ notices: defaultNotices });
    }

    return NextResponse.json({ notices: mappedNotices });

  } catch (error) {
    console.error('Error fetching notices:', error);
    
    // 에러 발생 시 기본 공지사항 반환
    const defaultNotices = [
      {
        id: '1',
        date: new Date().toISOString().split('T')[0],
        title: '공지사항 기능이 준비 중입니다',
        content: '공지사항 기능이 곧 추가될 예정입니다. 조금만 기다려주세요.',
        important: true,
      }
    ];
    
    return NextResponse.json({ notices: defaultNotices });
  }
} 