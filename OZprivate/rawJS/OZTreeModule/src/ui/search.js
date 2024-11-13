/* Callback function for when total search is complete.
 * (called with event, OZid, item_name, sci_name)
 */
function searchPopulate(searchbox, original_search, search_result) {
    // we want to test if we're waiting for a result at all and if we're not then do nothing regardless
    // think the status of the spinner should be used as this test i.e. the spinner starts going when an 
    // API call is actually made and stops going only when an API call is received 

    function add_link(html, record) {
        var url;

        if (global.document && window.location.pathname.indexOf("@") > -1) {
            // On a tree page, so mangle current link
            url = window.location.pathname.replace(/\@[^/]+=[0-9]+/, record.pinpoint) + window.location.search;
        } else {
            // Generate new URL from scratch
            url = "/life/" + record.pinpoint;
        }

        if (record.pinpoint) {
            return '<a href="' + url + '">' + html + '</a>';
        }
        return html;
    }

    function compile_names(record) {
        var is_leaf = record[2] < 0;
        if (record[0] && record[1]) {
            return "<p>" + add_link(record[0], record) + "</p>" + " (" + (is_leaf?"<i>"+add_link(record[1], record)+"</i>":add_link(record[1], record)) + ")";
        } else if (record[0]) {
            return "<p>" + add_link(record[0], record) + "</p>";
        } else if (record[1]) {
            return (is_leaf?"<p>" + add_link("<i>"+record[1]+"</i>", record) + "</p>":"<p>"+add_link(record[1],  record)+"</p>");
        }
    }

    function compile_extra(record) {
        // Add extra info to the html version of the record (extra vernaculars or sponsorships)
        if (record.length >= 5 && record[4] && record[4].info_type == "Sponsorship Info") {
            return '<p class="sponsorship-info">' + record[4].text + "</p>";
        } else if (record.length >= 5 && record[4] && record[4].info_type == "Extra Vernacular") {
            return '<p class="extra-info">' + record[4].text + "</p>";
        } else {
            return "";
        }
    }

    function is_sponsored(search_result_item) {
        if (search_result_item.length > 4) {
            return (search_result_item[4]['info_type']=="Sponsorship Info")
        }
        return false;
    }
    
    if (window.is_testing) { console.log("populating search results"); }

    if ($(".searchinput input", searchbox).val() == original_search)
    {
        // the results match what's still in the box so populate the results
        // we want to check that the original_search is still the same as what's in the box
        $(".searchinput", searchbox).removeClass('waiting_for_search_result');
        var dropdown = $(".search_dropdown", searchbox);
        if (window.is_testing) { console.log("Hiding popular species section of dropdown"); }
        $('.popular_species', dropdown).hide();
        $('.recents', dropdown).hide();
        $('.search_hits', dropdown).empty();
        if (search_result.tree.length + search_result.tour.length == 0) {
            $('.no_results', dropdown).show();
        } else {
            if (window.is_testing) { console.log("Hiding no_result section of dropdown"); }
            $('.no_results', dropdown).hide();

            $.each(search_result.tour, function(index) {
                var result = this;

                if (index === 0) {
                    $(".search_hits", dropdown).append($('<dt>').text(OZstrings['Tours']));
                }
                $(".search_hits", dropdown).append($('<dd>')
                    .attr("data-href", result.href)
                    .append($('<a>')
                        // NB: This href needs to work from other pages, e.g. homepage
                        .attr("href", '/life/?tour=' + encodeURIComponent(result.url))
                        .text(result.title) ));
            });

            var prev_sponsored = null;  // NB: Always show a header at start
            $.each(search_result.tree, function(index) {
                 var result = this;

                 if (index==200) {
                    //we have shown 200 items already
                    $(".search_hits", dropdown).append(
                        $('<dd></dd>').html("<em>(only showing top 200 hits)</em>"))
                    return false
                 }

                 // Append header when section type changes
                 if (prev_sponsored === null || prev_sponsored !== is_sponsored(result)) {
                     prev_sponsored = is_sponsored(result);
                     $(".search_hits", dropdown).append($('<dt></dt>').text(OZstrings[prev_sponsored ? 'SponsorHits' : 'Search results']));
                 }

                 var tempHTML = compile_names(result);
                 tempHTML += compile_extra(result);
                 $(".search_hits", dropdown).append(
                                                    $('<dd></dd>')
                                                    // Attach compile_searchbox_data() results to reconstitute on advanced_search_box click
                                                    .attr("data-vernacular", result[0])
                                                    .attr("data-sciname", result[1])
                                                    .attr("data-pinpoint", result.pinpoint)
                                                    .html(tempHTML));
                 })
        }
        UIkit.dropdown(dropdown).show();
    } else {
        // else the box has since changed contents do nothing
        if (window.is_testing) { console.log("ignoring search results return beacause box has changed"); }
    }
}

/* Add a set of species (e.g. popular species) to a target list,
 * by using the onezoom.utils.process_taxon_list() function
 * to map OTT ids to OneZoom IDs / vernacular names.
 * The parameter 'click_callback_id_name' should be a
 * callback that is fired when an item is clicked on in the list
 * (called with event, OZid, item_name, sci_name, dropdown)
 */
