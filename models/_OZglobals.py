# -*- coding: utf-8 -*-
#NB: this should be executed first (begins with _ and the web2py book says "Models in the same folder/subfolder are executed in alphabetical order.")
import sys
# Python 2 and 3, instead of python2 unichr:
from builtins import chr

try:
    from gluon import current
except ImportError:
    #this is not being used in web2py, but instead in an independent python app
    #simply define cache.ram to be a function that returns the result of calling the 2nd arg
    #This is a complex HACK!!!
    cache = type("", (), dict(ram=lambda self, name, func, **kw: func()))()
    current = type("", (), {})() #allow us to set e.g. current.OZglobals, so we don't bomb out later
    def T(x):
        """Don't translate when used as an independent app"""
        return x
    def URL(*args):
        """Don't make urls when used as an independent app"""
        return args
        
    if sys.version_info[0] == 3:
        def unichr(x):
            return chr(x)
        def xrange(x):
            return range(x)

    
percent_crop_expansion = 12.5 #max amount to expand crops by to fit in circle

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
eol_inspect_via_flags = cache.ram('eol_inspect_via_flags',
    lambda: {'EoL_tab':1, 'image':2, 'sponsor':3, 'name':4},
    time_expire = None)

#classes of image (see comments in images_by_ott definition below). 
#NB: we can probably assumed verified for e.g. arkive images
image_status_labels = cache.ram('image_status_labels',
    lambda:  ['any', 'verified', 'pd'],
    time_expire = None)

#Cribbed from wikipedia: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
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

#allow global subbing Separators & Punctuation with a normal space
#this is a slow definition, so we cache it in RAM, and import unicodedata within the lambda
unicode_punctuation_to_space_table = cache.ram('unicode_punctuation_to_space_table',
    lambda: {i:u' ' for i in xrange(sys.maxunicode) \
        if __import__('unicodedata').category(chr(i)).startswith('Z') \
        or (__import__('unicodedata').category(chr(i)).startswith('P') \
        and chr(i) not in [u"'",u"’",u"-",u".",u"×", u"#"])}, # allow e.g. ' in names
    time_expire = None)
    
logographic_transcriptions = cache.ram('logographic_transcriptions', 
    lambda: __import__('string').ascii_letters+__import__('string').digits+"".join({
        u'a': u'āáǎà', u'e': u'ēéěè', u'i': u'īíǐì',
        u'o': u'ōóǒò', u'u': u'ūúǔù', u'ü': u'ǖǘǚǜ',
        u'A': u'ĀÁǍÀ', u'E': u'ĒÉĚÈ', u'I': u'ĪÍǏÌ',
        u'O': u'ŌÓǑÒ', u'U': u'ŪÚǓÙ', u'Ü': u'ǕǗǙǛ'
    }.values()),
    time_expire = None)


# id / name / icon of all tabs
tab_definitions = cache.ram('tab_definitions',
    lambda: __import__('collections').OrderedDict([
      ('opentree',{'id':'opentree',   'name':T('OpenTree'),     'icon':URL('static','images/mini-opentree-logo.png')}),
      ('wiki',{'id':'wiki',   'name':T('Wikipedia'),            'icon':URL('static','images/W.svg')}),
      ('eol',{'id':'eol',     'name':T('Encyclopedia of Life'), 'icon':URL('static','images/EoL.png')}),
      ('iucn',{'id':'iucn',   'name':T('Conservation'),         'icon':URL('static','images/IUCN_Red_List.svg')}),
      ('ncbi',{'id':'ncbi',   'name':T('Genetics'),             'icon':URL('static','images/DNA_icon.svg')}),
      #('powo',{'id':'powo',   'name':T('Kew')}),
      ('ozpicinfo',{'id':'ozpicinfo','name':T('Image information'), 'icon':URL('static','images/copyright.svg')}),
      ('ozlinks',{'id':'ozlinks','name':T('External Links'), 'icon':URL('static','images/links.svg')}),
      ('ozspons',{'id':'ozspons','name':T('Sponsor'), 'icon':URL('static','images/sponsor.png')})]),
    time_expire = None)


# Default tabs to display
tab_defaults = cache.ram('tab_defaults',
    lambda: ['wiki', 'eol', 'iucn', 'ncbi', 'ozspons'],
    time_expire = None)


#allow these to be accessed in modules
current.OZglobals = dict(
    wikiflags = wikiflags, 
    src_flags = src_flags, 
    inv_src_flags = inv_src_flags, 
    eol_inspect_via_flags = eol_inspect_via_flags, 
    image_status_labels = image_status_labels,
    conversion_table = conversion_table,
    unicode_punctuation_to_space_table = unicode_punctuation_to_space_table,
    logographic_transcriptions = logographic_transcriptions,
    tab_definitions = tab_definitions,
    tab_defaults = tab_defaults)
