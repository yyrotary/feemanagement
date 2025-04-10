import { NextResponse } from 'next/server';
import { updateLatestTransactions, checkAuthStatus, authenticateGmail } from '@/app/admin/transactions/page';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Cron job started: Checking Gmail API authentication');
    
    // Gmail API 인증 상태 확인
    const isAuthenticated = await checkAuthStatus();
    
    if (!isAuthenticated) {
      console.log('Gmail API not authenticated. Attempting to authenticate...');
      const authResult = await authenticateGmail();
      if (!authResult.success) {
        console.error('Gmail API authentication failed:', authResult.error);
        return NextResponse.json(
          { success: false, error: 'Gmail API authentication failed' },
          { status: 401 }
        );
      }
      console.log('Gmail API authentication successful');
    }

    
    console.log('Cron job started: Updating latest transactions');
    //const result = await updateLatestTransactions(); 이거 쓰지마 
    const result = await fetch('@/api/updateTransactions', {
        method: 'POST',
      });


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