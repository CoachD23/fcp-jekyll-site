/**
 * FIX #5: Change ALL Broad Match Keywords to Phrase Match
 *
 * Applies to ALL campaigns (not just IOI Search).
 * Broad match is hemorrhaging budget on irrelevant searches.
 * Phrase match will restrict ads to queries containing your keyword phrase.
 *
 * Branded keywords ("florida coastal prep") are kept as Broad
 * since you want maximum coverage on your own brand name.
 *
 * HOW TO USE:
 * 1. Go to Google Ads > Tools > Scripts
 * 2. Click + New Script
 * 3. Paste this entire script
 * 4. Click Preview to test (no changes made)
 * 5. Review the log — make sure it looks right
 * 6. Set DRY_RUN = false and click Run to execute
 */

var DRY_RUN = true; // Set to false to execute changes

function main() {
  // Keywords to keep as Broad match (branded terms)
  var keepBroad = [
    'florida coastal prep',
    'fcp basketball',
    'fcp sports'
  ];

  // Get ALL enabled broad match keywords across all campaigns
  var keywordIterator = AdsApp.keywords()
    .withCondition("ad_group_criterion.status = 'ENABLED'")
    .withCondition("ad_group_criterion.keyword.match_type = 'BROAD'")
    .get();

  var total = keywordIterator.totalNumEntities();
  Logger.log('Found ' + total + ' broad match keywords across all campaigns');
  Logger.log('---');

  var changed = 0;
  var skipped = 0;
  var errors = 0;

  while (keywordIterator.hasNext()) {
    var keyword = keywordIterator.next();
    var text = keyword.getText();
    var campaign = keyword.getCampaign().getName();
    var adGroup = keyword.getAdGroup();
    var bid = keyword.bidding().getCpc();

    // Check if this is a branded keyword we want to keep broad
    var isBranded = false;
    for (var i = 0; i < keepBroad.length; i++) {
      if (text.toLowerCase().indexOf(keepBroad[i].toLowerCase()) > -1) {
        isBranded = true;
        break;
      }
    }

    if (isBranded) {
      Logger.log('SKIP (branded): "' + text + '" in ' + campaign);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      Logger.log('WOULD CHANGE: "' + text + '" in ' + campaign + ' -> Phrase match');
      changed++;
    } else {
      try {
        // Pause the broad match version
        keyword.pause();

        // Create phrase match version in same ad group with same bid
        var result = adGroup.newKeywordBuilder()
          .withText('"' + text + '"')
          .withCpc(bid || 1.50) // Default $1.50 if no bid set
          .build();

        if (result.isSuccessful()) {
          changed++;
          Logger.log('CHANGED: "' + text + '" in ' + campaign + ' -> Phrase match');
        } else {
          errors++;
          Logger.log('ERROR: "' + text + '" - ' + result.getErrors().join(', '));
        }
      } catch (e) {
        errors++;
        Logger.log('ERROR: "' + text + '" - ' + e.message);
      }
    }
  }

  Logger.log('---');
  Logger.log('Summary:');
  Logger.log('  Changed to Phrase: ' + changed);
  Logger.log('  Skipped (branded): ' + skipped);
  Logger.log('  Errors: ' + errors);

  if (DRY_RUN) {
    Logger.log('');
    Logger.log('This was a DRY RUN. Set DRY_RUN = false and run again to apply changes.');
  }
}
