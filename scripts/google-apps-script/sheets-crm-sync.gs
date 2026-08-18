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
 * ─── 두 번째 스프레드시트 설정 ────────────────────────────────────────────────
 * SPREADSHEET_2_ID 에 두 번째 시트의 ID를 입력하세요.
 * (URL에서 /d/ 뒤, /edit 앞의 긴 문자열)
 */

var WEBHOOK_URL = 'https://YOUR_DOMAIN/api/crm/leads/sheets-sync';
var SYNC_KEY = 'YOUR_SHEETS_SYNC_SECRET';

// 두 번째 스프레드시트 ID (tutoring_landing / instagram / landing 탭이 있는 시트)
var SPREADSHEET_2_ID = '16lK0Uz5_My85TXUkWr9j1dxruQhaBo6FxSf0bt8YuS4';

// ─── 탭 설정 ──────────────────────────────────────────────────────────────────
// spreadsheetId: null → 현재 스프레드시트 / string → 해당 ID의 스프레드시트 열기

var TAB_CONFIG = [
  // ── 첫 번째 스프레드시트 (META 리드) ──────────────────────────────────────
  {
    spreadsheetId: null,
    name: 'META리드_인스턴트폼',
    source_tab: 'META리드_인스턴트폼',
    colCreatedTime: 1,
    colAdName: 3,
    colPlatform: 11,
    colPhone: 14,
    colGrade: 15,
  },
  {
    spreadsheetId: null,
    name: 'META리드_인스턴트폼_목표시험',
    source_tab: 'META리드_인스턴트폼_목표시험',
    colCreatedTime: 1,
    colAdName: 3,
    colPlatform: 11,
    colPhone: 14,
    colTargetTestDate: 15,
    colGrade: 16,
  },
  {
    spreadsheetId: null,
    name: 'AP수업 문의',
    source_tab: 'AP수업 문의',
    colCreatedTime: 1,
    colAdName: 3,
    colPlatform: 11,
    colApSubject: 13,
    colPhone: 14,
  },
  {
    spreadsheetId: null,
    name: 'SuperTest 수요조사',
    source_tab: 'SuperTest 수요조사',
    colCreatedTime: 1,
    colAdName: 3,
    colPlatform: 11,
    colSupertestDate: 13,
    colPhone: 14,
    colGrade: 15,
  },

  // ── 두 번째 스프레드시트 (랜딩/인스타 폼) ───────────────────────────────────
  // 컬럼: [0]timestamp [1]? [2]studentName [3]grade [4]contact
  {
    spreadsheetId: SPREADSHEET_2_ID,
    name: 'tutoring_landing',
    source_tab: 'tutoring_landing',
    colCreatedTime: 0,
    colStudentName: 2,
    colGrade: 3,
    colPhone: 4,
  },
  {
    spreadsheetId: SPREADSHEET_2_ID,
    name: 'instagram',
    source_tab: 'instagram',
    colCreatedTime: 0,
    colStudentName: 2,
    colGrade: 3,
    colPhone: 4,
  },
  {
    spreadsheetId: SPREADSHEET_2_ID,
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
    .everyMinutes(5)
    .create();

  Logger.log('트리거 설정 완료: syncAllTabs() 5분마다 실행');
}

// ─── 메인 동기화 함수 ─────────────────────────────────────────────────────────

function syncAllTabs() {
  var props = PropertiesService.getScriptProperties();
  var ssCache = {}; // spreadsheetId → Spreadsheet 객체 캐시

  function getSpreadsheet(spreadsheetId) {
    if (!spreadsheetId) {
      return SpreadsheetApp.getActiveSpreadsheet();
    }
    if (!ssCache[spreadsheetId]) {
      ssCache[spreadsheetId] = SpreadsheetApp.openById(spreadsheetId);
    }
    return ssCache[spreadsheetId];
  }

  TAB_CONFIG.forEach(function(config) {
    var ss = getSpreadsheet(config.spreadsheetId);
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
  // phone 값에서 "p:" 등 접두사 제거
  var rawPhone = String(row[config.colPhone] || '').trim();
  var phone = rawPhone.replace(/^[a-zA-Z]:/, '').trim();

  var payload = {
    source_tab: config.source_tab,
    created_time: formatDateTime(row[config.colCreatedTime]),
    phone: phone,
  };

  // META 계열: ad_name, platform 있음
  if (config.colAdName !== undefined) {
    payload.ad_name = String(row[config.colAdName] || '').trim();
  }
  if (config.colPlatform !== undefined) {
    payload.platform = normalizePlatform(String(row[config.colPlatform] || ''));
  }

  // 랜딩/인스타 탭: 실제 이름 있음
  if (config.colStudentName !== undefined) {
    payload.student_name = String(row[config.colStudentName] || '').trim();
  }

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
  return 'ig';
}

// ─── 진단 함수 (두 번째 스프레드시트 컬럼 확인) ─────────────────────────────────

/**
 * 두 번째 스프레드시트의 탭별 컬럼 구조를 확인합니다.
 * Apps Script 에디터에서 이 함수를 한 번 실행하세요.
 */
function diagnoseSecondSheet() {
  var tabNames = ['tutoring_landing', 'instagram', 'landing'];
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_2_ID);
    tabNames.forEach(function(name) {
      var sheet = ss.getSheetByName(name);
      if (!sheet) {
        Logger.log('[' + name + '] 탭 없음 — 탭 이름을 확인하세요.');
        return;
      }
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      Logger.log('[' + name + '] 총 행: ' + lastRow + ', 총 컬럼: ' + lastCol);

      if (lastRow >= 1) {
        var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        Logger.log('[' + name + '] 헤더: ' + header.join(' | '));
      }
      if (lastRow >= 2) {
        var sample = sheet.getRange(lastRow, 1, 1, lastCol).getValues()[0];
        Logger.log('[' + name + '] 최신행: ' + sample.join(' | '));
      }
    });
  } catch (e) {
    Logger.log('두 번째 시트 접근 오류: ' + e.message);
    Logger.log('SPREADSHEET_2_ID 값을 확인하세요: ' + SPREADSHEET_2_ID);
  }
}

// ─── 수동 테스트 함수 ─────────────────────────────────────────────────────────

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

function testLandingWebhook() {
  var testPayload = {
    source_tab: 'landing',
    created_time: new Date().toISOString(),
    phone: '010-0000-1111',
    student_name: '[랜딩테스트]',
    grade: '11th',
  };

  var result = sendToWebhook(testPayload);
  Logger.log('랜딩 테스트 결과: ' + (result ? '성공' : '실패'));
}

function resetLastProcessedRows() {
  var props = PropertiesService.getScriptProperties();
  TAB_CONFIG.forEach(function(config) {
    props.deleteProperty('lastRow_' + config.source_tab);
  });
  Logger.log('마지막 처리 행 초기화 완료. 다음 실행 시 전체 재동기화됩니다.');
}
