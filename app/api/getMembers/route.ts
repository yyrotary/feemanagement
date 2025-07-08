import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: members, error } = await supabase
      .from('members')
      .select('id, name, nickname, phone, join_date, member_fee, paid_fee, unpaid_fee')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: '회원 목록을 불러오는데 실패했습니다.' }, 
      { status: 500 }
    );
  }
}