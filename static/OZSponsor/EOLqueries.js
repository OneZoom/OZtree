/* These are all helper functions that access the EOL suite of APIs, e.g. the pages API at https://eol.org/api/docs/pages
(https is needed as the http calls go to a redirect that doesn't currently have
"Access-Control-Allow-Origin: *" set, so CORS does not work on the http site)
they assume the json response looks something like

{
  "identifier": 1045608,
  "scientificName": "Apis mellifera",
  "richness_score": 400.0,
  "vernacularNames": [
    {
      "vernacularName": "Western Honeybee",
      "language": "en",
      "eol_preferred": true
    },
    {
      "vernacularName": "A Honeybee",
      "language": "en"
    },
  ],
  "dataObjects": [
    {
      "identifier": "d7c57c6dd644a74556b202edd0f5c9f2",
      "dataObjectVersionID": 30100518,
      "dataType": "http://purl.org/dc/dcmitype/StillImage",
      "dataSubtype": "",
      "vettedStatus": "Trusted",
      "dataRating": 4.5,
      "height": 1474,
      "width": 2215,
      "crop_x": "243.65",
      "crop_y": "58.96",
      "crop_width": "1196.1",
      "mimeType": "image/jpeg",
      "title": "Bee Happy",
      "language": "en",
      "license": "http://creativecommons.org/licenses/by/2.0/",
      "rightsHolder": "Treesha Duncan",
      "source": "https://www.flickr.com/photos/iamtreesha/7894625598/",
      "mediaURL": "https://farm9.staticflickr.com/8308/7894625598_ccba4881c2_o.jpg",
      "eolMediaURL": "http://media.eol.org/content/2016/02/04/11/18963_orig.jpg",
      "eolThumbnailURL": "http://media.eol.org/content/2016/02/04/11/18963_98_68.jpg",
      "agents": [
        {
          "full_name": "Treesha Duncan",
          "homepage": "http://www.flickr.com/photos/57720887@N05",
          "role": "photographer"
        },
        {
          "full_name": "Flickr: EOL Images",
          "homepage": "http://www.flickr.com/groups/encyclopedia_of_life",
          "role": "provider"
        }
      ],
    }
  ]
}

*/

function pxFloat(str) {
    //return the numerical value of a css measure
    //assumes all sizes are in pixels
    return parseFloat(str.replace(/px/,""))
}

// add_percent = 12.5%
function crop_frac(eol_API_data, add_percent) {
    /* Returns [bg-size, bg-pos-left, bg-pos-top] as fractions which need to be 
        multiplied by thumbnail size to set the css background position
     */
    add_percent=parseFloat(add_percent)
    var top;
    var left;
    var size;
    var initial_thumb_px = parseFloat(eol_API_data.crop_width)
    var crop_top_fraction = parseFloat(eol_API_data.crop_y)/initial_thumb_px
    var crop_bottom_fraction = (parseFloat(eol_API_data.height) - parseFloat(eol_API_data.crop_y) - initial_thumb_px)/initial_thumb_px
    var crop_left_fraction = parseFloat(eol_API_data.crop_x)/initial_thumb_px
    var crop_right_fraction = (parseFloat(eol_API_data.width) - parseFloat(eol_API_data.crop_x) - initial_thumb_px)/initial_thumb_px
    var min_crop_fraction = Math.min(crop_top_fraction, crop_bottom_fraction, crop_left_fraction, crop_right_fraction)
    if (min_crop_fraction < 0) {
        //the crop is right against the corner, and we cannot make it bigger
        top = Math.round(parseFloat(eol_API_data.crop_y))
        left = Math.round(parseFloat(eol_API_data.crop_x))
        size = Math.round(parseFloat(eol_API_data.crop_width))
    } else {
        if (min_crop_fraction > add_percent/100.0) {
            min_crop_fraction = add_percent/100.0
        }
        var min_crop_pixels = min_crop_fraction * initial_thumb_px
        top = Math.round(parseFloat(eol_API_data.crop_y) - min_crop_pixels)
        left = Math.round(parseFloat(eol_API_data.crop_x) - min_crop_pixels)
        size = Math.round(initial_thumb_px + 2.0*min_crop_pixels)
    }
    return [eol_API_data.width / size, -left/size, -top/ size]
}

function get_EOL_common_name(vnames_array) {
    //pass in the vernacularNames array as returned by the JSON call, and get a single name (or none) back
    var lang = 'en'
    //if (document.documentElement.lang) {
    //    lang = document.documentElement.lang.replace(/(\w+)-\w+/,'$1')
    //}
    var names = vnames_array.filter(function(h) {return(h.language === lang)})
    if (names.length == 0) return null;
    if (names.length == 1) return names[0].vernacularName;
    var preferred_names = names.filter(function(h) {return(h.eol_preferred)})
    if (preferred_names.length) return preferred_names[0].vernacularName;
    return names[0].vernacularName;
}

