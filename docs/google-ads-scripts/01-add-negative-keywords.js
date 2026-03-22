/**
 * FIX #3: Add Negative Keywords to All Campaigns
 *
 * Adds a comprehensive negative keyword list to block irrelevant traffic:
 * - Recreational/local terms (aau, tryouts, leagues, near me, etc.)
 * - Content seekers (pdf, free, drills, plays)
 * - Competitor brand names (img academy, montverde, dme academy, prolific prep)
 * - Wrong audience (youth, nba, pro, wnba, trainer)
 *
 * HOW TO USE:
 * 1. Go to Google Ads > Tools > Scripts
 * 2. Click + New Script
 * 3. Paste this entire script
 * 4. Click Preview to test (no changes made)
 * 5. Review the log output
 * 6. Set DRY_RUN = false and click Run to execute
 */

var DRY_RUN = true; // Set to false to actually add negatives

function main() {
  // Negative keywords organized by category
  var negatives = {
    'recreational': [
      'aau', 'aau basketball', 'aau tryouts', 'aau teams',
      'tryouts', 'basketball tryouts', 'basketball tryouts near me',
      'leagues', 'basketball leagues', 'basketball leagues near me',
      'near me', 'basketball near me',
      'rec', 'recreational', 'rec league',
      'pickup basketball', 'open gym',
      'intramural'
    ],
    'wrong_audience': [
      'youth', 'youth basketball', 'kids basketball',
      'nba', 'nba tryouts', 'nba basketball school',
      'pro', 'pro basketball tryouts', 'professional',
      'wnba', 'g league',
      'trainer', 'basketball trainer', 'personal trainer',
      'coaching job', 'basketball coaching jobs',
      'referee', 'basketball referee'
    ],
    'content_seekers': [
      'pdf', 'free', 'free basketball',
      'drills', 'basketball drills',
      'plays', 'basketball plays',
      'playbook pdf', 'practice plans pdf',
      'rules', 'basketball rules',
      'history of basketball',
      'how to play basketball',
      'basketball shoes', 'basketball jersey'
    ],
    'competitors': [
      'img academy', 'img academy basketball',
      'montverde', 'montverde academy', 'montverde academy basketball',
      'dme academy', 'dme academy basketball',
      'prolific prep', 'prolific prep basketball',
      'oak hill academy', 'oak hill',
      'sunrise christian', 'sunrise christian academy',
      'brewster academy',
      'huntington prep',
      'la lumiere'
    ],
    'geographic_irrelevant': [
      'basketball academy uk', 'basketball academy europe',
      'basketball academy australia', 'basketball academy canada',
      'basketball school uk', 'basketball school europe'
    ]
  };

  // Apply to these campaigns (enabled ones)
  var targetCampaigns = ['IOI Search', 'Princeton Playbook - Search'];

  var totalAdded = 0;

  for (var i = 0; i < targetCampaigns.length; i++) {
    var campaignName = targetCampaigns[i];
    var campaignIterator = AdsApp.campaigns()
      .withCondition("campaign.name = '" + campaignName + "'")
      .get();

    if (!campaignIterator.hasNext()) {
      Logger.log('Campaign not found: ' + campaignName);
      continue;
    }

    var campaign = campaignIterator.next();
    Logger.log('=== Adding negatives to: ' + campaignName + ' ===');

    for (var category in negatives) {
      var terms = negatives[category];
      Logger.log('  Category: ' + category + ' (' + terms.length + ' terms)');

      for (var j = 0; j < terms.length; j++) {
        var term = terms[j];
        if (DRY_RUN) {
          Logger.log('    [DRY RUN] Would add: "' + term + '"');
        } else {
          try {
            // Add as phrase match negative (blocks the phrase + close variants)
            campaign.createNegativeKeyword('"' + term + '"');
            Logger.log('    Added: "' + term + '"');
            totalAdded++;
          } catch (e) {
            Logger.log('    ERROR adding "' + term + '": ' + e.message);
          }
        }
      }
    }
  }

  Logger.log('---');
  if (DRY_RUN) {
    Logger.log('DRY RUN complete. Set DRY_RUN = false and run again to apply.');
    Logger.log('Total negatives that would be added per campaign: ' +
      Object.keys(negatives).reduce(function(sum, cat) { return sum + negatives[cat].length; }, 0));
  } else {
    Logger.log('Total negative keywords added: ' + totalAdded);
  }
}
