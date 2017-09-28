#Used to modify the links in a copy of the OneZoom page for use without a web server
# (see the top level README file)
#This simply changes all non-server qualified absolute links to files in 'static' to links relative to this file
while(<>) {
    s!(src|href)=(['"])/\w+/static/!$1=$2!g;
    print
}