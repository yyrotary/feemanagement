import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getEmailContent } from '@/lib/email';
import { parseTransactionEmail } from '@/lib/transactionParser';
import { filterDuplicates } from '@/lib/transactionUtils';

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const oauth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

export async function GET() {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Gmail API 설정
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // 최근 1시간 동안의 이메일 검색
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const searchQuery = `from:securemail@wooribank.com after:${Math.floor(oneHourAgo.getTime() / 1000)}`;

    const { data: { messages = [] } } = await gmail.users.messages.list({
      userId: 'me',
      q: searchQuery,
    });

    if (!messages.length) {
      return NextResponse.json({ message: 'No new transactions found' });
    }

    // 각 이메일 처리
    const newTransactions = [];
    for (const message of messages) {
      const emailContent = await getEmailContent(gmail, message.id!);
      const transactions = parseTransactionEmail(emailContent);
      newTransactions.push(...transactions);
    }

    if (newTransactions.length === 0) {
      return NextResponse.json({ message: 'No new transactions found' });
    }

    // 중복 거래 필터링
    const filteredTransactions = await filterDuplicates(newTransactions);

    if (filteredTransactions.length === 0) {
      return NextResponse.json({ message: 'No new transactions to add' });
    }

    // Notion에 거래 내역 저장
    const results = await Promise.all(
      filteredTransactions.map(async (transaction) => {
        try {
          const response = await notion.pages.create({
            parent: { database_id: process.env.NOTION_TRANSACTIONS_DATABASE_ID! },
            properties: {
              날짜: {
                date: {
                  start: transaction.date,
                },
              },
              입금: {
                number: transaction.deposit,
              },
              출금: {
                number: transaction.withdrawal,
              },
              잔액: {
                number: transaction.balance,
              },
              거래내용: {
                title: [
                  {
                    text: {
                      content: transaction.description,
                    },
                  },
                ],
              },
              지점: {
                rich_text: [
                  {
                    text: {
                      content: transaction.branch || '',
                    },
                  },
                ],
              },
              은행: {
                rich_text: [
                  {
                    text: {
                      content: transaction.bank || '',
                    },
                  },
                ],
              },
            },
          });
          return { success: true, id: response.id };
        } catch (error) {
          console.error('Error creating transaction:', error);
          return { success: false, error };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: 'Transactions updated successfully',
      total: filteredTransactions.length,
      success: successCount,
      errors: errorCount,
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { error: 'Failed to update transactions' },
      { status: 500 }
    );
  }
} 