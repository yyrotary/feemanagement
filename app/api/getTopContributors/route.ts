import { NextResponse } from 'next/server';
import { notionClient, MEMBER_DB_ID } from '../../../lib/notion';

export async function GET() {
  try {
    console.log('TopContributors API - Using direct member database with contribution field (formula)');
    
    // 회원 데이터베이스 전체 데이터 가져오기 (수식 필드로는 직접 정렬이 어려울 수 있음)
    const memberResponse = await notionClient.databases.query({
      database_id: MEMBER_DB_ID,
      page_size: 100, // 더 많은 회원 데이터 가져오기 (필요시 페이지네이션 추가)
    });
    
    console.log('TopContributors API - Members fetched:', memberResponse.results.length);
    
    // 결과 처리
    const contributors = [];
    
    for (const page of memberResponse.results) {
      try {
        const properties = (page as any).properties;
        
        if (!properties) continue;
        
        let memberName = '';
        let nickname = '';
        let totalAmount = 0;
        
        // 이름 필드 검색 - Name 또는 name
        if (properties.Name && properties.Name.title && properties.Name.title.length > 0) {
          memberName = properties.Name.title[0].plain_text;
        } 
        else if (properties.name && properties.name.title && properties.name.title.length > 0) {
          memberName = properties.name.title[0].plain_text;
        }
        
        // 별명 필드 검색
        if (properties.nick && properties.nick.rich_text && properties.nick.rich_text.length > 0) {
          nickname = properties.nick.rich_text[0].plain_text;
        }
        
        // 기여도 필드에서 금액 가져오기 (수식 속성)
        // 첫 번째 회원의 속성 정보 로깅하여 구조 확인
        if (page === memberResponse.results[0]) {
          console.log('First member properties:', JSON.stringify({
            hasContribution: !!properties.기여도,
            contributionType: properties.기여도?.type,
            formulaType: properties.기여도?.formula?.type
          }));
        }
        
        // 수식 속성의 다양한 타입 처리
        if (properties.기여도 && properties.기여도.formula) {
          const formula = properties.기여도.formula;
          
          // 수식 타입에 따라 적절하게 처리
          if (formula.type === 'number' && formula.number !== null) {
            totalAmount = formula.number;
          } else if (formula.type === 'string' && formula.string) {
            // 문자열인 경우 파싱 시도
            try {
              totalAmount = parseFloat(formula.string.replace(/[^\d.-]/g, '')) || 0;
            } catch {
              totalAmount = 0;
            }
          }
        }
        
        // 이름과 금액이 있는 경우만 추가
        if (memberName && totalAmount > 0) {
          contributors.push({
            id: page.id,
            name: memberName,
            nickname,
            totalAmount
          });
        }
      } catch (err) {
        console.error('Error processing member:', err);
        continue;
      }
    }
    
    // 금액 기준으로 정렬하고 상위 5개만 선택
    const topContributors = contributors
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);
    
    console.log('TopContributors API - Final contributors:', topContributors);
    
    return NextResponse.json({ contributors: topContributors });
  } catch (error) {
    console.error('Error fetching top contributors:', error);
    return NextResponse.json(
      { error: '데이터를 불러오는 중 오류가 발생했습니다.', contributors: [] },
      { status: 500 }
    );
  }
} 