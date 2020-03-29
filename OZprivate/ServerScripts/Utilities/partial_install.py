"""
Used to modify the links in a copy of the OneZoom page for use without a web server
(see the top level README file)
"""

import sys
import fileinput
import re
html = ""
hashsub = False
for line in fileinput.input(inplace=True):
    # substitute absolute local refs to static files with urls relative to this file
    line = re.sub(r'(src|href)=([\'"])/\w+/static/', r'\1=\2', line)
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
