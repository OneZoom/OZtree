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

conversion_table = cache.ram('conversion_table',
    lambda: {"ab":["Abkhaz","аҧсшәа"],
        "aa":["Afar","Afaraf"],
        "af":["Afrikaans","Afrikaans"],
        "ak":["Akan","Akan"],
        "sq":["Albanian","Shqip"],
        "am":["Amharic","አማርኛ"],
        "ar":["Arabic","العربية"],
        "an":["Aragonese","aragonés"],
        "hy":["Armenian","Հայերեն"],
        "as":["Assamese","অসমীয়া"],
        "av":["Avaric","магӀарул мацӀ"],
        "ae":["Avestan","avesta"],
        "ay":["Aymara","aymar aru"],
        "az":["Azerbaijani","azərbaycan dili"],
        "ba":["Balochi","بلوچی"],
        "bm":["Bambara","bamanankan"],
        "ba":["Bashkir","башҡорт теле"],
        "eu":["Basque","euskera"],
        "be":["Belarusian","беларуская мова"],
        "bn":["Bengali","বাংলা"],
        "bh":["Bihari","भोजपुरी"],
        "bi":["Bislama","Bislama"],
        "bs":["Bosnian","bosanski jezik"],
        "br":["Breton","brezhoneg"],
        "bg":["Bulgarian","български език"],
        "my":["Burmese","ဗမာစာ"],
        "ca":["Catalan","català"],
        "ch":["Chamorro","Chamoru"],
        "ce":["Chechen","нохчийн мотт"],
        "ny":["Chichewa","chiCheŵa"],
        "zh":["Chinese","汉语"],
        "cv":["Chuvash","чӑваш чӗлхи"],
        "kw":["Cornish","Kernewek"],
        "co":["Corsican","corsu"],
        "cr":["Cree","ᓀᐦᐃᔭᐍᐏᐣ"],
        "hr":["Croatian","hrvatski jezik"],
        "cs":["Czech","český jazyk"],
        "da":["Danish","dansk"],
        "dv":["Divehi","ދިވެހި"],
        "nl":["Dutch","Vlaams"],
        "dz":["Dzongkha","རྫོང་ཁ"],
        "pa":["Eastern Punjabi","ਪੰਜਾਬੀ"],
        "en":["English","English"],
        "eo":["Esperanto","Esperanto"],
        "et":["Estonian","eesti keel"],
        "ee":["Ewe","Eʋegbe"],
        "fo":["Faroese","føroyskt"],
        "fj":["Fijian","vosa Vakaviti"],
        "fi":["Finnish","suomen kieli"],
        "fr":["French","français"],
        "ff":["Fula","Fulfulde"],
        "gl":["Galician","galego"],
        "lg":["Ganda","Luganda"],
        "ka":["Georgian","ქართული"],
        "de":["German","Deutsch"],
        "el":["Greek","ελληνικά"],
        "gn":["Guaraní","Avañe'ẽ"],
        "gu":["Gujarati","ગુજરાતી"],
        "ht":["Haitian","Kreyòl ayisyen"],
        "ha":["Hausa","(Hausa) هَوُسَ"],
        "he":["modern Hebrew","עברית"],
        "hz":["Herero","Otjiherero"],
        "hi":["Hindi","हिंदी"],
        "ho":["Hiri Motu","Hiri Motu"],
        "hu":["Hungarian","magyar"],
        "is":["Icelandic","Íslenska"],
        "io":["Ido","Ido"],
        "ig":["Igbo","Asụsụ Igbo"],
        "id":["Indonesian","Bahasa Indonesia"],
        "ia":["Interlingua","Interlingua"],
        "iu":["Inuktitut","ᐃᓄᒃᑎᑐᑦ"],
        "ik":["Inupiaq","Iñupiatun"],
        "ga":["Irish","Gaeilge"],
        "it":["Italian","italiano"],
        "ja":["Japanese","日本語 (にほんご)"],
        "jv":["Javanese","ꦧꦱꦗꦮ"],
        "kl":["Greenlandic","kalaallit oqaasii"],
        "kn":["Kannada","ಕನ್ನಡ"],
        "kr":["Kanuri","Kanuri"],
        "ks":["Kashmiri"," كشميري‎"],
        "kk":["Kazakh","қазақ тілі"],
        "km":["Khmer","ខ្មែរ"],
        "ki":["Kikuyu","Gĩkũyũ"],
        "rw":["Kinyarwanda","Ikinyarwanda"],
        "rn":["Kirundi","Ikirundi"],
        "kv":["Komi","коми кыв"],
        "kg":["Kongo","Kikongo"],
        "ko":["Korean","조선어"],
        "ku":["Kurdish","كوردی‎"],
        "kj":["Kwanyama","Kuanyama"],
        "ky":["Kyrgyz","Кыргыз тили"],
        "lo":["Lao","ພາສາລາວ"],
        "la":["Latin","latine"],
        "lv":["Latvian","latviešu valoda"],
        "ln":["Lingala","Lingála"],
        "lt":["Lithuanian","lietuvių kalba"],
        "lu":["Luba-Katanga","Tshiluba"],
        "lb":["Luxembourgish","Lëtzebuergesch"],
        "mk":["Macedonian","македонски јазик"],
        "mg":["Malagasy","fiteny malagasy"],
        "ms":["Malay","bahasa Melayu"],
        "ml":["Malayalam","മലയാളം"],
        "mt":["Maltese","Malti"],
        "gv":["Manx","Gailck"],
        "mr":["Marathi","मराठी"],
        "mh":["Marshallese","Kajin M̧ajeļ"],
        "mn":["Mongolian","Монгол хэл"],
        "mi":["Māori","te reo Māori"],
        "na":["Nauruan","Dorerin Naoero"],
        "nv":["Navajo","Diné bizaad"],
        "ng":["Ndonga","Owambo"],
        "ne":["Nepali","नेपाली"],
        "nd":["Northern Ndebele","isiNdebele"],
        "se":["Northern Sami","Davvisámegiella"],
        "no":["Norwegian","Norsk"],
        "nb":["Norwegian Bokmål","Norsk bokmål"],
        "nn":["Norwegian Nynorsk","Norsk nynorsk"],
        "ii":["Nuosu","ꆈꌠ꒿ Nuosuhxop"],
        "oc":["Occitan","lenga d'òc"],
        "oj":["Ojibwe","ᐊᓂᔑᓈᐯᒧᐎᓐ"],
        "cu":["Old Bulgarian","ѩзыкъ словѣньскъ"],
        "or":["Oriya","ଓଡ଼ିଆ"],
        "om":["Oromo","Afaan Oromoo"],
        "os":["Ossetian","ирон æвзаг"],
        "ps":["Pashto","پښتو"],
        "fa":["Persian (Farsi)","فارسی"],
        "pl":["Polish","polszczyzna"],
        "pt":["Portuguese","português"],
        "pi":["Pāli","पाऴि"],
        "qu":["Quechua","Kichwa"],
        "ro":["Romanian","Română"],
        "rm":["Romansh","rumantsch grischun"],
        "ru":["Russian","Русский"],
        "sm":["Samoan","gagana fa'a Samoa"],
        "sg":["Sango","yângâ tî sängö"],
        "sa":["Sanskrit","संस्कृतम्"],
        "sc":["Sardinian","sardu"],
        "gd":["Gaelic","Gàidhlig"],
        "sr":["Serbian","српски језик"],
        "sn":["Shona","chiShona"],
        "sd":["Sindhi"," سنڌي، سندھی‎"],
        "si":["Sinhalese","සිංහල"],
        "sk":["Slovak","slovenčina"],
        "sl":["Slovene","slovenščina"],
        "so":["Somali","Soomaaliga"],
        "nr":["Southern Ndebele","isiNdebele"],
        "st":["Southern Sotho","Sesotho"],
        "es":["Spanish","español"],
        "su":["Sundanese","Basa Sunda"],
        "sw":["Swahili","Kiswahili"],
        "ss":["Swati","SiSwati"],
        "sv":["Swedish","svenska"],
        "tl":["Tagalog","Wikang Tagalog"],
        "ty":["Tahitian","Reo Tahiti"],
        "tg":["Tajik"," تاجیکی‎"],
        "ta":["Tamil","தமிழ்"],
        "tt":["Tatar","татар теле"],
        "te":["Telugu","తెలుగు"],
        "th":["Thai","ไทย"],
        "bo":["Tibetan","བོད་ཡིག"],
        "ti":["Tigrinya","ትግርኛ"],
        "to":["Tongan","faka Tonga"],
        "ts":["Tsonga","Xitsonga"],
        "tn":["Tswana","Setswana"],
        "tr":["Turkish","Türkçe"],
        "tk":["Turkmen","Түркмен"],
        "tw":["Twi","Twi"],
        "uk":["Ukrainian","Українська"],
        "ur":["Urdu","اردو"],
        "ug":["Uyghur","ئۇيغۇرچە‎,"],
        "uz":["Uzbek","أۇزبېك‎"],
        "ve":["Venda","Tshivenḓa"],
        "vi":["Vietnamese","Tiếng Việt"],
        "vo":["Volapük","Volapük"],
        "wa":["Walloon","walon"],
        "cy":["Welsh","Cymraeg"],
        "fy":["Western Frisian","Frysk"],
        "wo":["Wolof","Wollof"],
        "xh":["Xhosa","isiXhosa"],
        "yi":["Yiddish","ייִדיש"],
        "yo":["Yoruba","Yorùbá"],
        "li":["Zeneize","Ligures"],
        "za":["Zhuang","Saɯ cueŋƅ"],
        "zu":["Zulu","isiZulu"]},
    time_expire = None)

#allow them to be accessed in modules
try:
    from gluon import current
    current.OZglobals = dict(
        wikiflags = wikiflags, 
        src_flags = src_flags, 
        inv_src_flags = inv_src_flags, 
        eol_inspect_via_flags = eol_inspect_via_flags, 
        image_status_labels = image_status_labels,
        conversion_table = conversion_table)
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
