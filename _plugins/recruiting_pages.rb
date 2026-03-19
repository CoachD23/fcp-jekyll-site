# _plugins/recruiting_pages.rb
# Generates all programmatic recruiting hub pages from _data/recruiting/*.yml
# Produces:
#   /d1-basketball-programs/{state-slug}/   (and d2, d3, naia, juco, uscaa when data exists)
#   /{conference-slug}-basketball-programs/
#   /{division-slug}/{school-slug}/  (individual school pages, all divisions)
#
# Safe for Netlify: no network calls, pure data-driven page generation.

require 'set'

module FCP
  class RecruitingPageGenerator < Jekyll::Generator
    safe true
    priority :normal

    def generate(site)
      data = site.data['recruiting']
      return unless data

      schools   = data['schools']   || []
      states    = data['states']    || []
      divisions = data['divisions'] || []
      confs     = data['conferences'] || []

      # ── State × Division pages ─────────────────────────────────────────────
      divisions.each do |div|
        div_id    = div['id']
        div_slug  = div['slug']
        div_label = div['label']

        div_schools = schools.select { |s| s['division'] == div_id }
        next if div_schools.empty?

        states.each do |state|
          state_schools = div_schools.select { |s| s['state_slug'] == state['slug'] }
          next if state_schools.empty?

          site.pages << StateDivisionPage.new(site, div, state, state_schools)
        end
      end

      # ── Conference pages ───────────────────────────────────────────────────
      confs.each do |conf|
        conf_schools = schools.select { |s| s['conference_slug'] == conf['slug'] }
        site.pages << ConferencePage.new(site, conf, conf_schools)
      end

      # ── Individual school pages (all divisions) ───────────────────────────
      all_schools = schools.select { |s| s['slug'] && s['division_slug'] }
      seen_slugs = Set.new
      all_schools.each do |school|
        slug_key = "#{school['division_slug']}/#{school['slug']}"
        next if seen_slugs.include?(slug_key)
        seen_slugs.add(slug_key)
        site.pages << SchoolPage.new(site, school)
      end
    end
  end

  # ── State × Division page ──────────────────────────────────────────────────
  class StateDivisionPage < Jekyll::Page
    def initialize(site, division, state, schools)
      @site = site
      @base = site.source
      @dir  = "#{division['slug']}/#{state['slug']}"
      @name = 'index.html'

      self.process(@name)
      count = schools.length
      prog  = count == 1 ? 'program' : 'programs'
      self.data = {
        'layout'       => 'recruit-state',
        'title'        => "#{division['label']} Basketball Programs in #{state['name']}",
        'description'  => "#{count} #{division['label']} men's basketball #{prog} in #{state['name']}. " \
                          "Explore coaches, rosters, scholarships, and how FCP prepares players to earn offers.",
        'og_image'     => '/assets/images/about-fcp.jpg',
        'division'     => division,
        'state'        => state,
        'schools'      => schools,
        'school_count' => count,
      }
      self.content = ''
    end
  end

  # ── Conference page ────────────────────────────────────────────────────────
  class ConferencePage < Jekyll::Page
    def initialize(site, conf, schools)
      @site = site
      @base = site.source
      @dir  = "#{conf['slug']}-basketball-programs"
      @name = 'index.html'

      self.process(@name)
      self.data = {
        'layout'       => 'recruit-conference',
        'title'        => "#{conf['name']} Basketball Programs",
        'description'  => conf['seo_description'],
        'og_image'     => '/assets/images/about-fcp.jpg',
        'conference'   => conf,
        'schools'      => schools,
        'school_count' => schools.length,
      }
      self.content = ''
    end
  end

  # ── Individual school page ─────────────────────────────────────────────────
  class SchoolPage < Jekyll::Page
    def initialize(site, school)
      @site = site
      @base = site.source
      @dir  = "#{school['division_slug']}/#{school['slug']}"
      @name = 'index.html'

      self.process(@name)
      coach_name = school['head_coach'].to_s.empty? ? 'coaching staff' : school['head_coach']
      conf_name  = school['conference'].to_s.empty? ? school['division'] : school['conference']
      city_part  = school['city'].to_s.empty? ? school['state'] : school['city']
      div_label  = school['division']

      thin_page = school['head_coach'].to_s.empty? && school['city'].to_s.empty?

      self.data = {
        'layout'      => 'recruit-school',
        'title'       => "#{school['name']} #{div_label} Basketball — Coach, Roster & Recruiting | FCP",
        'description' => "#{school['name']} #{div_label} basketball (#{conf_name}) in #{city_part}: view #{coach_name}'s contact, staff directory, and recruiting guide.",
        'og_image'    => (school['logo_url'].to_s.empty? ? '/assets/images/about-fcp.jpg' : school['logo_url']),
        'noindex'     => thin_page,
        'school'      => school,
      }
      self.content = ''
    end
  end
end
