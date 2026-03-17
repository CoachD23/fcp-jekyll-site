---
layout: page
title: "FCP Coaching Staff — Kenny Anderson & Lee DeForest"
subtitle: The Team Behind the Team
description: "Meet the Florida Coastal Prep coaching staff — including NBA All-Star Kenny Anderson (14-year NBA career), Director Lee DeForest (25+ years coaching experience), and elite trainers who've developed 500+ college commits."
hero_image: /assets/images/coaches/coaches-hero.jpeg
og_image: /assets/images/coaches/kenny-anderson.png
hero_title: Management & Staff
hero_subtitle: The Team Behind the Team
permalink: /coaches/
---

<!-- Executive Leadership -->
{% assign execs = site.data.staff | where: "section", "executive" %}
{% if execs.size > 0 %}
<section class="staff-section fade-in">
  <div class="staff-section-header">
    <span class="section-label">Leadership</span>
    <h2>Program Directors</h2>
    <div class="gold-rule"></div>
  </div>
  <div class="director-grid">
    {% for member in execs %}
      {% include director-card.html member=member %}
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

<!-- Executive Team / Advisory Board -->
{% assign advisors = site.data.staff | where: "section", "advisory" %}
{% if advisors.size > 0 %}
<section class="staff-section fade-in">
  <div class="staff-section-header">
    <span class="section-label">Leadership</span>
    <h2>Executive Team / Advisory Board</h2>
    <div class="gold-rule"></div>
  </div>
  <div class="advisory-strip">
    {% for member in advisors %}
      {% include advisory-card.html member=member %}
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
