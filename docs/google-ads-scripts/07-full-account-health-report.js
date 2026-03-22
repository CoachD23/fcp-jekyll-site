/**
 * BONUS: Full Account Health Report
 *
 * Run this script weekly to get a snapshot of account performance,
 * wasted spend, and optimization opportunities.
 *
 * HOW TO USE:
 * 1. Go to Google Ads > Tools > Scripts > New Script
 * 2. Paste and click Run
 * 3. Check the Logs tab for the full report
 *
 * TIP: Schedule this to run weekly (Scripts > Frequency > Weekly)
 */

function main() {
  var DAYS_LOOKBACK = 30;
  var today = new Date();
  var startDate = new Date(today.getTime() - DAYS_LOOKBACK * 24 * 60 * 60 * 1000);
  var dateStart = formatDate(startDate);
  var dateEnd = formatDate(today);

  Logger.log('========================================');
  Logger.log('  FCP GOOGLE ADS HEALTH REPORT');
  Logger.log('  Last ' + DAYS_LOOKBACK + ' days');
  Logger.log('  ' + dateStart + ' to ' + dateEnd);
  Logger.log('========================================');
  Logger.log('');

  // 1. Campaign Performance
  Logger.log('--- CAMPAIGN PERFORMANCE ---');
  var campReport = AdsApp.report(
    "SELECT campaign.name, campaign.status, metrics.clicks, " +
    "metrics.impressions, metrics.cost_micros, metrics.conversions, " +
    "metrics.ctr, metrics.average_cpc " +
    "FROM campaign " +
    "WHERE segments.date BETWEEN '" + dateStart + "' AND '" + dateEnd + "' " +
    "ORDER BY metrics.cost_micros DESC"
  );

  var campRows = campReport.rows();
  var totalCost = 0;
  var totalClicks = 0;
  var totalConversions = 0;

  while (campRows.hasNext()) {
    var row = campRows.next();
    var cost = parseInt(row['metrics.cost_micros']) / 1000000;
    var clicks = parseInt(row['metrics.clicks']);
    var conversions = parseFloat(row['metrics.conversions']);
    totalCost += cost;
    totalClicks += clicks;
    totalConversions += conversions;

    Logger.log(row['campaign.name'] + ' [' + row['campaign.status'] + ']');
    Logger.log('  Spend: $' + cost.toFixed(2) + ' | Clicks: ' + clicks +
      ' | Conv: ' + conversions + ' | CTR: ' + (parseFloat(row['metrics.ctr']) * 100).toFixed(2) + '%' +
      ' | Avg CPC: $' + (parseInt(row['metrics.average_cpc']) / 1000000).toFixed(2));
  }

  Logger.log('');
  Logger.log('TOTALS: $' + totalCost.toFixed(2) + ' spent | ' +
    totalClicks + ' clicks | ' + totalConversions + ' conversions');
  if (totalConversions > 0) {
    Logger.log('Cost per conversion: $' + (totalCost / totalConversions).toFixed(2));
  }
  Logger.log('');

  // 2. Top Wasted Search Terms
  Logger.log('--- TOP WASTED SEARCH TERMS (>$3 spend, 0 conversions) ---');
  var searchReport = AdsApp.report(
    "SELECT search_term_view.search_term, metrics.clicks, " +
    "metrics.cost_micros, metrics.conversions, metrics.ctr " +
    "FROM search_term_view " +
    "WHERE metrics.cost_micros > 3000000 " +
    "AND metrics.conversions = 0 " +
    "AND segments.date BETWEEN '" + dateStart + "' AND '" + dateEnd + "' " +
    "ORDER BY metrics.cost_micros DESC " +
    "LIMIT 20"
  );

  var searchRows = searchReport.rows();
  var wastedTotal = 0;

  while (searchRows.hasNext()) {
    var row = searchRows.next();
    var cost = parseInt(row['metrics.cost_micros']) / 1000000;
    wastedTotal += cost;
    Logger.log('  "' + row['search_term_view.search_term'] + '" — $' +
      cost.toFixed(2) + ' | ' + row['metrics.clicks'] + ' clicks | 0 conv');
  }

  Logger.log('  Total wasted on zero-conversion terms: $' + wastedTotal.toFixed(2));
  Logger.log('');

  // 3. Top Performing Keywords
  Logger.log('--- TOP PERFORMING KEYWORDS (by conversions) ---');
  var kwReport = AdsApp.report(
    "SELECT ad_group_criterion.keyword.text, " +
    "ad_group_criterion.keyword.match_type, " +
    "metrics.clicks, metrics.cost_micros, metrics.conversions, " +
    "metrics.ctr, metrics.average_cpc " +
    "FROM keyword_view " +
    "WHERE metrics.conversions > 0 " +
    "AND segments.date BETWEEN '" + dateStart + "' AND '" + dateEnd + "' " +
    "ORDER BY metrics.conversions DESC " +
    "LIMIT 10"
  );

  var kwRows = kwReport.rows();
  while (kwRows.hasNext()) {
    var row = kwRows.next();
    var cost = parseInt(row['metrics.cost_micros']) / 1000000;
    Logger.log('  "' + row['ad_group_criterion.keyword.text'] + '" [' +
      row['ad_group_criterion.keyword.match_type'] + ']');
    Logger.log('    Conv: ' + row['metrics.conversions'] + ' | $' +
      cost.toFixed(2) + ' | CPA: $' +
      (cost / parseFloat(row['metrics.conversions'])).toFixed(2));
  }

  Logger.log('');

  // 4. Device Performance
  Logger.log('--- DEVICE PERFORMANCE ---');
  var deviceReport = AdsApp.report(
    "SELECT segments.device, metrics.clicks, metrics.impressions, " +
    "metrics.cost_micros, metrics.conversions, metrics.ctr " +
    "FROM campaign " +
    "WHERE segments.date BETWEEN '" + dateStart + "' AND '" + dateEnd + "'"
  );

  var deviceRows = deviceReport.rows();
  while (deviceRows.hasNext()) {
    var row = deviceRows.next();
    var cost = parseInt(row['metrics.cost_micros']) / 1000000;
    Logger.log('  ' + row['segments.device'] + ': $' + cost.toFixed(2) +
      ' | ' + row['metrics.clicks'] + ' clicks | ' +
      row['metrics.conversions'] + ' conv | ' +
      (parseFloat(row['metrics.ctr']) * 100).toFixed(2) + '% CTR');
  }

  Logger.log('');
  Logger.log('========================================');
  Logger.log('  END OF REPORT');
  Logger.log('========================================');
}

function formatDate(date) {
  return Utilities.formatDate(date, AdsApp.currentAccount().getTimeZone(), 'yyyy-MM-dd');
}
