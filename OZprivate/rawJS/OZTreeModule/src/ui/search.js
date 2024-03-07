/* Callback function for when total search is complete.
 * The parameter 'click_callback_id_name' should be another
 * callback that is fired when an item is clicked on in the list
 * (called with event, OZid, item_name, sci_name)
 */
function searchPopulate(searchbox, original_search, search_result, click_callback_id_name) {
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
        $('.search_hits', dropdown).empty();
        if (search_result.length == 0) {
            $('.no_results', dropdown).show();
        } else {
            if (window.is_testing) { console.log("Hiding no_result section of dropdown"); }
            $('.no_results', dropdown).hide();
            if (!is_sponsored(search_result[0])) {
                $(".search_hits", dropdown).append($('<dt></dt>').text(OZstrings['NameHits']))
            }
            var sponsored=false;
            $.each(search_result, function(index) {
                 if (index==200) {
                    //we have shown 200 items already
                    $(".search_hits", dropdown).append(
                        $('<dd></dd>').html("<em>(only showing top 200 hits)</em>"))
                    return false
                 }
                 var result = this;
                 if ((sponsored==false) && (is_sponsored(result))) {
                 $(".search_hits", dropdown).append($('<dt class="sponsorhits"></dt>').html(OZstrings['SponsorHits']))
                 sponsored=true;
                 }
                 var tempHTML = compile_names(result);
                 tempHTML += compile_extra(result);
                 $(".search_hits", dropdown).append(
                                                    $('<dd></dd>')
                                                    .html(tempHTML)
                                                    .click(function(event) {
                                                           click_callback_id_name(event, result)
                                                    }));
                 })
        }
        UIkit.dropdown(dropdown).show();
    } else {
        // else the box has since changed contents do nothing
        if (window.is_testing) { console.log("ignoring search results return beacause box has changed"); }
    }
}

export { searchPopulate };
