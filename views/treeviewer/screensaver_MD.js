/* DEFINE SOME SETTINGS TO BE PASSED TO THE SCREENSAVER */
{
"screensaver": {
    /**
     * This part of the setting should not normally be part of a tour config: we do not
     * want any normal tours to start automatically. Variables here should either be
     * set explicitly on the screensaver object, or
     *  start tour after XXX seconds inactivity.
     * Tour would only be activated when condition test passed or if condition test is not given.
     */
    //set a number to auto start after XXX ms (may be overridden)
    inactive_duration: 10 * 1000,
    //do we go 1->2->3->1->2->3 or 1->2->3->2->1->2->3
    loop_back_forth: true
},
"general": {
    "dom_names": {
        /**
         * All the following values are default values.
         */
        "wrapper_id": "tour_wrapper",
        "next_class": "tour_next",
        "prev_class": "tour_prev",
        "exit_class": "tour_exit",
        "exit_confirm_class": "exit_confirm",
        "exit_cancel_class": "exit_cancel"
    },
},
"tourstop_shared": {
    "template": "static/tour/tour_template.html",
    "template_style": "static/tour/tour_template.css",
    "update_class": {
        "title": "OneZoom Demo Tour",
        // Don't show any boxes
        "container": {"style": {"display": "None"}}
    }
},
"tourstop": [
    {
        "ott": "991547",
        "wait": 1000
    },
    {
        "ott": "81461",
        "wait": 1000
    },
    {
        "ott": "99252",
        "wait": 1000
    },
]
}