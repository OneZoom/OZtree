# -*- coding: utf-8 -*-
"""Below are some private functions. NB: https://web2py.wordpress.com/tag/private-function/
Functions that are defined in controllers and that takes arguments are private.
Functions defined in controllers and start with ‘__’ [double underscores] are private.
Functions defined in controllers and having a space after the () and before the ‘:’ are private. 
"""
import re
from gluon import current

percent_crop_expansion = 12.5 #max amount to expand crops by to fit in circle


def sponsorable_children_query(target_id, qtype="ott"):
    """
    A function that returns a web2py query selecting the sponsorable children of this node.
    TO DO: change javascript so that nodes without an OTT use qtype='id'
    """
    db = current.db
    query = child_leaf_query(qtype, target_id)

    #nodes without an OTT are unsponsorable
    query = query & (db.ordered_leaves.ott != None) 

    #nodes without a space in the name are unsponsorable
    query = query & (db.ordered_leaves.name.contains(' ')) 

    #check which have OTTs in the reservations table
    unavailable = db((db.reservations.verified_time != None))._select(db.reservations.OTT_ID)
    #the query above ony finds those with a name. We might prefer something like the below, but I can't get it to work
    #unavailable = db((db.reservations.user_sponsor_name != None) | ((db.reservations.reserve_time != None) & ((request.now - db.reservations.reserve_time).total_seconds() < reservation_time_limit)))._select(db.reservations.OTT_ID)
    
    query = query & (~db.ordered_leaves.ott.belongs(unavailable))
    return(query)

def child_leaf_query(colname, search_for):
    """Queries the db to get child leaves, and returns the basis for another query """
    db = current.db
    try:
        bracket = db(db.ordered_nodes[colname] == search_for).select(db.ordered_nodes.leaf_lft,db.ordered_nodes.leaf_rgt).first()
        if bracket is not None:
            return ((db.ordered_leaves.id >= bracket.leaf_lft) & (db.ordered_leaves.id <= bracket.leaf_rgt))
    except:
        pass
    #if no descendant children, just return this leaf
    return (db.ordered_leaves[colname] == search_for)



def score(lang_full_search, lang_primary_search, lang_full_target, preferred_status, 
    src_flag_target, prefer_oz_specialname=False, max_src_flag=max(current.OZglobals['inv_src_flags'])):
    if prefer_oz_specialname:
        score = max_src_flag - src_flag_target % current.OZglobals['src_flags']['onezoom_special']
    else:
        score = max_src_flag - src_flag_target
    if (lang_full_target == lang_full_search):
        score += 10000
    if (lang_full_target == lang_primary_search):
        score += 1000
    if (preferred_status):
        score += 100
    return score

def get_common_names(identifiers, return_nulls=False, OTT=True, lang=None,
    prefer_oz_special_names=False, include_unpreferred=False, return_all=False):
    """
    Given a set of identifiers (by default, OTTs, but otherwise names), get one best vernacular for each id. 
    'best' is defined as the vernacular that has preferred == True, and which has the best language match.
    Language matches rely on languages specified as http://www.w3.org/International/articles/language-tags/
    A language tag can consist of subtags, e.g. en-gb, fr-ca (these have been made lowecase)
    We call the first subtag the 'primary language', and only match vernaculars where the primary language matches
    However, if there are multiple matches on primary language, we prefer (in order)
    1) Most preferred: a match on full name (e.g. browser language = en-gb, vernacular tagged as en-gb)
    2) Intermediate: the vernacular is tagged as generic (e.g. browser language = en-gb, vernacular tagged as en)
    3) Least preferred: only matches on primary lang (e.g. browser language = en-gb, vernacular tagged as en-us)
   
    If there are multiple equally good matches, we should prefer names in ascending src order, e.g. src=1 (onezoom)
    then src=2 (eol) then src=8 (onezoom_special), unless prefer_oz_special_names is set, when we take src=8 
    (oz special) - we do this by ordering by src % 8
    """
    db = current.db
    request = current.request
    lang_full = (lang or request.vars.lang or request.env.http_accept_language or 'en').split(',')[0].lower()
    lang_primary = lang_full.split("-")[0]
    
    if OTT:
        table = 'vernacular_by_ott'
        col = 'ott'
    else:
        table = 'vernacular_by_name'
        col = 'name'
    query = (db[table][col].belongs(identifiers)) & (db[table].lang_primary == lang_primary)
    if include_unpreferred == False:
        query = query & (db[table].preferred)
    rows = db(query).select(db[table][col], db[table].src, db[table].lang_full, db[table].preferred, db[table].vernacular)
    if return_nulls:
        vernaculars = {i:None for i in identifiers}
    else:
        vernaculars = {}
    
    if return_all:
        for r in rows:
            try:
                vernaculars[r[col]].append(r)
            except:
                vernaculars[r[col]] = [r]
        #sort arrays for each value in vernaculars
        #return {i: ([[r.vernacular, score(lang_full, lang_primary, r.lang_full, r.preferred, r.src, prefer_oz_special_names)] for r in v] if v else None) for i,v in vernaculars.items()}
        return {i: ([r.vernacular for r in sorted(v, key=lambda r: score(lang_full, lang_primary, r.lang_full, r.preferred, r.src, prefer_oz_special_names), reverse=True)] if v else None) for i,v in vernaculars.items()}
        
    else:
        for r in rows:
            rscore = score(lang_full, lang_primary, r.lang_full, r.preferred, r.src, prefer_oz_special_names)
            #find max while looping
            try:
                if vernaculars[r[col]][1] < rscore:
                    raise
            except:
                vernaculars[r[col]] = [r.vernacular,rscore]
        return({v: (vernaculars[v][0] if vernaculars[v] else None) for v in vernaculars})

def get_common_name(ott, name=None, lang=None, include_unpreferred=False):
    """
    The same as get_common_names, but only for a single ott, or if ott is empty, none, etc, use name
    """
    db = current.db
    request = current.request
    lang_full = lang or (request.env.http_accept_language or 'en').lower()
    lang_primary = lang_full.split("-")[0]
    if ott:
        rows =  db((db.vernacular_by_ott.ott == ott) &
                  (db.vernacular_by_ott.preferred == True) &
                  (db.vernacular_by_ott.lang_primary == lang_primary)
                 ).select(
                      db.vernacular_by_ott.src,
                      db.vernacular_by_ott.lang_full,
                      db.vernacular_by_ott.vernacular,
                      db.vernacular_by_ott.preferred
                  )
    elif name:
        rows = db((db.vernacular_by_name.name == name) &
                  (db.vernacular_by_name.preferred == True) &
                  (db.vernacular_by_name.lang_primary == lang_primary)
                 ).select(
                      db.vernacular_by_name.src,
                      db.vernacular_by_name.lang_full,
                      db.vernacular_by_name.vernacular,
                      db.vernacular_by_name.preferred
                  )
    else:
        return None
    if len(rows) == 1:
        return rows[0].vernacular
    else:
        vernacular = None
        for r in rows:
            rscore = score(lang_full, lang_primary, r.lang_full, r.preferred, r.src)
            if vernacular is None or vernacular[1] < rscore:
                vernacular = [r.vernacular, rscore]
        return vernacular[0] if vernacular else None
        
    
def language(two_letter):
    """
    Cribbed from wikipedia: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
    """
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
    return conversion_table.get(two_letter)
