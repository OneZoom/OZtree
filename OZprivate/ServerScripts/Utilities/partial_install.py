"""
For partial installs, where a OneZoom page can be used without a web server,
via a file:/// url (see the top level README file)
"""

import sys
import fileinput
import re
import os
import argparse

parser = argparse.ArgumentParser(description=(
    "Change absolute local links into `/static` to ones relative to the current dir"
    "and replace some strings"))
parser.add_argument("--search", default="", help="A string to search for")
parser.add_argument("--replace", default="", help="A replacement string")
parser.add_argument("filenames", nargs="+") 

args = parser.parse_args()

html = ""
skip_lines = False
for line in fileinput.input(args.filenames, inplace=True):
    # substitute passed in args
    line = line.replace(args.search, args.replace)
    
    # <div id="OZ_js_modules"> contains the injected references to the OneZoom javascript
    # modules. We need to use
    # the local version, in static/
    m = re.match('\s*<div id="OZ_js_modules" data-include="([^>]+)">', line)
    if m:
        for include_path in m.group(1).split(" "):
            include_path = os.path.join(os.path.dirname(fileinput.filename()), include_path)
            with open(include_path) as include_file:
                for inc_line in include_file:
                    line += inc_line
        skip_lines = True
    elif line.strip() == '</div>':
        skip_lines = False
    elif skip_lines:
        line = ""

    # substitute absolute local refs to static files with urls relative to this file
    line = re.sub(r'(src|href)=([\'"])(/\w+)?/static/', r'\1=\2', line)
    line = re.sub(r'(template|template_style)([\'"]?\s*:\s*[\'"])(/\w+)?/static/', r'\1\2', line)
    
    print(line, end="")
