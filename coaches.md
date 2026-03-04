---
layout: page
title: Management & Staff
subtitle: The Team Behind the Team
description: "Meet the Florida Coastal Prep coaching staff — including NBA All-Star Kenny Anderson (14-year NBA career), Director Lee DeForest (25+ years coaching experience), and elite trainers who've developed 500+ college commits."
hero_image: /assets/images/coaches/coaches-hero.jpg
og_image: /assets/images/coaches/kenny-anderson.png
hero_title: Management & Staff
hero_subtitle: The Team Behind the Team
---

<!-- Intro Statement -->
<section class="fade-in" style="background: #f2f3f5; border-left: 4px solid #c41e3a; margin: 0 auto 2.5rem; padding: 2.5rem 3rem; max-width: 960px; border-radius: 0 12px 12px 0;">
  <h2 style="font-size: 2rem; font-weight: 800; color: #0a1628; line-height: 1.3; margin: 0 0 1rem;">Elite Coaching at Every Level.</h2>
  <p style="font-size: 1.1rem; line-height: 1.8; color: #333; text-align: justify; margin: 0;">Led by NBA All-Star <a href="/coaches/kenny-anderson/" style="color: #0a1628; font-weight: 600; text-decoration: underline;">Kenny Anderson</a> and 25-year veteran <a href="/coaches/lee-deforest/" style="color: #0a1628; font-weight: 600; text-decoration: underline;">Lee DeForest</a>, Florida Coastal Prep's coaching staff brings experience across every NCAA division — DI, DII, NAIA, and JUCO. Our coaches don't just develop basketball players — they build college-ready student-athletes.</p>
</section>

<!-- Executive Leadership -->
{% assign execs = site.data.staff | where: "section", "executive" %}
{% if execs.size > 0 %}
<section class="staff-section fade-in">
  <div class="staff-section-header">
    <span class="section-label">Leadership</span>
    <h2>Executive Team</h2>
    <div class="gold-rule"></div>
  </div>
  <div class="espn-staff-grid">
    {% for member in execs %}
      {% include staff-card.html member=member %}
    {% endfor %}
  </div>
</section>
{% endif %}

<!-- Coaching Staff -->
{% assign coaches = site.data.staff | where: "section", "coaching" %}
{% if coaches.size > 0 %}
<section class="staff-section staff-section-dark fade-in">
  <div class="staff-section-header">
    <span class="section-label">Coaches</span>
    <h2>Coaching Staff</h2>
    <div class="gold-rule"></div>
  </div>
  <div class="espn-staff-grid">
    {% for member in coaches %}
      {% include staff-card.html member=member %}
    {% endfor %}
  </div>
</section>
{% endif %}

<!-- Advisory Board -->
{% assign advisors = site.data.staff | where: "section", "advisory" %}
{% if advisors.size > 0 %}
<section class="staff-section fade-in">
  <div class="staff-section-header">
    <span class="section-label">Advisors</span>
    <h2>Advisory Board</h2>
    <div class="gold-rule"></div>
  </div>
  <div class="espn-staff-grid">
    {% for member in advisors %}
      {% include staff-card.html member=member %}
    {% endfor %}
  </div>
</section>
{% endif %}

<!-- Admissions -->
{% assign admissions = site.data.staff | where: "section", "admissions" %}
{% if admissions.size > 0 %}
<section class="staff-section staff-section-dark fade-in">
  <div class="staff-section-header">
    <span class="section-label">Admissions</span>
    <h2>Admissions Office</h2>
    <div class="gold-rule"></div>
  </div>
  <div class="espn-staff-grid">
    {% for member in admissions %}
      {% include staff-card.html member=member %}
    {% endfor %}
  </div>
</section>
{% endif %}

<div class="cta-section" style="margin-top: 0;">
  <h2>Join Our Program</h2>
  <p>Ready to train with the best? Check out our <a href="/training/" style="color: #d4a843;">training program</a> or apply today.</p>
  <div class="hero-cta">
    <a href="/apply/" class="btn btn-primary">Apply Now</a>
    <a href="/commitments/" class="btn btn-gold">See Our Results</a>
  </div>
</div>

<!-- Staff Directory Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Florida Coastal Prep Coaching Staff",
  "itemListElement": [{% for member in site.data.staff %}
    {
      "@type": "ListItem",
      "position": {{ forloop.index }},
      "item": {
        "@type": "Person",
        "name": "{{ member.name }}",
        "jobTitle": "{{ member.title }}",
        "description": "{{ member.bio | escape }}",
        "url": "https://floridacoastalprep.com/coaches/{{ member.slug }}/",
        "worksFor": {"@type": "SportsOrganization", "name": "Florida Coastal Prep Sports Academy"}
      }
    }{% unless forloop.last %},{% endunless %}{% endfor %}
  ]
}
</script>
