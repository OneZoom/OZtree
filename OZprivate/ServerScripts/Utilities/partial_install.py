"""
For partial installs, where a OneZoom page can be used without a web server,
via a file:/// url (see the top level README file)
"""

import sys
import fileinput
import re
import argparse

parser = argparse.ArgumentParser(description=(
    "Change absolute local links into `/static` to ones relative to the current dir"
    "and replace some strings"))
parser.add_argument("--search", default="", help="A string to search for")
parser.add_argument("--replace", default="", help="A replacement string")
parser.add_argument("filenames", nargs="+") 

args = parser.parse_args()

html = ""
hashsub = False
for line in fileinput.input(args.filenames, inplace=True):
    # substitute passed in args
    line = line.replace(args.search, args.replace)
    
    # substitute absolute local refs to static files with urls relative to this file
    line = re.sub(r'(src|href)=([\'"])(/\w+)?/static/', r'\1=\2', line)
    line = re.sub(r'(template|template_style)([\'"]?\s*:\s*[\'"])(/\w+)?/static/', r'\1\2', line)
    
    # <div id="OZ_js_modules"> contains the injected references to the OneZoom javascript
    # modules, which have a hash, e.g. OZentry.c630ade6e6193fbdb9b8.js . We need to
    # remove the hash from these references
    if line.strip() == '<div id="OZ_js_modules">':
        hashsub=True
    if hashsub==True:
        line = re.sub(r'\.\w+\.js', r'.js', line)
        if line.strip()=='</div>':
            hashsub=False
    print(line, end="")
