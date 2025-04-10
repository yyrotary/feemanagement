import { NextResponse } from 'next/server';
import { notionClient, NOTICES_DB_ID } from '../../../lib/notion';

export async function GET() {
  try {
    // 공지사항 데이터베이스가 존재한다고 가정
    // 실제 구현에서는 공지사항용 데이터베이스 ID를 constants.ts에 추가해야 합니다.
    const noticesResponse = await notionClient.databases.query({
      database_id: NOTICES_DB_ID || '', // DATABASE_IDS.NOTICES에서 직접 ID 사용으로 변경
      sorts: [
        {
          property: 'date',
          direction: 'descending',
        },
      ],
      page_size: 5, // 최근 5개 공지사항만 가져옴
    });

    const notices = noticesResponse.results.map(page => {
      const properties = (page as any).properties;
      
      return {
        id: page.id,
        date: properties.date?.date?.start || '',
        title: properties.Name?.title?.[0]?.plain_text || '제목 없음',
        content: properties.content?.rich_text?.[0]?.plain_text || '내용 없음',
        important: properties.important?.checkbox || false,
      };
    });

    return NextResponse.json({ notices });

  } catch (error) {
    console.error('Error fetching notices:', error);
    
    // 공지사항 데이터베이스가 없을 경우 기본 공지사항 반환
    // 실제 구현 시에는 데이터베이스를 만들어야 함
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