/* DEFINE SOME SETTINGS TO BE PASSED TO THE SCREENSAVER */
{
    "general": {
        "dom_names": {
            /**
             * All the following values are default values.
             */
            "wrapper_id": "tour_wrapper",
            "forward_class": "tour_forward",
            "backward_class": "tour_backward",
            "exit_class": "tour_exit",
            "exit_confirm_class": "exit_confirm",
            "exit_cancel_class": "exit_cancel"
        },
    },
    "tourstop_shared": {
        "template": "{{=URL('static', 'tour/tour_template.html')}}",
        "template_style": "{{=URL('static', 'tour/tour_template.css')}}",
        "update_class": {
            // Don't show any boxes
            "container": {"style": {"display": "None"}}
        },
        "fly_in_speed":0.1,
    },
    "tourstops": [
    {{for ott in screensaver_otts:}}
        {
            "ott": "{{=ott}}",
            "wait": 1000
        },
    {{pass}}
    ]
}