/**
 * Google Ads Script: Change all Broad Match keywords to Phrase Match
 * in the IOI Search campaign.
 *
 * HOW TO USE:
 * 1. Go to Google Ads > Tools > Scripts
 * 2. Click + New Script
 * 3. Paste this entire script
 * 4. Click Preview to test (no changes made)
 * 5. Click Run to execute
 */

function main() {
  var campaignName = 'IOI Search';

  // Get all enabled broad match keywords in the IOI Search campaign
  var keywordIterator = AdsApp.keywords()
    .withCondition("CampaignName = '" + campaignName + "'")
    .withCondition("Status = ENABLED")
    .withCondition("KeywordMatchType = BROAD")
    .get();

  var count = 0;
  var changed = [];

  while (keywordIterator.hasNext()) {
    var keyword = keywordIterator.next();
    var text = keyword.getText();

    // Skip branded keywords — keep those as broad for maximum coverage
    if (text.toLowerCase().indexOf('florida coastal prep') > -1) {
      Logger.log('SKIPPED (branded): ' + text);
      continue;
    }

    // Remove the keyword and re-add as phrase match
    // Google Ads Scripts doesn't allow direct match type change,
    // so we pause the broad version and add a phrase match version
    var adGroup = keyword.getAdGroup();
    var bid = keyword.bidding().getCpc();

    // Pause the broad match version
    keyword.pause();

    // Add phrase match version
    var builder = adGroup.newKeywordBuilder()
      .withText('"' + text + '"')  // Quotes = phrase match
      .withCpc(bid);

    var result = builder.build();

    if (result.isSuccessful()) {
      count++;
      changed.push(text);
      Logger.log('CHANGED to Phrase: "' + text + '"');
    } else {
      Logger.log('ERROR adding phrase match for: ' + text + ' - ' + result.getErrors().join(', '));
    }
  }

  Logger.log('---');
  Logger.log('Total keywords changed from Broad to Phrase: ' + count);
  Logger.log('Keywords: ' + changed.join(', '));
}
