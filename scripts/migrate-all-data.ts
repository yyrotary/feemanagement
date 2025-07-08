import { notionClient, DATABASE_IDS } from '../lib/notion'
import { supabase } from '../lib/supabase'
import { 
  NotionServiceFeeProperties,
  NotionDonationProperties,
  NotionTransactionProperties
} from '../lib/notion-types'

// 마이그레이션 로그 함수
const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

// Notion 전체 데이터 조회 (pagination 지원)
async function queryNotionDatabase(databaseId: string, databaseName: string) {
  log(`${databaseName} 전체 데이터 조회 시작...`)
  
  let allResults: any[] = []
  let hasMore = true
  let startCursor: string | undefined = undefined
  
  while (hasMore) {
    try {
      const response = await notionClient.databases.query({
        database_id: databaseId,
        page_size: 100,
        start_cursor: startCursor,
      })
      
      allResults = allResults.concat(response.results)
      hasMore = response.has_more
      startCursor = response.next_cursor || undefined
      
      log(`${databaseName}: ${response.results.length}개 조회됨 (총 ${allResults.length}개)`)
      
      // API 레이트 리밋을 고려한 약간의 지연
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      log(`${databaseName} 조회 중 에러: ${error}`)
      throw error
    }
  }
  
  log(`${databaseName} 전체 조회 완료: ${allResults.length}개`)
  return allResults
}

