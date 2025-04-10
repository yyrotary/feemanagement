# API 개발 가이드라인

## 1. 공통 타입 사용하기

모든 API 개발 시 `app/types` 디렉토리에 있는 공통 타입을 활용하세요. 이는 코드의 일관성과 유지보수성을 높이고 에러 가능성을 줄이는 데 도움이 됩니다.

### 주요 공통 타입 파일

- `app/types/notionProperties.ts`: Notion API로부터 받는 데이터 구조를 정의
- `app/types/transaction.ts`: 거래내역 관련 데이터 구조
- `app/types/member.ts`: 회원 관련 데이터 구조
- `app/types/donation.ts`: 기부 관련 데이터 구조
- `app/types/specialFee.ts`: 특별회비 관련 데이터 구조

### 사용 예시

```typescript
// 올바른 방법 (O)
import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';
import { NotionMemberProperties } from '@/app/types/notionProperties';
import { Member, MemberResponse } from '@/app/types/member';

export async function GET() {
  // API 코드...
  const members: Member[] = data.map(...);
  return NextResponse.json({ members } as MemberResponse);
}

// 잘못된 방법 (X)
import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';

// 중복 인터페이스 정의 - 이렇게 하지 마세요!
interface NotionMemberProperties {
  Name: {
    title: Array<{
      plain_text: string;
    }>;
  };
}

export async function GET() {
  // API 코드...
}
```

## 2. 일관된 응답 형식 유지하기

모든 API는 일관된 응답 형식을 유지해야 합니다:

### 성공 응답

```typescript
// 컬렉션 데이터 반환 시
return NextResponse.json({ 
  members: [...] // 타입 정의에 맞는 데이터
} as MemberResponse);

// 단일 데이터 반환 시
return NextResponse.json({ 
  member: { ... } // 타입 정의에 맞는 데이터
} as SingleMemberResponse);
```

### 에러 응답

```typescript
return NextResponse.json(
  { error: '의미 있는 에러 메시지' }, 
  { status: 적절한_HTTP_상태_코드 }
);
```

## 3. 에러 처리

모든 API는 적절한 에러 처리를 포함해야 합니다:

```typescript
try {
  // API 코드...
} catch (error) {
  console.error('명확한 에러 메시지와 컨텍스트:', error);
  return NextResponse.json(
    { error: '사용자 친화적인 에러 메시지' }, 
    { status: 500 }
  );
}
```

## 4. 새 API 개발 시 체크리스트

- [ ] 공통 타입 파일의 적절한 인터페이스 사용
- [ ] 새로운 타입이 필요한 경우, 관련 type 파일에 추가
- [ ] 일관된 응답 형식 사용
- [ ] 적절한 에러 처리
- [ ] 명확한 함수 및 변수 이름
- [ ] 주석으로 주요 로직 설명 