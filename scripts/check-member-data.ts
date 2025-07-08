import { supabase } from '../lib/supabase'

// 로그 함수
const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

// 회원 데이터 확인
async function checkMemberData() {
  log('회원 데이터 확인 시작...')
  
  try {
    // 1. 회원 데이터 조회
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*')
      .limit(10)
    
    if (membersError) {
      throw membersError
    }
    
    log('회원 데이터 (상위 10개):')
    members.forEach(member => {
      log(`ID: ${member.id}, 이름: "${member.name}", 닉네임: "${member.nickname}"`)
    })
    
    // 2. 회비 데이터의 member_name 확인
    const { data: fees, error: feesError } = await supabase
      .from('fees')
      .select('id, member_name, amount, date')
      .limit(10)
    
    if (feesError) {
      throw feesError
    }
    
    log('\n회비 데이터의 member_name (상위 10개):')
    fees.forEach(fee => {
      log(`ID: ${fee.id}, 회원명: "${fee.member_name}", 금액: ${fee.amount}, 날짜: ${fee.date}`)
    })
    
    // 3. 고유한 member_name 목록
    const { data: uniqueNames, error: uniqueError } = await supabase
      .from('fees')
      .select('member_name')
    
    if (uniqueError) {
      throw uniqueError
    }
    
    const uniqueMemberNames = [...new Set(uniqueNames.map(item => item.member_name))].filter(name => name && name.trim())
    
    log(`\n회비 데이터의 고유 회원명 ${uniqueMemberNames.length}개:`)
    uniqueMemberNames.forEach(name => {
      log(`"${name}"`)
    })
    
  } catch (error) {
    log(`데이터 확인 실패: ${JSON.stringify(error, null, 2)}`)
    throw error
  }
}

// 스크립트 실행
checkMemberData()
  .then(() => {
    log('스크립트 실행 완료')
  })
  .catch((error) => {
    log(`스크립트 실행 실패: ${error}`)
  })

export { checkMemberData } 