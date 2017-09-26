#should be executed first (begins with _ and the web2py book says "Models in the same folder/subfolder are executed in alphabetical order.")

#some bitwise flags for use later
#bitwise flags for existence of different language wikipedia articles - order must match those listed in construct_wiki_info in CSV_base_table_creator.py
wikiflags = {lang:bit for (bit,lang) in enumerate(['en','de','es','fr','ja','ru','it','zh','pt','ar','pl','nl','fa','tr','sv','he','uk','id','vi','ko'])} 
src_flags = {'onezoom':1, 'eol':2, 'wikidata':3, 'iucn':4, 'arkive':5, 'onezoom_special':8}
inv_src_flags = {src_flags[k]:k for k in src_flags}

#For keeping track of where users are looking
#NB: if eol ID was inspected via copyright symbol, the user is going straight to the
# data_object (image) page, and we can probably assume they won't be
# altering the vernacular name, just cropping the image. If via the tab, then
# they might be changing images or names. If via "name", then we can assume that
# only the vernacular name has been inspected (e.g. an internal nodes)
eol_inspect_via_flags = {'EoL_tab':1, 'copyright_symbol':2, 'sponsor':3, 'name':4} 

#classes of image (see comments in images_by_ott definition below). 
#NB: we can probably assumed verified for e.g. arkive images
image_status_labels = ['any', 'verified', 'pd']
