#!/bin/bash
export PATH=/Users/fcp/.local/share/mise/installs/ruby/3.3.10/bin:/Users/fcp/.local/bin:/usr/local/bin:/usr/bin:/bin
export DYLD_LIBRARY_PATH=/Users/fcp/.local/lib
export BUNDLE_GEMFILE=/tmp/fcp-site/Gemfile
cd /tmp/fcp-site
exec bundle exec jekyll serve --port 4001 --baseurl '' --source /tmp/fcp-site --destination /tmp/fcp-site/_site
