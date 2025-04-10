import { Client } from '@notionhq/client';
import { getGmailClient } from './gmail';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export async function updateLatestTransactions() {
  const gmail = await getGmailClient();
  const messages = await gmail.users.messages.list({
    userId: 'me',
    q: 'from:securemail@wooribank.com subject:"입출금내역"',
    maxResults: 10
  });

  if (!messages.data.messages) return { success: false, message: 'No new messages' };

  const results = [];
  for (const message of messages.data.messages) {
    const fullMessage = await gmail.users.messages.get({
      userId: 'me',
      id: message.id!,
      format: 'full'
    });

    const htmlContent = fullMessage.data.payload?.parts?.[0]?.body?.data;
    if (!htmlContent) continue;

    const decodedContent = Buffer.from(htmlContent, 'base64').toString('utf-8');
    const transactions = parseTransactions(decodedContent);

    for (const transaction of transactions) {
      const existing = await notion.databases.query({
        database_id: process.env.NOTION_TRANSACTIONS_DB_ID!,
        filter: {
          and: [
            { property: 'Date', date: { equals: transaction.date } },
            { property: 'Amount', number: { equals: transaction.amount } },
            { property: 'Balance', number: { equals: transaction.balance } }
          ]
        }
      });

      if (existing.results.length === 0) {
        await notion.pages.create({
          parent: { database_id: process.env.NOTION_TRANSACTIONS_DB_ID! },
          properties: {
            Date: { date: { start: transaction.date } },
            Description: { title: [{ text: { content: transaction.description } }] },
            Amount: { number: transaction.amount },
            Balance: { number: transaction.balance }
          }
        });
        results.push(transaction);
      }
    }
  }

  return { success: true, newTransactions: results };
}

function parseTransactions(html: string) {
  // 기존 parseTransactions 함수 내용
  const transactions = [];
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
  
  for (const row of rows) {
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
    if (cells.length >= 4) {
      const date = cells[0].replace(/<[^>]*>/g, '').trim();
      const description = cells[1].replace(/<[^>]*>/g, '').trim();
      const amount = parseFloat(cells[2].replace(/<[^>]*>/g, '').replace(/,/g, '').trim());
      const balance = parseFloat(cells[3].replace(/<[^>]*>/g, '').replace(/,/g, '').trim());
      
      if (date && !isNaN(amount) && !isNaN(balance)) {
        transactions.push({ date, description, amount, balance });
      }
    }
  }
  
  return transactions;
} 