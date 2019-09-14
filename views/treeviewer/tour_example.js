/* DEFINE SOME SETTINGS TO BE PASSED TO THE SCREENSAVER */
{
/**
 * Automatically start tour after XXX seconds inactivity.
 * Tour would only be activated when condition test passed or if condition test is not given.
 */
"auto_activate": {
    //set a number to auto start after XXX ms (may be overridden)
    inactive_duration: 10 * 1000,
    condition: () => {
        return !$('#external-modal').is(':visible') &&
            !$('#info-modal').is(':visible') &&
            !$('#howuse-modal').is(':visible')
    }
},
"start_cb": () => {
    //track whether the button is expanded when screen saver start
    button_expanded_cached = $('#controlButtons').hasClass('button-hint-visible')
    $('#controlButtons').removeClass('button-hint-visible')
},
"exit_cb": () => {
    if (button_expanded_cached) {
        $('#controlButtons').addClass('button-hint-visible')
    }
},
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
"dom_id": {
    /**
     * All the following values are default values.
     */
    "wrapper_id": "tour_wrapper",
    "next_id": "tour_next",
    "prev_id": "tour_prev",
    "exit_id": "tour_exit",
    "exit_confirm_id": "exit_confirm",
    "exit_cancel_id": "exit_cancel"
},
"tour_stop_shared": {
    "template": "static/tour/tutorial_template.html",
    "template_style": "static/tour/tutorial_template.css",
    "dom_update": {
        "title": "OneZoom ScreenSaver",
        "tour_prev": {
            "visible": false
        },
        "tour_next": {
            "visible": false
        }
    },
    "style_update": {
        "window_text": "class-name"
    }
},
"tour_stop": [
    {
        "ott": "991547",
        "dom_update": {
            "window_text": "Slide 1",
            "img": {
                src: "http://images.onezoom.org/99/098/31338098.jpg"
            }
        },
        "wait": 3000
    },
    {
        "ott": "991547",
        "ott_end_id": "81461",
        "dom_update": {
            "window_text": "Slide 2 with style change",
            "img": {
                src: "http://images.onezoom.org/99/727/26848727.jpg"
            }
        },
        "style_update": {
            "window_text": "gray_background"
        },
        //transition default wait time is 0
        "wait": 0
    },
    {
        "ott": "81461",
        "dom_update": {
            "window_text": "Slide 3",
            "img": {
                visible: false
            }
        },
        "wait": 3000
    },
    {
        "ott": "81461",
        "ott_end_id": "99252",
        "dom_update": {
            "window_text": "Slide 4",
            "img": {
                visible: false
            }
        },
        "wait": 1000
    },
    {
        "ott": "99252",
        "ott_end_id": "1062253",
        "dom_update": {
            "window_text": "Slide 5",
            "tour_next": {
                visible: false
            },
            "img": {
                visible: false
            }
        },
        "wait": 1500
    },
]
}