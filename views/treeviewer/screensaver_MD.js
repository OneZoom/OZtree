/* DEFINE SOME SETTINGS TO BE PASSED TO THE SCREENSAVER */
{
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
    "tourstops": [
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