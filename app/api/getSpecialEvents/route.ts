import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';
import { 
  PageObjectResponse,
  PartialPageObjectResponse,
  DatabaseObjectResponse,
  PartialDatabaseObjectResponse
} from '@notionhq/client/build/src/api-endpoints';

interface NotionEventProperties {
  Name: {
    title: Array<{
      plain_text: string;
    }>;
  };
  Date: {
    date: {
      start: string;
    };
  };
}

type NotionPage = PageObjectResponse | PartialPageObjectResponse | DatabaseObjectResponse | PartialDatabaseObjectResponse;

function isFullPage(page: NotionPage): page is PageObjectResponse {
  return 'properties' in page;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberName = searchParams.get('memberName');

    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.SPECIAL_EVENTS,
    });

    const events = response.results.map((page) => {
      if (!isFullPage(page)) {
        throw new Error('Invalid page object from Notion API');
      }
      const properties = page.properties as unknown as NotionEventProperties;

      return {
        id: page.id,
        name: properties.Name?.title[0]?.plain_text || '',
        date: properties.Date?.date?.start || '',
        isPersonal: memberName ? properties.Name?.title[0]?.plain_text?.includes(memberName) : false,
      };
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching special events:', error);
    return NextResponse.json({ 
      error: '특별 경조사 목록을 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}