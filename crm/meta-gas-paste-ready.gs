// =====================================================================
//  SuperfastSAT — 메타 광고 리드 Google Sheets → CRM Sync
//  Code.gs 전체 내용을 교체할 때 이 파일을 통째로 붙여넣으세요.
// =====================================================================

function onEdit(e) {
  if (!e || !e.source) return;
  var sheet = e.source.getActiveSheet();
  var range = e.range;

  if (
    /^상담 내용_(이민재|장현아|김남준|배병윤|김우영)$/.test(sheet.getName()) &&
    range.getA1Notation() === 'F2' &&
    range.getValue() === '저장하기'
  ) {
    var rowData = sheet.getRange('A2:D2').getValues()[0];
    var customerStatus = sheet.getRange('E2').getValue();
    rowData.push(customerStatus);

    var targetSheet = e.source.getSheetByName('상담DB');
    var lastRow = targetSheet.getLastRow();
    targetSheet.getRange(lastRow + 1, 1, 1, 5).setValues([rowData]);

    SpreadsheetApp.getUi().alert('데이터가 옮겨졌습니다.');

    sheet.getRange('F2').setValue('');
    sheet.getRange('E2').setValue('');
    sheet.getRange('B2:D2').clearContent();
  }

  if (
    sheet.getName() === 'CRM 이력' &&
    range.getA1Notation() === 'L2' &&
    range.getValue() === '저장하기'
  ) {
    var valA2 = sheet.getRange('A2').getValue();
    var valD2 = sheet.getRange('F2').getValue();
    var valA3 = sheet.getRange('A3').getValue();
    var valI2 = sheet.getRange('K2').getValue();

    var crmRowData = [valA2, valD2, valA3, valI2, '광고문자'];

    var targetSheet = e.source.getSheetByName('상담DB');
    var lastRow = targetSheet.getLastRow();
    targetSheet.getRange(lastRow + 1, 1, 1, 5).setValues([crmRowData]);

    SpreadsheetApp.getUi().alert('CRM 이력 데이터가 상담DB에 저장되었습니다.');

    sheet.getRange('F2').clearContent();
    sheet.getRange('K2').clearContent();
    sheet.getRange('L2').clearContent();
  }
}

// ─── CRM 연동 설정 ────────────────────────────────────────────────────────────

var WEBHOOK_URL = 'https://tutoring.superfastsat.com/api/crm/leads/sheets-sync';
var SYNC_KEY = '03500662058aae00e7a58755bbf04cec4e860e43d95c582b';

var TAB_CONFIG = [
  {
    name: 'META리드_인스턴트폼',
    source_tab: 'META리드_인스턴트폼',
    colCreatedTime: 1,
    colAdName: 3,
    colAdsetName: 5,
    colPlatform: 11,
    colGrade: 12,
    colTargetScore: 13,
    colPhone: 14,
  },
  {
    name: 'META리드_인스턴트폼_목표시험',
    source_tab: 'META리드_인스턴트폼_목표시험',
    colCreatedTime: 1,
    colAdName: 3,
    colAdsetName: 5,
    colPlatform: 11,
    colTargetTestDate: 12,
    colGrade: 13,
    colPhone: 14,
  },
  {
    name: 'AP수업 문의',
    source_tab: 'AP수업 문의',
    colCreatedTime: 1,
    colAdName: 3,
    colAdsetName: 5,
    colPlatform: 11,
    colApSubject: 12,
    colPhone: 13,
  },
  {
    name: 'SuperTest 수요조사',
    source_tab: 'SuperTest 수요조사',
    colCreatedTime: 1,
    colAdName: 3,
    colAdsetName: 5,
    colPlatform: 11,
    colSupertestDate: 12,
    colGrade: 13,
    colPhone: 14,
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
      var phone = String(row[config.colPhone] || '').trim().replace(/^[a-z]:/, '');
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
  var payload = {
    source_tab: config.source_tab,
    created_time: formatDateTime(row[config.colCreatedTime]),
    ad_name: config.colAdName !== undefined ? String(row[config.colAdName] || '').trim() : '',
    adset_name: config.colAdsetName !== undefined ? String(row[config.colAdsetName] || '').trim() : '',
    platform: normalizePlatform(String(row[config.colPlatform] || '')),
    phone: String(row[config.colPhone] || '').trim().replace(/^[a-z]:/, ''),
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

// ─── 웹훅 전송 ────────────────────────────────────────────────────────────────

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
    if (code === 200 || code === 201) return true;
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

// ─── 마이그레이션 (기존 리드 inquiry_date 시각 소급 업데이트) ─────────────────
// Apps Script 에디터에서 1회만 실행. 이미 시각이 있는 리드는 자동 skip.

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
      var phone = String(row[config.colPhone] || '').trim().replace(/^[a-z]:/, '');
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

// ─── 현재 행을 처리 완료로 표시 (과거 데이터 재처리 방지) ────────────────────

function setLastRowToCurrent() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getScriptProperties();
  TAB_CONFIG.forEach(function(config) {
    var sheet = ss.getSheetByName(config.name);
    if (!sheet) return;
    props.setProperty('lastRow_' + config.source_tab, String(sheet.getLastRow()));
    Logger.log('[' + config.name + '] lastRow 설정: ' + sheet.getLastRow());
  });
}

// ─── 수동 테스트 ──────────────────────────────────────────────────────────────

function testWebhookConnection() {
  var testPayload = {
    source_tab: 'META리드_인스턴트폼',
    created_time: '2026-01-01T00:00:00.000Z',
    ad_name: '[APPS_SCRIPT_TEST]',
    adset_name: '[TEST_ADSET]',
    platform: 'ig',
    phone: '010-0000-0000',
    grade: '11',
    target_score_text: '1500',
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

function diagnoseTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabNames = [
    'META리드_인스턴트폼',
    'META리드_인스턴트폼_목표시험',
    'AP수업 문의',
    'SuperTest 수요조사',
  ];
  tabNames.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      Logger.log('[' + name + '] 탭 없음');
      return;
    }
    var lastRow = sheet.getLastRow();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var lastRowData = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log('=== ' + name + ' (총 ' + sheet.getLastColumn() + '컬럼) ===');
    headers.forEach(function(h, i) {
      Logger.log('  col[' + i + '] ' + h + ' → ' + lastRowData[i]);
    });
  });
}
