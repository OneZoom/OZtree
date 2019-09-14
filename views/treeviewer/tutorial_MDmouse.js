{
  "dom_names": {
    /**
     * All the following values are default values.
     * Specify which element to bind the next tour stop, previous tour stop and exit tour event.
     */
    "wrapper_id": "tour_wrapper",
    "next_class": "tour_next",
    "exit_class": "tour_exit",
    "prev_class": "tour_prev",
  },
  /**
   * Tour stop shared is the shared properties of all tour stop
   * Each tour stop could overwrite the properties independently
   */
  "tour_stop_shared": {
      "template": "static/tour/tutorial_template.html",
      "template_style": "static/tour/tutorial_template.css",
      "update_class": {
          /**
           * Replace content of classes e.g. $('.title'), $('.tour_prev'), $('.tour_next')
           * If a string, replace with the html. Otherwise could be "text", "style", or "src"
           */
          "tour_prev": {
              "text": "← {{=T('Previous')}}"
          },
          "tour_exit": {
              "text": "{{=T('Exit tutorial')}}"
          },
          "tour_next": {
              "text": "{{=T('Next')}} →"
          },
          "img": {
              "style": {"display": "none"} /* remove completely */
          },
      },
  },
  "tour_stop": [
      {
          "ott": "117569",
          "update_class": {
              "title": "{{=T('What is the tree of life?')}}",
              "window_text": "{{=T('The tree of life shows how all life on earth is related.  Each leaf represents a different species. The branches show how these many species evolved from common ancestors over billions of years.')}}",
               "tour_prev": {
                   /**
                    * Previous button should be invisible in first stop
                    */
                   "style": {"visibility": "hidden"}
               },
           },
           //default to null, means waiting for next button to go to next stop
           "wait": 25000,
           //used if this stop is entered by pressing previous stop
           "wait_after_prev": null
       },
       {
           "ott": "117569",
           "ott_end_id": "44565",
           "update_class": {
               "tour_container": {"style": {"visibility": "hidden"}},
           },
           //transition default wait time is 0
       },
       {
           "ott": "44565",
           "update_class": {
               "title": "{{=T('Exploring the tree')}}",
               "window_text": "{{=T('You can explore this complete tree of life by zooming in and out like you would use an online map.')}}",
               
           },
           "wait": 10000,
       },
       {
           "ott": "44565",
           "ott_end_id": "563159",
           "update_class": {
                 "title": "{{=T('Zooming')}}",
                 "window_text": "{{=T('You can use your mouse wheel or on-screen buttons to zoom in or out.')}}",
           },
           "wait": 7000,
       },
           {
           "ott": "563159",
           "ott_end_id": "44565",
           "update_class": {
                 "title": "{{=T('Panning')}}",
                 "window_text": "{{=T('You can move the map left, right up and down by clicking and dragging the mouse.')}}",
           },
           "wait": 7000,
       },
       {
           "ott": "44565",
           "ott_end_id": "913935",
           "update_class": {
               "tour_container": {"style": {"visibility": "hidden"}},
           },
       },
       {
           "ott": "913935",
           "update_class": {
                "title": "{{=T('Threat of extinction')}}",
                "window_text": "{{=T('Species known to be under threat of extinction are shown with red leaves. This information comes from the International Union for the Conservation of Nature (IUCN) Red List.')}}",
           },
           "wait": 25000
       },
       {
           "ott": "913935",
           "ott_end_id": "855577",
           "update_class": {
               "title": "{{=T('Search for something')}}",
                "window_text": "{{=T('You can click on search to see some suggested popular places to visit or enter the name of something you specifically want to find in the tree of life.  There’s so much life out there you’ll be amazed what you can find.')}}",
               // I'd quite like to show the search icon here really
               },
       },
       {
           "ott": "855577",
           "update_class": {
                "tour_container": {"style": {"visibility": "hidden"}},
           },
           "wait": 5000
       },
       {
           "ott": "855577",
           "update_class": {
                "title": "{{=T('Are you lost?')}}",
                "window_text": "{{=T('The compass icon will show where you are in the complete tree of life, you can click on the path to zoom out and see more of the tree.  The reset icon will take you back to the start location, which should be familiar to you.')}}",
           },
           "wait": 15000
       },
       {
           "ott": "229562",
           "update_class": {
                "title": "{{=T('Find common ancestors')}}",
                "window_text": "{{=T('Next to the search button you can click on the advanced search button. This will enable you to mark multiple places on the tree and find the most recent common ancestor of any set of species. Have fun exploring!')}}",
           },
       },
   ]
}