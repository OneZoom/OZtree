/* DEFINE SOME SETTINGS TO BE PASSED TO THE TOUR */
{
/**
 * Automatically start tour after XXX seconds inactivity.
 * Tour would only be activated when condition test passed or if condition test is not given.
 */
"interaction": {
    /**
     * block: disable interaction
     * exit: interaction would cause tour exit
     * exit_after_confirmation: interaction would cause tour exit, but user need to confirm first
     * no_effect: interaction would not have any effect. This is default.
     */
    effect: "exit_after_confirmation",
    confirm_template: 'static/tour/exit_confirm.html',
    confirm_template_style: 'static/tour/exit_confirm.css',
},
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
"tour_stop_shared": {
    "template": "static/tour/tutorial_template.html",
    "template_style": "static/tour/tutorial_template.css",
    "update_class": {
        "title": "OneZoom Demo Tour",
        "tour_prev": {
            "style": {"visibility": "hidden"}
        },
        "tour_next": {
            "style": {"visibility": "hidden"}
        }
},
"tour_stop": [
    {
        "ott": "991547",
        "update_class": {
            "window_text": "Slide 1",
            "img": {
                "src": "http://images.onezoom.org/99/098/31338098.jpg"
            }
        },
        "wait": 3000
    },
    {
        "ott": "991547",
        "ott_end_id": "81461",
        "update_class": {
            "window_text": "Slide 2 with style change",
            "img": {
                "src": "http://images.onezoom.org/99/727/26848727.jpg"
            "style": {"window_text": "gray_background"},
            }
        },
        //transition default wait time is 0
        "wait": 0
    },
    {
        "ott": "81461",
        "update_class": {
            "window_text": "Slide 3",
            "img": {
                "style": {"visibility": "hidden"}
            }
        },
        "wait": 3000
    },
    {
        "ott": "81461",
        "ott_end_id": "99252",
        "update_class": {
            "window_text": "Slide 4",
            "img": {
                "style": {"visibility": "hidden"}
            }
        },
        "wait": 1000
    },
    {
        "ott": "99252",
        "ott_end_id": "1062253",
        "update_class": {
            "window_text": "Slide 5",
            "tour_next": {
                "style": {"visibility": "hidden"}
            },
            "img": {
                "style": {"visibility": "hidden"}
            }
        },
        "wait": 1500
    },
]
}