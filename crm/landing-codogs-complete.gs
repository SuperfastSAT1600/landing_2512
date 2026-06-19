// ─── 기존 알림 함수 ───────────────────────────────────────────────────────────

function checkNewData() {
  var sheetNames = ["tutoring_landing", "instagram", "landing"];
  var emailRecipients = ["superfastsat@naver.com", "minjae.lee90@gmail.com"];
  var slackWebhookUrl = "SLACK_WEBHOOK_URL_여기에_입력";

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var scriptProperties = PropertiesService.getScriptProperties();

  sheetNames.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      console.log("[Error] 시트 " + sheetName + "를 찾을 수 없습니다.");
      return;
    }

    var lastRow = sheet.getLastRow();
    var lastCheckedRow = Number(scriptProperties.getProperty(sheetName) || 0);
    console.log("🔍 시트: " + sheetName + ", 마지막 행: " + lastRow + ", 이전 확인된 행: " + lastCheckedRow);

    if (lastRow > lastCheckedRow) {
      var startRow = lastCheckedRow < 1 ? 2 : lastCheckedRow + 1;
      var numNewRows = lastRow - startRow + 1;
      if (numNewRows < 1) return;

      var newRows = sheet.getRange(startRow, 1, numNewRows, sheet.getLastColumn()).getValues();

      newRows.forEach(function(row) {
        var timestamp = row[0] || "";
        var studentName = row[2] || "(미입력)";
        var grade = row[3] || "(미입력)";
        var contact = row[4] || "(미입력)";

        var emailBody = "📌 새로운 상담 신청이 들어왔습니다!\n\n"
          + "📋 채널: " + sheetName + "\n"
          + "🕐 시간: " + timestamp + "\n"
          + "👤 학생 이름: " + studentName + "\n"
          + "🎓 학년: " + grade + "\n"
          + "📞 연락처: " + contact;

        var slackMessage = ":rotating_light: *새로운 상담 신청!*\n\n"
          + ">📋 *채널:* " + sheetName + "\n"
          + ">🕐 *시간:* " + timestamp + "\n"
          + ">👤 *학생:* " + studentName + "\n"
          + ">🎓 *학년:* " + grade + "\n"
          + ">📞 *연락처:* " + contact;

        try {
          emailRecipients.forEach(function(email) {
            MailApp.sendEmail({
              to: email,
              subject: "[SuperfastSAT] 새 상담 신청 - " + studentName + " (" + sheetName + ")",
              body: emailBody
            });
          });
          console.log("✅ 이메일 전송 성공: " + studentName);
        } catch (error) {
          console.error("❌ 이메일 전송 오류: " + error.message);
        }

        try {
          var options = {
            method: "post",
            contentType: "application/json",
            payload: JSON.stringify({ text: slackMessage })
          };
          UrlFetchApp.fetch(slackWebhookUrl, options);
          console.log("✅ Slack 전송 성공: " + studentName);
        } catch (error) {
          console.error("❌ Slack 전송 오류: " + error.message);
        }
      });

      scriptProperties.setProperty(sheetName, lastRow.toString());
    } else {
      console.log("⏳ 새로운 데이터 없음 (" + sheetName + ").");
    }
  });
}

function diagnoseSecondSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  sheets.forEach(function(sheet) {
    var name = sheet.getName();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    Logger.log('[' + name + '] 행: ' + lastRow + ', 컬럼: ' + lastCol);
    if (lastRow >= 1) {
      var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      Logger.log('[' + name + '] 헤더: ' + header.join(' | '));
    }
    if (lastRow >= 2) {
      var sample = sheet.getRange(lastRow, 1, 1, lastCol).getValues()[0];
      Logger.log('[' + name + '] 최신행: ' + sample.join(' | '));
    }
  });
}

// ─── CRM 연동 설정 ────────────────────────────────────────────────────────────

var WEBHOOK_URL = 'https://tutoring.superfastsat.com/api/crm/leads/sheets-sync';
var SYNC_KEY = '03500662058aae00e7a58755bbf04cec4e860e43d95c582b';

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
    .spreadsheet(SpreadsheetApp.getActive())
    .onFormSubmit()
    .create();
  Logger.log('트리거 설정 완료: syncAllTabs() 폼 제출 시 실행');
}

// ─── 신규 폼 제출 → CRM 자동 등록 ────────────────────────────────────────────

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
  var kst = 'Asia/Seoul';
  var fmt = "yyyy-MM-dd'T'HH:mm:ss";
  if (!value) return Utilities.formatDate(new Date(), kst, fmt);
  if (value instanceof Date) return Utilities.formatDate(value, kst, fmt);
  return String(value);
}

// ─── 현재 행을 처리 완료로 표시 (syncAllTabs 과거 데이터 재처리 방지) ──────────

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

// ─── 마이그레이션 (기존 리드 inquiry_date 시각 소급 업데이트) ─────────────────

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