function setDataFromEoLdataObjectID(DOid, on_complete, EoL_key, timeout_ms, crossdomain) {
    /* This takes in an EOL page ID: queries the EoL API, and calls the on_complete function with a taxon object from EoL, which contains the 
    data object and a 'flags' field which tells us if e.g. the API call has failed. 
    
    Then in the 'on_complete' function you do something that modifies the page, adds images, etc, e.g. 
    
    setDataFromEoLdataObjectID(56778, function(data_obj, error_flag) {set_page_image(data_obj, error_flag, my_param1, my_param2)})
    
    and those can be called within web2py with page-specific values injected, e.g.
    
    setDataFromEoLdataObjectID({{=DO_ID}}, function(t, error_flag) {set_page_image(t, err, {{=css_target}}, 12.5)})
    
    Since this is a data object (a specific image), common names cannot be obtained through this function.
    
    Negative DOids are indicative of a bespoke
    
    error flags are:
    0 - no error
    1 - timeout no response from the EoL API
    2 - bad response from the EOL API
    3 - non-number passed in
    4 - negative-number passed in
    5 - no data object for that number
    */
    if (crossdomain) {
        crossdomain = true
    } else {
        crossdomain = false
    }
    if (isNaN(parseInt(DOid))) {
        on_complete(null,3)
    } else if (parseInt(DOid) <= 0) {
        on_complete(null,4)
    } else {
        var query_string = "taxonomy=false&cache_ttl=&language=en&key=" + EoL_key;
        $.ajax({
            type: "GET",
            crossDomain: crossdomain,
            url: "https://eol.org/api/data_objects/1.0/"+ DOid +".json",
            data: query_string,
            on_complete: on_complete,
            error: function(){
                // will fire when timeout is reached
                this.on_complete(null,1)
            },
            success: function(data, textStatus) {
                if (data.dataObjects) {
                    if ((data.dataObjects.length) && (data.dataObjects[0].eolMediaURL)){
                        var to_return = data.dataObjects[0]
                        to_return.url = to_return.eolThumbnailURL.replace(/.98x68.jpg$/, ".580x360.jpg")
                        to_return.url_squarecrop = to_return.eolThumbnailURL.replace(/.98x68.jpg$/, ".130x130.jpg")
                        this.on_complete(to_return, 0)
                    } else {
                        this.on_complete(null, 5)
                    }
                } else {
                    //no identifier in return value - this is probably an EoL error
                    this.on_complete(null,2)
                }
            },
            timeout: timeout_ms || 10000 //default to 10 seconds timout
        });
    }
}

function setDataFromEoLpageID(EOLid, on_complete, EoL_key, n_images, include_names, timeout_ms) {
    /*  This takes in an EOL page ID: queries the EoL API, and calls the on_complete
        function, passing it 2 parameters. The first parameter passed to on_complete is
        a taxon object containing the attributes .imageObjects (a filtered version of 
        dataObjects) and (if include_names is true) .vernacularNames. The second parameter
        is a 'flags' field which tells us if e.g. the API call has failed.
        
        The 'on_complete' function will usually be something that modifies the current 
        page to add images, etc, e.g. 
    
        setDataFromEoLpageID(
            1234,
            function(taxon_obj, error_flag) {
                set_page_images(taxon_obj.dataObjects, taxon_obj.vernacularNames, error_flag, my_param1, my_param2)})
    
        The function can be called within web2py with page-specific values injected, e.g.
    
        setDataFromEoLpageID(
            {{=EOL_ID}},
            function(t, error_flag) {
                set_page_images(t.imageObjects, t.vernacularNames, err, {{=css_target}}, 12.5)})
    
        within the oncomplete function you may also find it useful to call 
        get_EOL_common_name(cnames) to get e.g. the english common name.
    
        error flags are:
        0 - no error
        1 - timeout no response from the EoL API
        2 - bad response from the EOL API
        3 - bad data passed in
    */
    n_images = n_images || 1;
    if (isNaN(parseInt(EOLid)) || isNaN(parseInt(n_images))) {
        on_complete(null,3)
    } else {
        var query_string = "batch=false&id=" + parseInt(EOLid) + "&images_per_page=" + n_images + "&images_page=1&videos_per_page=0&videos_page=0&sounds_per_page=0&sounds_page=0&maps_per_page=0&maps_page=0&texts_per_page=0&texts_page=0&iucn=true&subjects=overview&licenses=pd%7Ccc-by%7Ccc-by-sa&details=true&synonyms=false&references=false&taxonomy=false&vetted=2&cache_ttl=&language=en&common_names=" + (include_names?'true':'false') + "&key=" + EoL_key;
        $.ajax({
            type: "GET",
            url: "https://eol.org/api/pages/1.0.json", //always use https, as the http site fails
            data: query_string,
            EOLid: EOLid,
            on_complete: on_complete,
            error: function(){
                // will fire when timeout is reached
                this.on_complete(null,1)
            },
            success: function(data, textStatus) {
                d = data.taxonConcept
                if (d.identifier) {
                    var imgs = [];
                    if (d.hasOwnProperty('dataObjects') && d.dataObjects.length) {
                        imgs = d.dataObjects.filter(function(o) {return(o.dataObjectVersionID && o.eolThumbnailURL && o.eolThumbnailURL.endsWith(".98x68.jpg"))})
                        for (var i=0; i<imgs.length; i++) {
                            imgs[i].url = imgs[i].eolThumbnailURL.replace(/.98x68.jpg$/, ".580x360.jpg")
                            imgs[i].url_squarecrop = imgs[i].eolThumbnailURL.replace(/.98x68.jpg$/, ".130x130.jpg")
                        }
                    }
                    d.imageObjects = imgs
                    this.on_complete(d, 0)
                } else {
                    //no identifier in return value - this is probably an EoL error
                    this.on_complete(null,2)
                }
            },
            timeout: timeout_ms || 10000 //default to 10 seconds timout
        });
    }
}

