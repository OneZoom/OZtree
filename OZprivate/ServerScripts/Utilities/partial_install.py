"""
Used to modify the links in a copy of the OneZoom page for use without a web server
(see the top level README file)
"""

import sys
import fileinput
import re
for line in fileinput.input(inplace=True):
    # substitute absolute local refs to static files with urls relative to this file
    line = re.sub(r'(src|href)=([\'"])/\w+/static/', r'\1=\2', line)
    # <div id="OZ_js_modules"> contains the injected references to the OneZoom javascript
    # modules, which have a hash. We need to get the reference to these from their source
    # which is at OZTreeModule/dist/OZ_script.html, and load this source file while
    # changing absolute local references in it using the javascript regexp parser as above
    line = re.sub(
        r'(<div id="OZ_js_modules">).+?(</div>)',
        r'''\1\2<script>$.get(
          "OZTreeModule/dist/OZ_script.html",
          function(data) {
            $("#OZ_js_modules").html(data.replace(/(src|href)=(['"])\\/\\w+\\/static\\//g,"$1=$2"))}
        );
        </script>''',
        line)
    print(line, end="")