function setup_location_list(target, locations_json) {
  onezoom.utils.process_taxon_list(locations_json).then(function (taxon_list) {
    target.empty().append(taxon_list.map(function (taxon) {
      if (typeof taxon === "string") {
        return $('<dt>').text(OZstrings.hasOwnProperty(taxon) ? OZstrings[taxon] : taxon);
      }
      return create_location_dd_element(taxon.vernacular, taxon.sciname, '@=' + taxon.ott, taxon.href, taxon.ozid);
    }));
  });
}

function create_location_dd_element(vernacular, sciname, pinpoint, href, ozid) {
    return $('<dd>')
        // Attach compile_searchbox_data()-esque results to reconstitute on advanced_search_box click
        .attr("data-vernacular", vernacular)
        .attr("data-sciname", sciname)
        .attr("data-pinpoint", pinpoint)
        .html(
            $('<p>').html(
                $('<a>')
                    .attr('href', href)
                    .attr("draggable","true")
                    .on('dragstart', function(event) {
                        // Recreate a compile_searchbox_data() format
                        event.originalEvent.dataTransfer.setData('result', JSON.stringify({
                        0: vernacular,
                        1: sciname,
                        2: ozid,
                        "pinpoint": pinpoint,
                        }));
                    })
                    .html(vernacular ? $('<span>').text(vernacular) : $('<i>').text(sciname) )
            )
        );
}




const MAX_RECENT_PLACES = 5;

/**
 * @typedef {Object} SearchResult
 * @property {string|undefined} vernacular
 * @property {string|undefined} sciname
 * @property {string} pinpoint
 * @property {string} href
 */

/**
 * @returns {SearchResult|null}
 */
function get_search_result_from_element(element) {
    if ($(element).attr('data-pinpoint')) {
        return {
          // Recreate a compile_searchbox_data() format
          "vernacular": $(element).attr('data-vernacular'),
          "sciname": $(element).attr('data-sciname'),
          "pinpoint":  $(element).attr('data-pinpoint'),
          "href": $(element).find('a').attr('href'),
        };
    }
    return null;
}

/**
 * Recently used places from the search menu. 
 * @type {SearchResult[]} 
 * */
let recent_places = (() => {
    try {
        const stored = JSON.parse(localStorage.getItem('recent_places') || '[]');
        if (!Array.isArray(stored)) return [];
        
        const valid = stored.every(item => 
            item &&
            typeof item === 'object' &&
            typeof item.pinpoint === 'string' &&
            typeof item.href === 'string' &&
            (item.vernacular == undefined || typeof item.vernacular === 'string') &&
            (item.sciname == undefined || typeof item.sciname === 'string')
        );
        
        return valid ? stored : [];
    } catch {
        return [];
    }
})();

/**
 * Push a recent place to the front of the list, removing duplicates and limiting the size.
 * @param {SearchResult} recent_search_result
 * */
function push_recent_place(recent_search_result) {
    recent_places = recent_places.filter(function (place) {
        return place.pinpoint !== recent_search_result.pinpoint;
    });
    const newLength = recent_places.unshift(recent_search_result);
    if (newLength > MAX_RECENT_PLACES) {
        recent_places.pop();
    }
    localStorage.setItem('recent_places', JSON.stringify(recent_places));
}

/**
 * Push a recent search result to the front of the list using its containing dd element.
 * */
function add_element_to_recents_list(element) {
    const search_result = get_search_result_from_element(element);
    if (search_result) {
        push_recent_place(search_result);
    }
}

function make_clear_recents_button() {
    return $('<button>')
        .addClass('uk-button uk-button-default uk-button-small')
        .text(OZstrings.hasOwnProperty("Clear recents") ? OZstrings["Clear recents"] : "Clear recents")
        .on('click', clear_recents);
}

function clear_recents() {
    recent_places = [];
    localStorage.setItem('recent_places', '[]');
    $('.uk-dropdown.uk-open .recents').each(function() {
        update_recents_list($(this));
    });
}

function update_recents_list($target) {
    $target.empty()

    if (recent_places.length === 0) {
        return;
    }

    const dl = $('<dl>');
    $target.append(dl);
    dl.append($('<dt>').text(OZstrings.hasOwnProperty("Recent places") ? OZstrings["Recent places"] : "Recent places"));
    dl.append(recent_places.map(function (recent_place) {
        return create_location_dd_element(recent_place.vernacular, recent_place.sciname, recent_place.pinpoint, recent_place.href);
    }));
    $target.append(make_clear_recents_button());
};

function setup_recents_list($target) {
    const elements = $target.get();
    if (elements.length !== 1) {
        console.error("setup_recents_list: target must have exactly one element");
        return;
    }
    const $element = $(elements[0]);
    const dropdownElement = $element.closest('.search_dropdown')[0];
    if (dropdownElement) {
        $(document).on('beforeshow', function(event) {
            if (event.target === dropdownElement) {
                update_recents_list($element);
            }
        });
    }
    update_recents_list($element);
}

export { searchPopulate, setup_location_list, setup_recents_list, push_recent_place, get_search_result_from_element, add_element_to_recents_list };
