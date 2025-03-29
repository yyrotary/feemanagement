import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

interface NotionMemberProperties {
  Name: {
    title: Array<{
      plain_text: string;
    }>;
  };
}

export async function GET() {
  try {
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.MEMBERS,
      sorts: [
        {
          property: 'Name',
          direction: 'ascending'
        }
      ]
    });

    const members = response.results.map((page) => {
      const pageObj = page as PageObjectResponse;
      const properties = pageObj.properties as unknown as NotionMemberProperties;
      return {
        id: pageObj.id,
        name: properties.Name.title[0].plain_text
      };
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: '회원 목록을 불러오는데 실패했습니다.' }, 
      { status: 500 }
    );
  }
}