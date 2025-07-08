import { supabase } from '../lib/supabase'

// 로그 함수
const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

// 테이블 데이터 확인
async function checkTableData() {
  log('테이블 데이터 현황 확인 시작...')
  
  // donations 테이블 상세 확인
  try {
    const { data: donations, error } = await supabase
      .from('donations')
      .select('*')
      .limit(1)
    
    if (error) {
      log(`❌ donations 테이블 조회 실패: ${error.message}`)
    } else {
      log(`✅ donations 테이블 샘플 데이터:`)
      log(JSON.stringify(donations[0], null, 2))
      
      if (donations[0]) {
        log(`✅ donations 테이블 컬럼들: ${Object.keys(donations[0]).join(', ')}`)
      }
    }
  } catch (error) {
    log(`❌ donations 테이블 확인 중 오류: ${error}`)
  }

  // special_fees 테이블도 확인
  try {
    const { data: specialFees, error } = await supabase
      .from('special_fees')
      .select('*')
      .limit(1)
    
    if (error) {
      log(`❌ special_fees 테이블 조회 실패: ${error.message}`)
    } else {
      log(`✅ special_fees 테이블 샘플 데이터:`)
      log(JSON.stringify(specialFees[0], null, 2))
      
      if (specialFees[0]) {
        log(`✅ special_fees 테이블 컬럼들: ${Object.keys(specialFees[0]).join(', ')}`)
      }
    }
  } catch (error) {
    log(`❌ special_fees 테이블 확인 중 오류: ${error}`)
  }
}

// 스크립트 실행
checkTableData()
  .then(() => {
    log('테이블 확인 완료')
  })
  .catch((error) => {
    log(`테이블 확인 실패: ${error}`)
  })

export { checkTableData } 