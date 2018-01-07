#NB: this should be executed first (begins with _ and the web2py book says "Models in the same folder/subfolder are executed in alphabetical order.")

#some bitwise flags for use later
#bitwise flags for existence of different language wikipedia articles - order must match those listed in construct_wiki_info in CSV_base_table_creator.py
wikiflags = cache.ram('wikiflags',
    lambda: {lang:bit for (bit,lang) in enumerate(['en','de','es','fr','ja','ru','it','zh','pt','ar','pl','nl','fa','tr','sv','he','uk','id','vi','ko'])},
    time_expire = None)

src_flags = cache.ram('src_flags',
    lambda: {'onezoom':1, 'eol':2, 'wikidata':3, 'iucn':4, 'arkive':5, 'onezoom_special':8},
    time_expire = None)
    
inv_src_flags = cache.ram('inv_src_flags',
    lambda: {src_flags[k]:k for k in src_flags},
    time_expire = None)    

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

#allow them to be accessed in modules
try:
    from gluon import current
    current.OZglobals = dict(
        wikiflags = wikiflags, 
        src_flags = src_flags, 
        inv_src_flags = inv_src_flags, 
        eol_inspect_via_flags = eol_inspect_via_flags, 
        image_status_labels = image_status_labels)
except ImportError:
    #don't care about failing to import if we are using this outside web2py
    pass
    
#put this common function here because it uses SPAN, CAT, etc, which are a pain to use in modules
def nice_species_name(scientific=None, common=None, the=False, html=False, leaf=False, first_upper=False, break_line=None):
    """
    Constructs a nice species name, with common name in there too.
    If leaf=True, add a 'species' tag to the scientific name
    If break_line == 1, put a line break after common (if it exists)
    If break_line == 2, put a line break after sciname, (even if common exists)
    """
    db = current.db
    species_nicename = (scientific or '').replace('_',' ').strip()
    common = (common or '').strip()
    if the and common and not re.match(r'[Aa] ',common):
        common = "the " + common #"common tern" -> "the common tern", but 'a nematode' kept as is
    if first_upper:
        common = common.capitalize()
    if html:
        if species_nicename:
            if leaf: #species in italics
                species_nicename = I(species_nicename, _class=" ".join(["taxonomy","species"]))
            else:
                species_nicename = SPAN(species_nicename, _class="taxonomy")
            if common:
                if break_line:
                    return CAT(common, BR(), '(', species_nicename, ')')
                else:
                    return CAT(common, ' (', species_nicename, ')')                
            else:
                if break_line == 2:
                    return CAT(BR(), species_nicename)
                else:
                    return species_nicename
        else:
            return common
    else:
        if common and species_nicename:
            if break_line:
                return common +'\n(' + species_nicename + ')'
            else:
                return common +' (' + species_nicename + ')'
        else:
            if break_line == 2:
                return common + "\n" + species_nicename
            else:
                return common + species_nicename
