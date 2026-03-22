/**
 * FIX #4: Pause Princeton Playbook Campaign
 *
 * This campaign targets coaches searching for X's and O's content
 * (princeton offense, basketball plays pdf, practice plans).
 * These are NOT prospective student-athletes or parents.
 * $439 spent with near-zero conversions.
 *
 * HOW TO USE:
 * 1. Go to Google Ads > Tools > Scripts
 * 2. Click + New Script
 * 3. Paste this entire script
 * 4. Click Preview to test (no changes made)
 * 5. Set DRY_RUN = false and click Run to execute
 */

var DRY_RUN = true; // Set to false to actually pause

function main() {
  var campaignName = 'Princeton Playbook - Search';

  var campaignIterator = AdsApp.campaigns()
    .withCondition("campaign.name = '" + campaignName + "'")
    .get();

  if (!campaignIterator.hasNext()) {
    Logger.log('Campaign not found: ' + campaignName);
    return;
  }

  var campaign = campaignIterator.next();
  var currentStatus = campaign.isEnabled() ? 'ENABLED' : 'PAUSED';

  Logger.log('Campaign: ' + campaignName);
  Logger.log('Current status: ' + currentStatus);
  Logger.log('Total cost (all time): $439');
  Logger.log('Conversions: ~0');
  Logger.log('Reason: Targeting coaches, not prospects');

  if (currentStatus === 'PAUSED') {
    Logger.log('Campaign is already paused. No action needed.');
    return;
  }

  if (DRY_RUN) {
    Logger.log('[DRY RUN] Would pause campaign: ' + campaignName);
  } else {
    campaign.pause();
    Logger.log('PAUSED: ' + campaignName);
  }
}
