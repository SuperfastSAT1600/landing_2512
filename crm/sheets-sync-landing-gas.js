/**
 * SuperfastSAT — 랜딩페이지 Google Sheets → CRM Lead Sync
 *
 * ─── 설치 가이드 ──────────────────────────────────────────────────────────────
 * 1. 랜딩페이지 스프레드시트 열기 → 확장 프로그램 → Apps Script
 * 2. 이 파일 전체를 Code.gs에 붙여넣기
 * 3. 아래 WEBHOOK_URL 과 SYNC_KEY 를 실제 값으로 수정
 * 4. 함수 목록에서 "setupTrigger" 선택 후 실행 (1회만)
 *    → 1분마다 syncAllTabs() 자동 실행 트리거가 등록됨
 * 5. 처음 실행 시 권한 승인 팝업이 뜨면 허용
 *
 * ─── 탭 구성 ──────────────────────────────────────────────────────────────────
 * tutoring_landing  →  (신)랜딩페이지 예약상담
 * landing           →  (구)랜딩페이지 예약상담
 */

var WEBHOOK_URL = 'https://tutoring.superfastsat.com/api/crm/leads/sheets-sync';
var SYNC_KEY = '03500662058aae00e7a58755bbf04cec4e860e43d95c582b';

// ─── 탭 설정 ──────────────────────────────────────────────────────────────────
// Col 0: 타임스탬프 | Col 2: 학생 이름 | Col 3: 학년 | Col 4: 연락처

var TAB_CONFIG = [
  {
    name: 'tutoring_landing',
    source_tab: 'tutoring_landing',
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

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'syncAllTabs') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('syncAllTabs')
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('트리거 설정 완료: syncAllTabs() 1분마다 실행');
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
    var lastProcessed = Number(props.getProperty(lastProcessedKey) || 1);
    var lastRow = sheet.getLastRow();

    if (lastRow <= lastProcessed) return;

    var newRows = sheet.getRange(lastProcessed + 1, 1, lastRow - lastProcessed, sheet.getLastColumn()).getValues();

    var successCount = 0;
    newRows.forEach(function(row) {
      var phone = String(row[config.colPhone] || '').trim();
      if (!phone) return;

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
  return {
    source_tab: config.source_tab,
    created_time: formatDateTime(row[config.colCreatedTime]),
    student_name: String(row[config.colStudentName] || '').trim(),
    grade: String(row[config.colGrade] || '').trim(),
    phone: String(row[config.colPhone] || '').trim(),
  };
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
  var kst = 'Asia/Seoul';
  var fmt = "yyyy-MM-dd'T'HH:mm:ss";
  if (!value) return Utilities.formatDate(new Date(), kst, fmt);
  if (value instanceof Date) return Utilities.formatDate(value, kst, fmt);
  return String(value);
}

// ─── 마이그레이션 (기존 데이터 inquiry_date 시각 소급 업데이트) ──────────────

/**
 * 기존 리드의 inquiry_date를 날짜+시각으로 마이그레이션합니다.
 * Apps Script 에디터에서 1회만 실행하세요.
 * 이미 시각이 포함된 리드는 자동으로 skip됩니다.
 */
function migrateInquiryDates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var results = { updated: 0, skipped: 0, not_found: 0, error: 0 };

  TAB_CONFIG.forEach(function(config) {
    var sheet = ss.getSheetByName(config.name);
    if (!sheet) {
      Logger.log('[' + config.name + '] 탭 없음, skip');
      return;
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    var rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    Logger.log('[' + config.name + '] ' + rows.length + '행 처리 시작');

    rows.forEach(function(row, i) {
      var phone = String(row[config.colPhone] || '').trim();
      var createdTime = formatDateTime(row[config.colCreatedTime]);
      if (!phone) return;

      try {
        var options = {
          method: 'patch',
          contentType: 'application/json',
          headers: { 'x-sync-key': SYNC_KEY },
          payload: JSON.stringify({ phone: phone, created_time: createdTime }),
          muteHttpExceptions: true,
        };
        var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
        var code = response.getResponseCode();
        var body = JSON.parse(response.getContentText());

        if (code === 200) {
          results[body.action] = (results[body.action] || 0) + 1;
        } else {
          results.error++;
          Logger.log('오류 [행 ' + (i + 2) + '] ' + code + ': ' + response.getContentText());
        }
      } catch (e) {
        results.error++;
        Logger.log('예외 [행 ' + (i + 2) + ']: ' + e.message);
      }

      if ((i + 1) % 50 === 0) Utilities.sleep(1000);
    });
  });

  Logger.log('마이그레이션 완료: ' + JSON.stringify(results));
}

// ─── 수동 테스트 ──────────────────────────────────────────────────────────────

function testWebhookConnection() {
  var testPayload = {
    source_tab: 'tutoring_landing',
    created_time: '2026-01-01T00:00:00',
    student_name: '[테스트]',
    grade: '11',
    phone: '010-0000-0000',
  };

  var result = sendToWebhook(testPayload);
  Logger.log('테스트 결과: ' + (result ? '성공' : '실패'));
}

function resetLastProcessedRows() {
  var props = PropertiesService.getScriptProperties();
  TAB_CONFIG.forEach(function(config) {
    props.deleteProperty('lastRow_' + config.source_tab);
  });
  Logger.log('마지막 처리 행 초기화 완료. 다음 실행 시 전체 재동기화됩니다.');
}
