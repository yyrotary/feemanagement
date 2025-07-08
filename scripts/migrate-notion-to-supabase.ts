import { notionClient, DATABASE_IDS } from '../lib/notion'
import { supabase } from '../lib/supabase'
import { 
  NotionMemberProperties, 
  NotionFeeProperties, 
  NotionDonationProperties,
  NotionServiceFeeProperties,
  NotionSpecialEventProperties,
  NotionSpecialFeeProperties,
  NotionTransactionProperties
} from '../lib/notion-types'

// 마이그레이션 로그 함수
const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

// 회원 데이터 마이그레이션
async function migrateMembers() {
  log('회원 데이터 마이그레이션 시작...')
  
  try {
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.MEMBERS,
      page_size: 100,
    })

    const members = response.results.map((page: any) => {
      const properties = page.properties as NotionMemberProperties
      
      return {
        id: page.id,
        name: properties.Name?.title?.[0]?.plain_text || '',
        nickname: properties.nick?.rich_text?.[0]?.plain_text || null,
        phone: properties.phone?.number || null,
        join_date: properties.joinDate?.date?.start || null,
        member_fee: properties.memberfee?.number || 0,
        paid_fee: properties.paid_fee?.rollup?.number || 0,
        unpaid_fee: properties.unpaid_fee?.formula?.number || 0,
        deduction: properties.deduction?.multi_select?.map(item => item.name) || [],
        total_donation: properties.총기부금?.rollup?.number || 0,
        friendship_donation: properties.우정기부?.rollup?.number || 0,
        contribution_score: properties.기여도?.formula?.number || 0,
      }
    })

    const { error } = await supabase
      .from('members')
      .upsert(members, { onConflict: 'id' })

    if (error) {
      throw error
    }

    log(`회원 데이터 ${members.length}개 마이그레이션 완료`)
  } catch (error) {
    log(`회원 데이터 마이그레이션 실패: ${JSON.stringify(error, null, 2)}`)
    throw error
  }
}

// 회비 데이터 마이그레이션
async function migrateFees() {
  log('회비 데이터 마이그레이션 시작...')
  
  try {
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.FEES,
      page_size: 100,
    })

    log(`회비 데이터 ${response.results.length}개 조회됨`)

    const fees = response.results.map((page: any) => {
      const properties = page.properties as NotionFeeProperties
      
      const fee = {
        id: page.id,
        member_id: null, // 임시로 null 설정 (나중에 매핑)
        member_name: properties.id?.title?.[0]?.plain_text || '',
        date: properties.date?.date?.start || null,
        amount: properties.paid_fee?.number || 0,
        method: properties.method?.multi_select?.[0]?.name || '',
      }
      
      log(`회비 데이터 처리: ${JSON.stringify(fee)}`)
      return fee
    })

    // 빈 데이터 필터링 (member_id는 null 허용)
    const validFees = fees.filter(fee => 
      fee.member_name && 
      fee.date && 
      fee.amount > 0 &&
      fee.method
    )

    log(`유효한 회비 데이터 ${validFees.length}개 (전체 ${fees.length}개 중)`)

    if (validFees.length === 0) {
      log('마이그레이션할 유효한 회비 데이터가 없습니다.')
      return
    }

    const { error } = await supabase
      .from('fees')
      .upsert(validFees, { onConflict: 'id' })

    if (error) {
      throw error
    }

    log(`회비 데이터 ${validFees.length}개 마이그레이션 완료`)
  } catch (error) {
    log(`회비 데이터 마이그레이션 실패: ${JSON.stringify(error, null, 2)}`)
    console.error('회비 데이터 마이그레이션 상세 에러:', error)
    throw error
  }
}

// 봉사금 데이터 마이그레이션
async function migrateServiceFees() {
  log('봉사금 데이터 마이그레이션 시작...')
  
  try {
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.SERVICE_FEES,
      page_size: 100,
    })

    const serviceFees = response.results.map((page: any) => {
      const properties = page.properties as NotionServiceFeeProperties
      
      return {
        id: page.id,
        member_id: properties.name?.relation?.[0]?.id || null,
        member_name: properties.id?.title?.[0]?.plain_text || '',
        date: properties.date?.date?.start || null,
        amount: properties.paid_fee?.number || 0,
        method: properties.method?.multi_select?.[0]?.name || '',
      }
    })

    const { error } = await supabase
      .from('service_fees')
      .upsert(serviceFees, { onConflict: 'id' })

    if (error) {
      throw error
    }

    log(`봉사금 데이터 ${serviceFees.length}개 마이그레이션 완료`)
  } catch (error) {
    log(`봉사금 데이터 마이그레이션 실패: ${error}`)
    throw error
  }
}

// 특별 이벤트 데이터 마이그레이션
async function migrateSpecialEvents() {
  log('특별 이벤트 데이터 마이그레이션 시작...')
  
  try {
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.SPECIAL_EVENTS,
      page_size: 100,
    })

    const specialEvents = response.results.map((page: any) => {
      const properties = page.properties as NotionSpecialEventProperties
      
      return {
        id: page.id,
        member_id: properties.name?.relation?.[0]?.id || null,
        member_name: properties.이름?.title?.[0]?.plain_text || '',
        nickname: properties.nick?.rollup?.array?.[0]?.rich_text?.[0]?.plain_text || null,
        date: properties.date?.date?.start || null,
        event_type: properties.events?.multi_select?.[0]?.name || '',
      }
    })

    const { error } = await supabase
      .from('special_events')
      .upsert(specialEvents, { onConflict: 'id' })

    if (error) {
      throw error
    }

    log(`특별 이벤트 데이터 ${specialEvents.length}개 마이그레이션 완료`)
  } catch (error) {
    log(`특별 이벤트 데이터 마이그레이션 실패: ${error}`)
    throw error
  }
}

