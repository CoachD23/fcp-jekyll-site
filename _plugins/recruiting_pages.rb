# _plugins/recruiting_pages.rb
# Generates all programmatic recruiting hub pages from _data/recruiting/*.yml
# Produces:
#   /d1-basketball-programs/{state-slug}/   (and d2, d3, naia, juco when data exists)
#   /{conference-slug}-basketball-programs/
#   /d1-basketball-programs/{school-slug}/  (individual school pages, D1 only)
#
# Safe for Netlify: no network calls, pure data-driven page generation.

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

      # ── Individual school pages (D1 only) ─────────────────────────────────
      d1_schools = schools.select { |s| s['division'] == 'D1' && s['slug'] }
      d1_schools.each do |school|
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
      coach_name = school['head_coach'] || 'the head coaching staff'
      conf_name  = school['conference'] || 'their conference'

      self.data = {
        'layout'      => 'recruit-school',
        'title'       => "#{school['name']} Basketball — Coach, Contacts & Recruiting Info",
        'description' => "#{school['name']} men's basketball: head coach #{coach_name}, #{conf_name} program. " \
                         "Find coach contacts and learn how FCP prepares players to earn #{school['division']} offers.",
        'og_image'    => school['logo_url'] || '/assets/images/about-fcp.jpg',
        'school'      => school,
      }
      self.content = ''
    end
  end
end
