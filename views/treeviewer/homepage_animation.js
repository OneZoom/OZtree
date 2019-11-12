{
  /* THE SETTINGS FOR THE ANIMATION ON THE FRONT PAGE */
  "general": {
    "dom_names": {
      /**
       * All the following values are default values.
       * Specify which element to bind the next tour stop, previous tour stop and exit tour event.
       */
      "wrapper_id": "tour_wrapper",
    },
  },
  /**
   * Tour stop shared is the shared properties of all tour stop
   * Each tour stop could overwrite the properties independently
   */
  "tourstop_shared": {
      "template": "default/homepage_animation_template.html",
      // "template_style" shouldn't be needed, as the css will be in the frontpage
      "hide_tourstop_style": {"opacity": "0"}, // Better than display:none for 
      "show_tourstop_style": {"opacity": "1"}, // UIkit transitions
  },
  "tourstops": [
        {{for info in animation_locations:}}
        {   "transition_in_visibility": "show_self", // Show the name of where we are going
            "ott": "{{=info[0]}}",
            "update_class": {
                "linkout": {
                    "href": "life/@={{=info[0]}}"},
                "ottname": "{{=info[1]}}"
            },
            "wait": 500
        },
        {{pass}}
   ]
}