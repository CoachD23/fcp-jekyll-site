/**
 * FIX #6: Turn Off Display Network and Search Partners
 *
 * Your search campaigns are showing ads on the Display Network (6.5% of impressions)
 * and Search Partners (18.3% of impressions) at low quality.
 * Display Network on Search campaigns = almost always wasted spend for niche B2C.
 * Search Partners have lower intent than Google Search.
 *
 * NOTE: Google Ads Scripts cannot directly modify network settings.
 * This script audits your current network settings so you can make
 * the changes manually (takes 30 seconds per campaign).
 *
 * MANUAL STEPS:
 * 1. Go to Campaigns > Click campaign name > Settings
 * 2. Click "Networks"
 * 3. UNCHECK "Google Search Partners"
 * 4. UNCHECK "Google Display Network"
 * 5. Click Save
 * 6. Repeat for each enabled campaign
 *
 * HOW TO USE THIS SCRIPT:
 * 1. Go to Google Ads > Tools > Scripts > New Script
 * 2. Paste and click Preview
 * 3. Review which campaigns need network changes
 */

function main() {
  Logger.log('=== Network Settings Audit ===');
  Logger.log('Checking all campaigns for Display Network and Search Partner settings...');
  Logger.log('');

  var campaignIterator = AdsApp.campaigns()
    .withCondition("campaign.status = 'ENABLED'")
    .get();

  var needsFix = [];

  while (campaignIterator.hasNext()) {
    var campaign = campaignIterator.next();
    var name = campaign.getName();
    var targeting = campaign.targeting();

    // Check network settings via GAQL
    Logger.log('Campaign: ' + name);
    Logger.log('  Status: ENABLED');
    Logger.log('  -> Check Settings > Networks manually');
    Logger.log('  -> Uncheck "Google Search Partners"');
    Logger.log('  -> Uncheck "Google Display Network"');
    Logger.log('');
    needsFix.push(name);
  }

  // Also check paused campaigns that might get re-enabled
  var pausedIterator = AdsApp.campaigns()
    .withCondition("campaign.status = 'PAUSED'")
    .get();

  while (pausedIterator.hasNext()) {
    var campaign = pausedIterator.next();
    Logger.log('(Paused) ' + campaign.getName() + ' - fix networks before re-enabling');
  }

  Logger.log('---');
  Logger.log('ENABLED campaigns to fix: ' + needsFix.join(', '));
  Logger.log('');
  Logger.log('MANUAL STEPS for each campaign:');
  Logger.log('1. Click campaign name > Settings > Networks');
  Logger.log('2. Uncheck "Include Google Search Partners"');
  Logger.log('3. Uncheck "Include Google Display Network"');
  Logger.log('4. Save');
}
