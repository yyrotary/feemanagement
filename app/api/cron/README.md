# Cron Job 설정 및 시뮬레이션

## 1. 기본 Cron Job 설정

현재 Vercel에 배포된 애플리케이션은 다음과 같이 `vercel.json` 파일에 정의된 cron job을 사용합니다:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 1 * * *"
    }
  ]
}
```

이 설정은 매일 오전 1시(UTC 기준)에 `/api/cron` 엔드포인트를 호출하여 거래내역을 자동으로 업데이트합니다.

## 2. Cron Job 시뮬레이션 방법

Vercel의 cron job은 하루에 한 번만 실행되어 테스트가 어려우므로, 아래와 같이 시뮬레이션 API를 사용할 수 있습니다.

### 시뮬레이션 API 사용법

```
GET /api/cron/simulate
```

### 매개변수

다음 쿼리 매개변수를 사용하여 다양한 시나리오를 테스트할 수 있습니다:

| 매개변수 | 타입 | 설명 |
|--------|------|------|
| `forceUpdate` | boolean | `true`로 설정 시 최근 거래내역 확인 없이 강제로 업데이트 실행 |
| `sinceHours` | number | 특정 시간(시간 단위) 이전부터의 거래내역만 가져오기 |
| `sinceDays` | number | 특정 날짜(일 단위) 이전부터의 거래내역만 가져오기 |
| `debug` | boolean | `true`로 설정 시 추가적인 디버깅 정보 출력 |

### 사용 예시

1. **최근 24시간 거래내역 가져오기:**
   ```
   GET /api/cron/simulate?sinceHours=24
   ```

2. **최근 3일 동안의 거래내역 가져오기:**
   ```
   GET /api/cron/simulate?sinceDays=3
   ```

3. **모든 거래내역 가져오기 (강제 업데이트):**
   ```
   GET /api/cron/simulate?forceUpdate=true
   ```

4. **디버깅 정보와 함께 최근 12시간 거래내역 가져오기:**
   ```
   GET /api/cron/simulate?sinceHours=12&debug=true
   ```

## 3. 응답 형식

시뮬레이션 API 호출 성공 시 다음과 같은, 형식의 JSON 응답을 반환합니다:

```json
{
  "status": "success",
  "time": "2023-04-10T15:30:45.123Z",
  "simulationParams": {
    "forceUpdate": true,
    "sinceHours": 24,
    "sinceDays": null,
    "debug": true
  },
  "result": {
    "status": "success",
    "message": "최근 거래내역 업데이트 완료 (2023-04-09 이후)",
    "emailsProcessed": 15,
    "count": 8,
    "nextPageToken": null,
    "sinceDate": "2023-04-09T00:00:00.000Z",
    "forceUpdate": true
  }
}
```

## 4. 주의사항

- 시뮬레이션 API는 개발 및 테스트 환경에서만 사용하는 것을 권장합니다.
- 너무 빈번한 API 호출은 Gmail API 할당량 제한에 도달할 수 있습니다.
- `forceUpdate=true` 옵션은 신중하게 사용하세요. 중복 데이터가 생성될 가능성이 있습니다 (내부적으로 중복 검사를 수행하지만 완벽하지 않을 수 있음). 