import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(request: Request) {
  try {
    const { id, paymentType, amount, date, method, paymentClass } = await request.json();

    if (!id || !paymentType || !amount || !date) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    let tableName: string;
    let updateData: any = {
      amount: parseFloat(amount),
      date,
      method: method || ['deposit']
    };

    switch (paymentType) {
      case 'fee':
        tableName = 'fees';
        break;
      case 'special':
        tableName = 'special_fees';
        break;
      case 'service':
        tableName = 'service_fees';
        break;
      case 'donation':
        tableName = 'donations';
        // 기부금의 경우 class 필드 추가
        if (paymentClass) {
          updateData.class = paymentClass;
        }
        break;
      default:
        return NextResponse.json(
          { error: '지원하지 않는 납부 유형입니다.' },
          { status: 400 }
        );
    }

    const { data, error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: '납부 내역이 성공적으로 수정되었습니다.',
      updatedData: data
    });

  } catch (error) {
    console.error('Error updating payment detail:', error);
    return NextResponse.json(
      { error: '납부 내역 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const paymentType = searchParams.get('type');

    if (!id || !paymentType) {
      return NextResponse.json(
        { error: 'ID와 납부 유형은 필수입니다.' },
        { status: 400 }
      );
    }

    let tableName: string;
    switch (paymentType) {
      case 'fee':
        tableName = 'fees';
        break;
      case 'special':
        tableName = 'special_fees';
        break;
      case 'service':
        tableName = 'service_fees';
        break;
      case 'donation':
        tableName = 'donations';
        break;
      default:
        return NextResponse.json(
          { error: '지원하지 않는 납부 유형입니다.' },
          { status: 400 }
        );
    }

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: '납부 내역이 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('Error deleting payment detail:', error);
    return NextResponse.json(
      { error: '납부 내역 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
} 