// 특별 회비 데이터 마이그레이션
async function migrateSpecialFees() {
  log('특별 회비 데이터 마이그레이션 시작...')
  
  try {
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.SPECIAL_FEES,
      page_size: 100,
    })

    const specialFees = response.results.map((page: any) => {
      const properties = page.properties as NotionSpecialFeeProperties
      
      return {
        id: page.id,
        member_id: properties.name?.relation?.[0]?.id || null,
        member_name: properties.이름?.title?.[0]?.plain_text || '',
        date: properties.date?.date?.start || null,
        amount: properties.paid_fee?.number || 0,
        method: properties.method?.multi_select?.[0]?.name || '',
      }
    })

    const { error } = await supabase
      .from('special_fees')
      .upsert(specialFees, { onConflict: 'id' })

    if (error) {
      throw error
    }

    log(`특별 회비 데이터 ${specialFees.length}개 마이그레이션 완료`)
  } catch (error) {
    log(`특별 회비 데이터 마이그레이션 실패: ${error}`)
    throw error
  }
}

// 기부금 데이터 마이그레이션
async function migrateDonations() {
  log('기부금 데이터 마이그레이션 시작...')
  
  try {
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.DONATIONS,
      page_size: 100,
    })

    const donations = response.results.map((page: any) => {
      const properties = page.properties as NotionDonationProperties
      
      return {
        id: page.id,
        member_id: properties.name?.relation?.[0]?.id || null,
        member_name: properties.이름?.title?.[0]?.plain_text || '',
        date: properties.date?.date?.start || null,
        amount: properties.paid_fee?.number || 0,
        method: properties.method?.multi_select?.[0]?.name || '',
        category: properties.class?.multi_select?.map(item => item.name) || [],
        from_friend: properties.from_friend?.relation?.[0]?.id || null,
      }
    })

    const { error } = await supabase
      .from('donations')
      .upsert(donations, { onConflict: 'id' })

    if (error) {
      throw error
    }

    log(`기부금 데이터 ${donations.length}개 마이그레이션 완료`)
  } catch (error) {
    log(`기부금 데이터 마이그레이션 실패: ${error}`)
    throw error
  }
}

// 거래 내역 데이터 마이그레이션
async function migrateTransactions() {
  log('거래 내역 데이터 마이그레이션 시작...')
  
  try {
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.TRANSACTIONS,
      page_size: 100,
    })

    const transactions = response.results.map((page: any) => {
      const properties = page.properties as NotionTransactionProperties
      
      return {
        id: page.id,
        date: properties.date?.date?.start || null,
        description: properties.description?.rich_text?.[0]?.plain_text || '',
        in_amount: properties.in?.number || 0,
        out_amount: properties.out?.number || 0,
        balance: properties.balance?.number || 0,
        branch: properties.branch?.rich_text?.[0]?.plain_text || null,
        bank: properties.bank?.rich_text?.[0]?.plain_text || null,
        memo: properties.memo?.rich_text?.[0]?.plain_text || null,
        related_member_id: properties.relatedmember?.relation?.[0]?.id || null,
      }
    })

    const { error } = await supabase
      .from('transactions')
      .upsert(transactions, { onConflict: 'id' })

    if (error) {
      throw error
    }

    log(`거래 내역 데이터 ${transactions.length}개 마이그레이션 완료`)
  } catch (error) {
    log(`거래 내역 데이터 마이그레이션 실패: ${error}`)
    throw error
  }
}

// 마스터 정보 데이터 마이그레이션
async function migrateMasterInfo() {
  log('마스터 정보 데이터 마이그레이션 시작...')
  
  try {
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.MASTER_INFO,
      page_size: 100,
    })

    const masterInfo = response.results.map((page: any) => {
      const properties = page.properties
      
      return {
        id: page.id,
        key: properties.Name?.title?.[0]?.plain_text || '',
        value: properties.Value?.rich_text?.[0]?.plain_text || '',
        description: properties.Description?.rich_text?.[0]?.plain_text || null,
      }
    })

    const { error } = await supabase
      .from('master_info')
      .upsert(masterInfo, { onConflict: 'id' })

    if (error) {
      throw error
    }

    log(`마스터 정보 데이터 ${masterInfo.length}개 마이그레이션 완료`)
  } catch (error) {
    log(`마스터 정보 데이터 마이그레이션 실패: ${error}`)
    throw error
  }
}

// 전체 마이그레이션 실행
async function runMigration() {
  log('Notion에서 Supabase로 데이터 마이그레이션 시작...')
  
  try {
    // 순서대로 마이그레이션 실행
    await migrateMembers()
    await migrateFees()
    await migrateServiceFees()
    await migrateSpecialEvents()
    await migrateSpecialFees()
    await migrateDonations()
    await migrateTransactions()
    await migrateMasterInfo()
    
    log('모든 데이터 마이그레이션 완료!')
  } catch (error) {
    log(`마이그레이션 실패: ${error}`)
    throw error
  }
}

// 스크립트 실행 - 직접 실행
runMigration()
  .then(() => {
    log('스크립트 실행 완료')
  })
  .catch((error) => {
    log(`스크립트 실행 실패: ${error}`)
  })

export { runMigration }