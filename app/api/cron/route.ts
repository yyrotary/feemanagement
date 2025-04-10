import { NextResponse } from 'next/server';
import { updateLatestTransactions } from '@/app/api/updateTransactions/route';


export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Cron job started: Updating latest transactions');
    const result = await updateLatestTransactions();
    console.log('Cron job completed:', result);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 