import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const paymentType = searchParams.get('type'); // 'fee', 'special', 'service', 'donation'
    const rotaryYear = searchParams.get('rotaryYear') || 'current';

    if (!memberId || !paymentType) {
      return NextResponse.json(
        { error: '회원 ID와 납부 유형은 필수입니다.' },
        { status: 400 }
      );
    }

    // 회기 기간 계산
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    let startDate: string, endDate: string;
    
    if (rotaryYear === 'current') {
      if (currentMonth >= 7) {
        startDate = `${currentYear}-07-01`;
        endDate = `${currentYear + 1}-06-30`;
      } else {
        startDate = `${currentYear - 1}-07-01`;
        endDate = `${currentYear}-06-30`;
      }
    } else {
      if (currentMonth >= 7) {
        startDate = `${currentYear - 1}-07-01`;
        endDate = `${currentYear}-06-30`;
      } else {
        startDate = `${currentYear - 2}-07-01`;
        endDate = `${currentYear - 1}-06-30`;
      }
    }

    let paymentDetails: any[] = [];

    switch (paymentType) {
      case 'fee':
        // 연회비 내역
        const { data: fees, error: feeError } = await supabase
          .from('fees')
          .select('*')
          .eq('member_id', memberId)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false });
        
        if (feeError) throw feeError;
        paymentDetails = fees || [];
        break;

      case 'special':
        // 특별회비 내역
        const { data: specialFees, error: specialError } = await supabase
          .from('special_fees')
          .select('*')
          .eq('member_id', memberId)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false });
        
        if (specialError) throw specialError;
        paymentDetails = specialFees || [];
        break;

      case 'service':
        // 봉사금 내역
        const { data: serviceFees, error: serviceError } = await supabase
          .from('service_fees')
          .select('*')
          .eq('member_id', memberId)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false });
        
        if (serviceError) throw serviceError;
        paymentDetails = serviceFees || [];
        break;

      case 'donation':
        // 기부금 내역
        const { data: donations, error: donationError } = await supabase
          .from('donations')
          .select('*')
          .eq('member_id', memberId)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false });
        
        if (donationError) throw donationError;
        paymentDetails = donations || [];
        break;

      default:
        return NextResponse.json(
          { error: '지원하지 않는 납부 유형입니다.' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      paymentType,
      memberId,
      rotaryYear,
      dateRange: `${startDate} ~ ${endDate}`,
      details: paymentDetails
    });

  } catch (error) {
    console.error('Error fetching payment details:', error);
    return NextResponse.json(
      { error: '납부 내역을 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 