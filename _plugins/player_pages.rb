# _plugins/player_pages.rb
# Generates individual player profile pages at /players/{slug}/
# from _data/players.yml

module PlayerPages
  class Generator < Jekyll::Generator
    safe true
    priority :normal

    def generate(site)
      players = site.data.dig('players') || []
      players.each do |player|
        slug = player['slug']
        next unless slug

        site.pages << PlayerPage.new(site, player)
      end
    end
  end

  class PlayerPage < Jekyll::Page
    def initialize(site, player)
      @site = site
      @base = site.source
      @dir  = "players/#{player['slug']}"
      @name = 'index.html'

      self.process(@name)
      self.data = {
        'layout'      => 'player-profile',
        'title'       => "#{player['name']} — #{player['now_team']} | FCP Alumni",
        'description' => "#{player['name']} played at Florida Coastal Prep before earning a #{player['now_division']} offer at #{player['now_team']}. Learn about his journey from FCP to college basketball.",
        'player'      => player,
        'sitemap'     => true,
        'og_image'    => player['image'] || '/assets/images/about-fcp.jpg',
      }
      self.content = ''
    end
  end
end
