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
