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
      "hide_tourstop_style": {"remove_class": "active"},
      "show_tourstop_style": {"add_class": "active"},
      "fly_in_speed": 0.3, /* speed relative to the global_anim_speed */
  },
  "tourstops": [
        {{for key in anim:}}
        {{if key.isdigit():}}
        {   "transition_in_visibility": "show_self", // Show the name of where we are going
            "ott": "{{=key}}",
            "update_class": {
                "linkout": {
                    "href": "{{=hrefs.get(key, "")}}"},
                "ottname": "{{=XML(html_names.get(key, 'Unknown'))}}"
            },
            "wait": 1000
        },
        {{pass}}
        {{pass}}
   ]
}