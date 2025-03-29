import { Client } from '@notionhq/client';

export const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

export const MEMBER_DB_ID = '1c47c9ec930b8057bbd9f8b6708a0294';
export const FEE_DB_ID = '1c47c9ec930b8018a42bd84fd02124df';