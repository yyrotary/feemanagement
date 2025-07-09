import { supabase } from '../lib/supabase'
import { notionClient } from '../lib/notion'
import { NotionDonationProperties } from '../lib/notion-types'

const DATABASE_IDS = {
  DONATIONS: '1c47c9ec930b80d88b18c578d7cc9f4a',
  MEMBERS: '1c47c9ec930b80119d08eb7c6eb9f0e3'
}

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

// Notion에서 회원 정보 가져오기
async function fetchNotionMembers() {
  log('Notion 회원 정보 조회 중...')
  
  try {
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.MEMBERS,
      page_size: 100
    })

    const members = new Map<string, { id: string; name: string }>()
    
    for (const page of response.results) {
      const pageObj = page as any
      const properties = pageObj.properties as any
      const name = properties.이름?.title?.[0]?.plain_text || properties.name?.title?.[0]?.plain_text
      
      if (name) {
        members.set(page.id, { id: page.id, name })
      }
    }

    log(`Notion 회원 ${members.size}명 조회 완료`)
    return members
  } catch (error) {
    log(`Notion 회원 정보 조회 실패: ${error}`)
    throw error
  }
}

// Notion에서 기부 데이터 다시 가져와서 from_friend 정보 올바르게 마이그레이션
async function migrateFriendDonationData() {
  log('우정기부 데이터 마이그레이션 시작...')
  
  try {
    // Notion 회원 정보 가져오기
    const notionMembers = await fetchNotionMembers()
    
    // Notion 기부 데이터 가져오기
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.DONATIONS,
      page_size: 100
    })

    let updatedCount = 0
    
    for (const page of response.results) {
      const pageObj = page as any
      const properties = pageObj.properties as NotionDonationProperties
      const fromFriendId = properties.from_friend?.relation?.[0]?.id
      
      if (fromFriendId) {
        const friendInfo = notionMembers.get(fromFriendId)
        
        if (friendInfo) {
          // Supabase에서 해당 기부 기록 업데이트
          const { error } = await supabase
            .from('donations')
            .update({
              from_friend_id: fromFriendId,
              from_friend_name: friendInfo.name
            })
            .eq('id', page.id)

          if (error) {
            log(`기부 기록 ${page.id} 업데이트 실패: ${error.message}`)
          } else {
            updatedCount++
            if (updatedCount % 10 === 0) {
              log(`${updatedCount}개 기록 업데이트 완료...`)
            }
          }
        } else {
          log(`회원 정보를 찾을 수 없음: ${fromFriendId}`)
        }
      }
    }

    log(`우정기부 데이터 마이그레이션 완료: ${updatedCount}개 업데이트`)
  } catch (error) {
    log(`우정기부 데이터 마이그레이션 실패: ${error}`)
    throw error
  }
}

// 기존 from_friend 컬럼의 데이터를 새 컬럼으로 이전
async function migrateLegacyFromFriendData() {
  log('기존 from_friend 데이터 이전 중...')
  
  try {
    // Supabase 회원 정보 가져오기
    const { data: supabaseMembers, error: membersError } = await supabase
      .from('members')
      .select('id, name')
    
    if (membersError) {
      throw membersError
    }

    const memberMap = new Map<string, string>() // name -> id
    supabaseMembers?.forEach(member => {
      memberMap.set(member.name, member.id)
    })

    // from_friend가 있지만 from_friend_id가 없는 기록들 찾기
    const { data: donations, error: donationsError } = await supabase
      .from('donations')
      .select('id, from_friend')
      .not('from_friend', 'is', null)
      .is('from_friend_id', null)

    if (donationsError) {
      throw donationsError
    }

    let updatedCount = 0

    for (const donation of donations || []) {
      let friendName = ''
      let friendId = ''

      // from_friend 데이터 파싱
      if (donation.from_friend) {
        try {
          const parsed = JSON.parse(donation.from_friend)
          friendName = parsed.name || ''
          friendId = parsed.id || ''
        } catch (e) {
          // JSON이 아닌 경우 문자열로 처리
          friendName = donation.from_friend
        }

        // 이름으로 ID 찾기
        if (friendName && !friendId) {
          friendId = memberMap.get(friendName) || ''
        }

        if (friendName) {
          const { error } = await supabase
            .from('donations')
            .update({
              from_friend_id: friendId || null,
              from_friend_name: friendName
            })
            .eq('id', donation.id)

          if (error) {
            log(`기부 기록 ${donation.id} 업데이트 실패: ${error.message}`)
          } else {
            updatedCount++
          }
        }
      }
    }

    log(`기존 from_friend 데이터 이전 완료: ${updatedCount}개 업데이트`)
  } catch (error) {
    log(`기존 from_friend 데이터 이전 실패: ${error}`)
    throw error
  }
}

// 데이터 확인
async function verifyFromFriendData() {
  log('from_friend 데이터 확인 중...')
  
  try {
    // 새로운 필드로 마이그레이션된 데이터 확인
    const { data: newFieldData, error: newFieldError } = await supabase
      .from('donations')
      .select('id, from_friend_id, from_friend_name')
      .not('from_friend_id', 'is', null)

    if (newFieldError) {
      throw newFieldError
    }

    log(`새로운 from_friend_id 필드가 있는 기부: ${newFieldData?.length || 0}개`)

    // 이름만 있는 데이터 확인
    const { data: nameOnlyData, error: nameOnlyError } = await supabase
      .from('donations')
      .select('id, from_friend_name')
      .not('from_friend_name', 'is', null)
      .is('from_friend_id', null)

    if (nameOnlyError) {
      throw nameOnlyError
    }

    log(`이름만 있는 우정기부: ${nameOnlyData?.length || 0}개`)

    // 기존 from_friend 필드만 있는 데이터 확인
    const { data: legacyData, error: legacyError } = await supabase
      .from('donations')
      .select('id, from_friend')
      .not('from_friend', 'is', null)
      .is('from_friend_id', null)
      .is('from_friend_name', null)

    if (legacyError) {
      throw legacyError
    }

    log(`마이그레이션되지 않은 레거시 데이터: ${legacyData?.length || 0}개`)

  } catch (error) {
    log(`데이터 확인 실패: ${error}`)
    throw error
  }
}

// 메인 실행 함수
async function main() {
  try {
    log('from_friend 필드 수정 작업 시작...')
    log('⚠️  먼저 Supabase 대시보드에서 database/alter_donations_table.sql을 실행하세요!')
    
    // 사용자에게 확인 요청
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    await new Promise<void>((resolve) => {
      readline.question('테이블 스키마 수정을 완료했나요? (y/n): ', (answer: string) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          resolve()
        } else {
          log('먼저 테이블 스키마를 수정하고 다시 실행하세요.')
          process.exit(0)
        }
        readline.close()
      })
    })
    
    // 1. Notion에서 우정기부 데이터 다시 마이그레이션
    await migrateFriendDonationData()
    
    // 2. 기존 from_friend 데이터 이전
    await migrateLegacyFromFriendData()

    // 3. 데이터 확인
    await verifyFromFriendData()
    
    log('from_friend 필드 수정 작업 완료!')
  } catch (error) {
    log(`작업 실패: ${error}`)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
} 