// 봉사금 데이터 마이그레이션 (전체)
async function migrateAllServiceFees() {
  log('봉사금 전체 데이터 마이그레이션 시작...')
  
  try {
    // 기존 데이터 삭제
    const { error: deleteError } = await supabase
      .from('service_fees')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 모든 데이터 삭제

    if (deleteError) {
      log(`기존 봉사금 데이터 삭제 실패: ${deleteError.message}`)
    } else {
      log('기존 봉사금 데이터 삭제 완료')
    }

    const allPages = await queryNotionDatabase(DATABASE_IDS.SERVICE_FEES, '봉사금')

    const serviceFees = allPages.map((page: any) => {
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

    // 배치 단위로 삽입 (100개씩)
    const batchSize = 100
    for (let i = 0; i < serviceFees.length; i += batchSize) {
      const batch = serviceFees.slice(i, i + batchSize)
      const { error } = await supabase
        .from('service_fees')
        .upsert(batch, { onConflict: 'id' })

      if (error) {
        throw error
      }
      
      log(`봉사금 배치 ${Math.floor(i/batchSize) + 1}/${Math.ceil(serviceFees.length/batchSize)} 완료`)
    }

    log(`봉사금 전체 데이터 ${serviceFees.length}개 마이그레이션 완료`)
  } catch (error) {
    log(`봉사금 데이터 마이그레이션 실패: ${error}`)
    throw error
  }
}

// 기부 데이터 마이그레이션 (전체)
async function migrateAllDonations() {
  log('기부 전체 데이터 마이그레이션 시작...')
  
  try {
    // 기존 데이터 삭제
    const { error: deleteError } = await supabase
      .from('donations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 모든 데이터 삭제

    if (deleteError) {
      log(`기존 기부 데이터 삭제 실패: ${deleteError.message}`)
    } else {
      log('기존 기부 데이터 삭제 완료')
    }

    const allPages = await queryNotionDatabase(DATABASE_IDS.DONATIONS, '기부')

    const donations = allPages.map((page: any) => {
      const properties = page.properties as NotionDonationProperties
      
      return {
        id: page.id,
        member_id: properties.name?.relation?.[0]?.id || null,
        member_name: properties.id?.title?.[0]?.plain_text || '',
        date: properties.date?.date?.start || null,
        amount: properties.paid_fee?.number || 0,
        method: properties.method?.multi_select?.[0]?.name || '',
        category: properties.class?.multi_select?.map(item => item.name) || [],
        from_friend: properties.from_friend?.rich_text?.[0]?.plain_text ? {
          name: properties.from_friend.rich_text[0].plain_text
        } : null,
      }
    })

    // 배치 단위로 삽입 (100개씩)
    const batchSize = 100
    for (let i = 0; i < donations.length; i += batchSize) {
      const batch = donations.slice(i, i + batchSize)
      const { error } = await supabase
        .from('donations')
        .upsert(batch, { onConflict: 'id' })

      if (error) {
        throw error
      }
      
      log(`기부 배치 ${Math.floor(i/batchSize) + 1}/${Math.ceil(donations.length/batchSize)} 완료`)
    }

    log(`기부 전체 데이터 ${donations.length}개 마이그레이션 완료`)
  } catch (error) {
    log(`기부 데이터 마이그레이션 실패: ${error}`)
    throw error
  }
}

// 거래내역 데이터 마이그레이션 (전체)
async function migrateAllTransactions() {
  log('거래내역 전체 데이터 마이그레이션 시작...')
  
  try {
    // 기존 데이터 삭제
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 모든 데이터 삭제

    if (deleteError) {
      log(`기존 거래내역 데이터 삭제 실패: ${deleteError.message}`)
    } else {
      log('기존 거래내역 데이터 삭제 완료')
    }

    const allPages = await queryNotionDatabase(DATABASE_IDS.TRANSACTIONS, '거래내역')

    const transactions = allPages.map((page: any) => {
      const properties = page.properties as NotionTransactionProperties
      
      return {
        id: page.id,
        date: properties.date?.date?.start || null,
        description: properties.detail?.title?.[0]?.plain_text || '',
        in_amount: properties.in?.number || 0,
        out_amount: properties.out?.number || 0,
        balance: properties.balance?.number || 0,
        branch: properties.branch?.rich_text?.[0]?.plain_text || null,
        bank: properties.bank?.rich_text?.[0]?.plain_text || null,
        memo: properties.memo?.rich_text?.[0]?.plain_text || null,
        related_member_id: null,
      }
    }).filter(transaction => transaction.date !== null) // null date 필터링

    log(`유효한 거래내역 ${transactions.length}개 (전체 ${allPages.length}개 중)`)

    // 배치 단위로 삽입 (100개씩)
    const batchSize = 100
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize)
      const { error } = await supabase
        .from('transactions')
        .upsert(batch, { onConflict: 'id' })

      if (error) {
        throw error
      }
      
      log(`거래내역 배치 ${Math.floor(i/batchSize) + 1}/${Math.ceil(transactions.length/batchSize)} 완료`)
    }

    log(`거래내역 전체 데이터 ${transactions.length}개 마이그레이션 완료`)
  } catch (error) {
    log(`거래내역 데이터 마이그레이션 실패: ${error}`)
    throw error
  }
}

// 전체 마이그레이션 실행
async function runFullMigration() {
  log('전체 데이터 마이그레이션 시작...')
  
  try {
    await migrateAllServiceFees()
    await migrateAllDonations() 
    await migrateAllTransactions()
    
    log('전체 데이터 마이그레이션 완료!')
    
    // 최종 카운트 확인
    const [serviceFees, donations, transactions] = await Promise.all([
      supabase.from('service_fees').select('*', { count: 'exact', head: true }),
      supabase.from('donations').select('*', { count: 'exact', head: true }),
      supabase.from('transactions').select('*', { count: 'exact', head: true })
    ])
    
    log(`최종 결과:`)
    log(`- 봉사금: ${serviceFees.count}개`)
    log(`- 기부: ${donations.count}개`)
    log(`- 거래내역: ${transactions.count}개`)
    
  } catch (error) {
    log(`마이그레이션 실패: ${error}`)
    throw error
  }
}

// 스크립트 실행
if (require.main === module) {
  runFullMigration().catch((error) => {
    console.error('마이그레이션 실패:', error)
    process.exit(1)
  })
}

export { runFullMigration } 