function setDataFromEoLpageID_batch(EOLid_batch, on_complete, EoL_key, n_images, timeout_ms) {
    /* The same as setDataFromEoLpageID, but does a whole batch of taxa in one go, using the pages batch API.
    Instead of using a helper function that takes (img_objs, common_name, error_flag), it takes (1) an object (dict)
    whose keys are the EoL ids and whose values are objects (dicts), and (2) an oncomplete() function which can deal 
    with one of these returned objects. n_images is the number to get for each taxon.

    setDataFromEoLpageID_batch works by adding the properties 'imageObjects' and 'vernacularNames' 
    to each object in the batch, and calling the oncomplete() function for each one. If there is a failure, it is called once with
    an error_flag and an empty taxon_obj
    
    e.g.
    
    EOLobjects = {'eolid1':{'img_DOM_ID':XXX}, 'eolid2':{'img_DOM_ID':YYY}}
    
    function do_something_with(taxon_obj, error) {
        if (error==0) {
            document.getElementById(taxon_obj.img_DOM_ID).href = taxon_obj.imageObjects[0].url
            document.getElementById(taxon_obj.img_DOM_ID).title = get_EOL_common_name(taxon_obj.vernacularNames)
        }
    }
    
    //simple example
    setDataFromEoLpageID_batch(EOLobjects, do_something_with)
    
    //more complex
    setDataFromEoLpageID_batch(EOLobjects, 
        function(taxon_obj, error) {
            if (error==-1) document.getElementById('listID').style.display = "none";
            else          do_something_with(taxon_obj, error)

    
    error flags are:
    0 - no error
    1 - timeout no response from the EoL API
    2 - bad response from the EOL API
    3 - bad data passed in
    4 - no valid object IDs passed in (if so, the oncompletefunction is called just once, and the taxon_obj is null
    5 - ok, but no objects with images returned from any of the data objects
    
    */   
    n_images = n_images || 1;
    if (isNaN(parseInt(n_images))) {
        on_complete({},3)
    } else {
        var eolids = [];
        for (var eolid in EOLid_batch) {
            if (EOLid_batch.hasOwnProperty(eolid)) {
                if (/^\d+$/.test(eolid)) {
                    eolids.push(eolid)
                }
            }
        }
        if (eolids.length==0) {
            on_complete({},4)
        } else {
        var query_string = "batch=true&id=" + eolids.join('%2C') + "&images_per_page=" + n_images + "&images_page=1&videos_per_page=0&videos_page=0&sounds_per_page=0&sounds_page=0&maps_per_page=0&maps_page=0&texts_per_page=0&texts_page=0&iucn=true&subjects=overview&licenses=pd%7Ccc-by%7Ccc-by-sa&details=true&common_names=true&synonyms=false&references=false&taxonomy=false&vetted=2&cache_ttl=&language=en&key=" + EoL_key;
            $.ajax({
                type: "GET",
                //crossDomain: true,
                url: "https://eol.org/api/pages/1.0.json",
                data: query_string,
                EOLid_batch: EOLid_batch,
                on_complete: on_complete,
                error: function(){
                    // will fire when timeout is reached
                    this.on_complete({},1)
                },
                success: function(APIjson, textStatus) {
                    try {
                        var error_code = 5; //default in case no images are returned
                        //check e.g. in case EoL returns an error string, not an array
                        for(var eolID in APIjson) 
                            if (eolID in this.EOLid_batch) {
                                var data = APIjson[eolID].taxonConcept
                                var imgs = []
                                if (data.dataObjects.length) {
                                    var imgs = data.dataObjects.filter(function(o) {return(o.dataObjectVersionID && o.eolMediaURL && o.eolMediaURL.endsWith("_orig.jpg"))})
                                    if (imgs.length) {
                                        error_code=0
                                    }
                                    for (var j=0; j<imgs.length; j++) {
                                        imgs[j].url = imgs[j].eolThumbnailURL.replace(/.98x68.jpg$/, ".580x360.jpg")
                                        imgs[j].url_squarecrop = imgs[j].eolThumbnailURL.replace(/.98x68.jpg$/, ".580x360.jpg")
                                    }
                                }
                                this.EOLid_batch[eolID].imageObjects = imgs
                                this.EOLid_batch[eolID].vernacularNames = data.vernacularNames
                                this.on_complete(this.EOLid_batch[eolID],error_code)
                            }
                    }
                    catch(err) {
                        this.on_complete({},2)
                    }
                },
                timeout: timeout_ms || 10000 //default to 10 seconds timout
            });
        }
    }
}