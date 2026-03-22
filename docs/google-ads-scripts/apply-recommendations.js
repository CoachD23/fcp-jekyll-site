/**
 * Google Ads Script: Auto-apply eligible recommendations
 * Focuses on price assets and structured snippets.
 *
 * HOW TO USE:
 * 1. Go to Google Ads > Tools > Scripts
 * 2. Click + New Script
 * 3. Paste this entire script
 * 4. Click Preview to test (no changes made)
 * 5. Click Run to execute
 *
 * NOTE: Google Ads Scripts has limited recommendation API access.
 * For price assets and structured snippets, the easiest method is:
 *
 * MANUAL STEPS (2 minutes):
 * 1. Go to Recommendations page in Google Ads
 * 2. Find "Add price assets" recommendation → Click Apply
 * 3. Find "Add structured snippets" recommendation → Click Apply
 * 4. Done — both should show +2.8% estimated CTR improvement
 *
 * This script handles what CAN be automated — search term mining
 * for new negative keywords based on poor performance.
 */

function main() {
  var campaignName = 'IOI Search';
  var CTR_THRESHOLD = 0.01;  // Below 1% CTR = likely irrelevant
  var COST_THRESHOLD = 5.00; // Spent >$5 with 0 conversions = waste
  var DAYS_LOOKBACK = 90;

  // Date range
  var today = new Date();
  var startDate = new Date(today.getTime() - DAYS_LOOKBACK * 24 * 60 * 60 * 1000);
  var dateRange = formatDate(startDate) + ',' + formatDate(today);

  Logger.log('Analyzing search terms for ' + campaignName + ' over last ' + DAYS_LOOKBACK + ' days');
  Logger.log('---');

  // Get search terms with poor performance
  var report = AdsApp.report(
    "SELECT search_term_view.search_term, metrics.clicks, metrics.impressions, " +
    "metrics.cost_micros, metrics.conversions, metrics.ctr " +
    "FROM search_term_view " +
    "WHERE campaign.name = '" + campaignName + "' " +
    "AND metrics.impressions > 50 " +
    "AND segments.date BETWEEN '" + formatDateAPI(startDate) + "' AND '" + formatDateAPI(today) + "' " +
    "ORDER BY metrics.cost_micros DESC"
  );

  var wastefulTerms = [];
  var rows = report.rows();

  while (rows.hasNext()) {
    var row = rows.next();
    var term = row['search_term_view.search_term'];
    var clicks = parseInt(row['metrics.clicks']);
    var impressions = parseInt(row['metrics.impressions']);
    var costMicros = parseInt(row['metrics.cost_micros']);
    var cost = costMicros / 1000000;
    var conversions = parseFloat(row['metrics.conversions']);
    var ctr = parseFloat(row['metrics.ctr']);

    // Flag terms with high spend + zero conversions, or very low CTR
    if ((cost > COST_THRESHOLD && conversions === 0) || (impressions > 200 && ctr < CTR_THRESHOLD)) {
      wastefulTerms.push({
        term: term,
        cost: cost.toFixed(2),
        clicks: clicks,
        impressions: impressions,
        conversions: conversions,
        ctr: (ctr * 100).toFixed(2) + '%'
      });
      Logger.log('WASTEFUL: "' + term + '" — $' + cost.toFixed(2) + ' spent, ' +
                 conversions + ' conv, ' + (ctr * 100).toFixed(2) + '% CTR');
    }
  }

  Logger.log('---');
  Logger.log('Found ' + wastefulTerms.length + ' wasteful search terms to review as potential negatives');
  Logger.log('Review the log output and add the worst offenders as negative keywords');
}

function formatDate(date) {
  return Utilities.formatDate(date, AdsApp.currentAccount().getTimeZone(), 'yyyyMMdd');
}

function formatDateAPI(date) {
  return Utilities.formatDate(date, AdsApp.currentAccount().getTimeZone(), 'yyyy-MM-dd');
}
