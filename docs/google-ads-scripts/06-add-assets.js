/**
 * FIX #7: Add Price Assets and Structured Snippets
 *
 * Google recommends these for +2.8% CTR improvement each.
 * Google Ads Scripts cannot create these asset types directly,
 * but this script provides the exact data and walks you through it.
 *
 * MANUAL STEPS (2 minutes total):
 *
 * === PRICE ASSETS ===
 * 1. Go to Ads > Assets > + Asset > Price
 * 2. Add to: Campaign "IOI Search"
 * 3. Type: Services
 * 4. Price qualifier: From
 * 5. Add these items:
 *
 *    Header: Post-Grad Program
 *    Description: Full-year basketball & academics
 *    Price: $2,500/mo
 *    URL: https://floridacoastalprep.com/post-grad/
 *
 *    Header: High School Program
 *    Description: Grades 9-12 athlete development
 *    Price: $2,500/mo
 *    URL: https://floridacoastalprep.com/high-school/
 *
 *    Header: Training Program
 *    Description: Spartan Training Center access
 *    Price: $150/mo
 *    URL: https://floridacoastalprep.com/training/
 *
 * === STRUCTURED SNIPPETS ===
 * 1. Go to Ads > Assets > + Asset > Structured snippet
 * 2. Add to: Campaign "IOI Search"
 * 3. Header: Amenities
 * 4. Values:
 *    - NCAA-Level Gym
 *    - Furnished Housing
 *    - Academic Tutoring
 *    - College Placement
 *    - Film Room
 *    - Weight Training
 *    - Beach Access
 *
 * Alternative header: Programs
 * Values:
 *    - Post-Graduate Basketball
 *    - High School Basketball
 *    - International Student Program
 *    - Summer Elite Camp
 *    - Spartan Skill Camp
 *
 * HOW TO USE THIS SCRIPT:
 * 1. Run it to see all the data formatted
 * 2. Follow the manual steps above to add them in the UI
 */

function main() {
  Logger.log('=== Asset Recommendations for IOI Search ===');
  Logger.log('');
  Logger.log('PRICE ASSETS (estimated +2.8% CTR):');
  Logger.log('  Type: Services | Qualifier: From');
  Logger.log('');
  Logger.log('  1. Post-Grad Program');
  Logger.log('     Full-year basketball & academics');
  Logger.log('     From $2,500/mo');
  Logger.log('     URL: /post-grad/');
  Logger.log('');
  Logger.log('  2. High School Program');
  Logger.log('     Grades 9-12 athlete development');
  Logger.log('     From $2,500/mo');
  Logger.log('     URL: /high-school/');
  Logger.log('');
  Logger.log('  3. Training Program');
  Logger.log('     Spartan Training Center access');
  Logger.log('     From $150/mo');
  Logger.log('     URL: /training/');
  Logger.log('');
  Logger.log('STRUCTURED SNIPPETS (estimated +2.8% CTR):');
  Logger.log('');
  Logger.log('  Header: Amenities');
  Logger.log('  Values: NCAA-Level Gym, Furnished Housing, Academic Tutoring,');
  Logger.log('          College Placement, Film Room, Weight Training, Beach Access');
  Logger.log('');
  Logger.log('  Header: Programs');
  Logger.log('  Values: Post-Graduate Basketball, High School Basketball,');
  Logger.log('          International Student Program, Summer Elite Camp');
  Logger.log('');
  Logger.log('---');
  Logger.log('Go to: Ads > Assets > + > Price / Structured snippet');
  Logger.log('Apply to campaign: IOI Search');

  // Verify current assets
  Logger.log('');
  Logger.log('=== Current Asset Check ===');

  var assetReport = AdsApp.report(
    "SELECT asset.name, asset.type, asset.resource_name " +
    "FROM asset " +
    "WHERE asset.type IN ('STRUCTURED_SNIPPET', 'PRICE') " +
    "LIMIT 20"
  );

  var assetRows = assetReport.rows();
  var count = 0;
  while (assetRows.hasNext()) {
    var row = assetRows.next();
    count++;
    Logger.log('  Existing: ' + row['asset.name'] + ' (' + row['asset.type'] + ')');
  }

  if (count === 0) {
    Logger.log('  No price or structured snippet assets found. Adding these is recommended.');
  }
}
