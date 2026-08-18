/**
 * SuperfastSAT — Landing/Instagram 폼 → CRM Lead Sync
 *
 * ─── 설치 가이드 ──────────────────────────────────────────────────────────────
 * 1. 두 번째 스프레드시트(tutoring_landing / instagram / landing 탭) 열기
 * 2. 확장 프로그램 → Apps Script → 새 파일 추가 (또는 기존 Code.gs에 아래 내용 추가)
 * 3. WEBHOOK_URL 과 SYNC_KEY 를 실제 값으로 수정
 * 4. "setupLandingTrigger" 함수 실행 (1회만) → 5분마다 자동 실행
 * 5. 권한 승인 팝업 허용
 *
 * 기존 checkNewData() 함수와 충돌 없이 공존합니다.
 */

var LANDING_WEBHOOK_URL = 'https://YOUR_DOMAIN/api/crm/leads/sheets-sync';
var LANDING_SYNC_KEY = 'YOUR_SHEETS_SYNC_SECRET';

// ─── 탭 설정 ──────────────────────────────────────────────────────────────────
// 컬럼: [0]타임스탬프 [1]카카오링크(무시) [2]학생이름 [3]학년 [4]연락처

var LANDING_TAB_CONFIG = [
  {
    name: 'tutoring_landing',
    source_tab: 'tutoring_landing',
    colCreatedTime: 0,
    colStudentName: 2,
    colGrade: 3,
    colPhone: 4,
  },
  {
    name: 'instagram',
    source_tab: 'instagram',
    colCreatedTime: 0,
    colStudentName: 2,
    colGrade: 3,
    colPhone: 4,
  },
  {
    name: 'landing',
    source_tab: 'landing',
    colCreatedTime: 0,
    colStudentName: 2,
    colGrade: 3,
    colPhone: 4,
  },
];

// ─── 트리거 설정 (1회만 실행) ─────────────────────────────────────────────────

function setupLandingTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'syncLandingTabs') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('syncLandingTabs')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('트리거 설정 완료: syncLandingTabs() 5분마다 실행');
}

// ─── 메인 동기화 함수 ─────────────────────────────────────────────────────────

function syncLandingTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getScriptProperties();

  LANDING_TAB_CONFIG.forEach(function(config) {
    var sheet = ss.getSheetByName(config.name);
    if (!sheet) {
      Logger.log('탭 없음: ' + config.name);
      return;
    }

    var lastProcessedKey = 'landingLastRow_' + config.source_tab;
    var lastProcessed = Number(props.getProperty(lastProcessedKey) || 1); // 헤더행 제외
    var lastRow = sheet.getLastRow();

    if (lastRow <= lastProcessed) return; // 새 행 없음

    var newRows = sheet.getRange(lastProcessed + 1, 1, lastRow - lastProcessed, sheet.getLastColumn()).getValues();

    var successCount = 0;
    newRows.forEach(function(row) {
      var contact = String(row[config.colPhone] || '').trim();
      if (!contact) return; // 빈 행 스킵

      var payload = buildLandingPayload(config, row);
      if (sendLandingToWebhook(payload)) {
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

function buildLandingPayload(config, row) {
  var contact = String(row[config.colPhone] || '').trim();

  return {
    source_tab: config.source_tab,
    created_time: formatLandingDateTime(row[config.colCreatedTime]),
    phone: contact,
    student_name: String(row[config.colStudentName] || '').trim(),
    grade: String(row[config.colGrade] || '').trim(),
  };
}

// ─── 웹훅 전송 ───────────────────────────────────────────────────────────────

function sendLandingToWebhook(payload) {
  try {
    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-sync-key': LANDING_SYNC_KEY },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };

    var response = UrlFetchApp.fetch(LANDING_WEBHOOK_URL, options);
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

function formatLandingDateTime(value) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

// ─── 수동 테스트 ──────────────────────────────────────────────────────────────

/**
 * landing 탭 웹훅 연결 테스트. 실행 후 CRM에서 테스트 학생 삭제하세요.
 */
function testLandingWebhook() {
  var testPayload = {
    source_tab: 'landing',
    created_time: new Date().toISOString(),
    phone: '010-0000-9999',
    student_name: '[랜딩테스트]',
    grade: '11th',
  };

  var result = sendLandingToWebhook(testPayload);
  Logger.log('테스트 결과: ' + (result ? '성공' : '실패'));
}

/**
 * 처음부터 재동기화할 때 사용.
 */
function resetLandingLastProcessedRows() {
  var props = PropertiesService.getScriptProperties();
  LANDING_TAB_CONFIG.forEach(function(config) {
    props.deleteProperty('landingLastRow_' + config.source_tab);
  });
  Logger.log('초기화 완료. 다음 실행 시 전체 재동기화됩니다.');
}
