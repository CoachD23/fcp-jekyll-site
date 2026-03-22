/**
 * FIX #1: Conversion Tracking Audit & Setup Guide
 *
 * Your Google Ads overview shows: "A conversion action has been created,
 * but the tag is not yet verified for: Purchase"
 *
 * Without proper conversion tracking, Google cannot optimize toward
 * actual applications/payments. This is the #1 priority fix.
 *
 * This script audits your existing conversion actions and provides
 * the exact code you need to add to your website.
 *
 * HOW TO USE:
 * 1. Go to Google Ads > Tools > Scripts > New Script
 * 2. Paste and click Preview
 * 3. Review the conversion actions and their status
 */

function main() {
  Logger.log('=== Conversion Tracking Audit ===');
  Logger.log('');

  // Query all conversion actions
  var report = AdsApp.report(
    "SELECT conversion_action.id, conversion_action.name, " +
    "conversion_action.type, conversion_action.status, " +
    "conversion_action.category, conversion_action.counting_type " +
    "FROM conversion_action " +
    "WHERE conversion_action.status != 'REMOVED'"
  );

  var rows = report.rows();
  var actionCount = 0;

  while (rows.hasNext()) {
    var row = rows.next();
    actionCount++;
    Logger.log('Conversion Action #' + actionCount);
    Logger.log('  Name: ' + row['conversion_action.name']);
    Logger.log('  Type: ' + row['conversion_action.type']);
    Logger.log('  Status: ' + row['conversion_action.status']);
    Logger.log('  Category: ' + row['conversion_action.category']);
    Logger.log('  Counting: ' + row['conversion_action.counting_type']);
    Logger.log('');
  }

  if (actionCount === 0) {
    Logger.log('No conversion actions found!');
  }

  Logger.log('---');
  Logger.log('NEXT STEPS TO FIX CONVERSION TRACKING:');
  Logger.log('');
  Logger.log('Your Conversion Tag ID: AW-11158472206');
  Logger.log('');
  Logger.log('Option A: Google Tag Manager (if you use GTM)');
  Logger.log('  1. Add Google Ads tag with ID AW-11158472206');
  Logger.log('  2. Create conversion linker tag');
  Logger.log('  3. Fire conversion event on thank-you page');
  Logger.log('');
  Logger.log('Option B: Direct code (already partially in place)');
  Logger.log('  Your site already has gtag.js with AW-11158472206 in head.html');
  Logger.log('  You need to add conversion event snippets to:');
  Logger.log('  - /apply/ form submission thank-you page');
  Logger.log('  - /payment-complete/ page (after Authorize.net payment)');
  Logger.log('');
  Logger.log('The event snippet looks like:');
  Logger.log("  gtag('event', 'conversion', {");
  Logger.log("    'send_to': 'AW-11158472206/CONVERSION_LABEL',");
  Logger.log("    'value': 1.0,");
  Logger.log("    'currency': 'USD'");
  Logger.log('  });');
  Logger.log('');
  Logger.log('Get your CONVERSION_LABEL from:');
  Logger.log('Google Ads > Goals > Conversions > Click the action > Tag setup');
}
