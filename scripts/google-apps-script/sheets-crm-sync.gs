/**
 * SuperfastSAT — Google Sheets → CRM Lead Sync
 *
 * ─── 설치 가이드 ──────────────────────────────────────────────────────────────
 * 1. Google Sheets 열기 → 확장 프로그램 → Apps Script
 * 2. 이 파일 전체를 Code.gs에 붙여넣기
 * 3. 아래 WEBHOOK_URL 과 SYNC_KEY 를 실제 값으로 수정
 *    - WEBHOOK_URL: 배포된 Next.js 서버의 /api/crm/leads/sheets-sync URL
 *    - SYNC_KEY: .env.local의 SHEETS_SYNC_SECRET 값
 * 4. 함수 목록에서 "setupTrigger" 선택 후 실행 (1회만)
 *    → 5분마다 syncAllTabs() 자동 실행 트리거가 등록됨
 * 5. 처음 실행 시 권한 승인 팝업이 뜨면 허용
 *
 * ─── 탭 이름 확인 ────────────────────────────────────────────────────────────
 * 시트 하단 탭 이름이 아래 TAB_CONFIG의 name 과 정확히 일치해야 합니다.
 * 다르다면 name 값을 실제 탭 이름으로 변경하세요.
 */

var WEBHOOK_URL = 'https://YOUR_DOMAIN/api/crm/leads/sheets-sync';
var SYNC_KEY = 'YOUR_SHEETS_SYNC_SECRET';

// ─── 탭 설정 ──────────────────────────────────────────────────────────────────

var TAB_CONFIG = [
  {
    name: 'META리드_인스턴트폼',
    source_tab: 'META리드_인스턴트폼',
    // 컬럼 인덱스 (0-based): id|created_time|...|학년|목표점수|phone|status
    colCreatedTime: 1,
    colAdName: 2,
    colPlatform: 3,
    colGrade: 4,
    colTargetScore: 5,
    colPhone: 6,
  },
  {
    name: 'META리드_인스턴트폼_목표시험',
    source_tab: 'META리드_인스턴트폼_목표시험',
    colCreatedTime: 1,
    colAdName: 2,
    colPlatform: 3,
    colTargetTestDate: 4,
    colGrade: 5,
    colPhone: 6,
  },
  {
    name: 'AP수업 문의',
    source_tab: 'AP수업 문의',
    colCreatedTime: 1,
    colAdName: 2,
    colPlatform: 3,
    colApSubject: 4,
    colPhone: 5,
  },
  {
    name: 'SuperTest 수요조사',
    source_tab: 'SuperTest 수요조사',
    colCreatedTime: 1,
    colAdName: 2,
    colPlatform: 3,
    colSupertestDate: 4,
    colGrade: 5,
    colPhone: 6,
  },
];

// ─── 트리거 설정 (1회만 실행) ─────────────────────────────────────────────────

function setupTrigger() {
  // 기존 트리거 제거 (중복 방지)
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'syncAllTabs') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // 5분마다 실행
  ScriptApp.newTrigger('syncAllTabs')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('트리거 설정 완료: syncAllTabs() 5분마다 실행');
}

// ─── 메인 동기화 함수 ─────────────────────────────────────────────────────────

function syncAllTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getScriptProperties();

  TAB_CONFIG.forEach(function(config) {
    var sheet = ss.getSheetByName(config.name);
    if (!sheet) {
      Logger.log('탭 없음: ' + config.name);
      return;
    }

    var lastProcessedKey = 'lastRow_' + config.source_tab;
    var lastProcessed = Number(props.getProperty(lastProcessedKey) || 1); // 헤더행(1) 제외
    var lastRow = sheet.getLastRow();

    if (lastRow <= lastProcessed) return; // 새 행 없음

    var newRows = sheet.getRange(lastProcessed + 1, 1, lastRow - lastProcessed, sheet.getLastColumn()).getValues();

    var successCount = 0;
    newRows.forEach(function(row) {
      var phone = String(row[config.colPhone] || '').trim();
      if (!phone) return; // 빈 행 스킵

      var payload = buildPayload(config, row);
      if (sendToWebhook(payload)) {
        successCount++;
      }
    });

    if (successCount > 0) {
      props.setProperty(lastProcessedKey, String(lastRow));
      Logger.log('[' + config.name + '] ' + successCount + '건 동기화 완료 (행 ' + (lastProcessed + 1) + '~' + lastRow + ')');
    }
  });
}

// ─── Payload 빌더 ─────────────────────────────────────────────────────────────

function buildPayload(config, row) {
  var payload = {
    source_tab: config.source_tab,
    created_time: formatDateTime(row[config.colCreatedTime]),
    ad_name: String(row[config.colAdName] || '').trim(),
    platform: normalizePlatform(String(row[config.colPlatform] || '')),
    phone: String(row[config.colPhone] || '').trim(),
  };

  if (config.colGrade !== undefined) {
    payload.grade = String(row[config.colGrade] || '').trim();
  }
  if (config.colTargetScore !== undefined) {
    payload.target_score_text = String(row[config.colTargetScore] || '').trim();
  }
  if (config.colTargetTestDate !== undefined) {
    payload.target_test_date_text = String(row[config.colTargetTestDate] || '').trim();
  }
  if (config.colApSubject !== undefined) {
    payload.ap_subject = String(row[config.colApSubject] || '').trim();
  }
  if (config.colSupertestDate !== undefined) {
    payload.supertest_date = String(row[config.colSupertestDate] || '').trim();
  }

  return payload;
}

// ─── 웹훅 전송 ───────────────────────────────────────────────────────────────

function sendToWebhook(payload) {
  try {
    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-sync-key': SYNC_KEY },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };

    var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    var code = response.getResponseCode();

    if (code === 200 || code === 201) {
      return true;
    }

    Logger.log('웹훅 오류 ' + code + ': ' + response.getContentText() + ' | phone: ' + payload.phone);
    return false;
  } catch (e) {
    Logger.log('웹훅 예외: ' + e.message + ' | phone: ' + payload.phone);
    return false;
  }
}

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function formatDateTime(value) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalizePlatform(value) {
  var v = value.toLowerCase().trim();
  if (v === 'instagram' || v === 'ig') return 'ig';
  if (v === 'facebook' || v === 'fb') return 'fb';
  return 'ig'; // 기본값
}

// ─── 수동 테스트 함수 ─────────────────────────────────────────────────────────

/**
 * Apps Script 에디터에서 이 함수를 직접 실행해 웹훅 연결을 테스트할 수 있습니다.
 * 테스트 후 CRM에서 'META리드_20260101' 이름의 테스트 학생을 수동으로 삭제하세요.
 */
function testWebhookConnection() {
  var testPayload = {
    source_tab: 'META리드_인스턴트폼',
    created_time: '2026-01-01T00:00:00.000Z',
    ad_name: '[APPS_SCRIPT_TEST]',
    platform: 'ig',
    phone: '010-0000-0000',
    grade: '11',
    target_score_text: '1500',
  };

  var result = sendToWebhook(testPayload);
  Logger.log('테스트 결과: ' + (result ? '성공' : '실패'));
}

/**
 * 마지막으로 처리된 행 번호를 초기화합니다.
 * 처음부터 다시 동기화하고 싶을 때 사용하세요.
 */
function resetLastProcessedRows() {
  var props = PropertiesService.getScriptProperties();
  TAB_CONFIG.forEach(function(config) {
    props.deleteProperty('lastRow_' + config.source_tab);
  });
  Logger.log('마지막 처리 행 초기화 완료. 다음 실행 시 전체 재동기화됩니다.');
}
