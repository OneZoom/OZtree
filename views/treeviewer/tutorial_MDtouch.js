{
  "start_cb": () => {
    //track whether the button is expanded when screen saver starts
    button_expanded_cached = $('#controlButtons').hasClass('button-hint-visible')
    $('#controlButtons').removeClass('button-hint-visible')
  },
  "exit_cb": () => {
    if (button_expanded_cached) {
        $('#controlButtons').addClass('button-hint-visible')
    }
  },
  "dom_id": {
    /**
     * All the following values are default values.
     * Specify which element to bind the next tour stop, previous tour stop and exit tour event.
     */
    "wrapper_id": "tour_wrapper",
    "next_id": "tour_next",
    "prev_id": "tour_prev",
    "exit_id": "tour_exit"
  },
  /**
   * Tour stop shared is the shared properties of all tour stop
   * Each tour stop could overwrite the properties independently
   */
  "tour_stop_shared": {
      "template": "static/tour/tutorial_template.html",
      "template_style": "static/tour/tutorial_template.css",
      "dom_update": {
          /**
           * Replace content of $('#title'), $('#tour_prev'), $('#tour_next')
           */
          "tour_prev": {
              "text": "prev"
          },
          "tour_next": {
              "text": "next"
          },
          "img": {
              "visible": false
          },
      },
      "style_update": {
          /**
           * Set class name of $('#window_text') to be 'class-name'
           */
          "window_text": "class-name"
      }
  },
  "tour_stop": [
      {
          "ott": "117569",
          "dom_update": {
              "title": "{{=T('What is the tree of life?')}}",
              "window_text": "The tree of life shows how all life on earth is related.  Each leaf represents a different species. The branches show how these many species evolved from common ancestors over billions of years.",
               "tour_prev": {
                   /**
                    * Previous button should be hidden in first stop
                    */
                   visible: false
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
           "dom_update": {
                 "tour_UI": {"visible": false},
           },
           //transition default wait time is 0
       },
       {
           "ott": "44565",
           "dom_update": {
               "tour_UI": {"visible": true},
                 
               "title": "{{=T('Exploring the tree')}}",
               "window_text": "You can explore this complete tree of life by zooming in and out like you would on a geographic map.",
               
           },
                 "wait": 10000,
       },
       {
                 "ott": "44565",
                 "ott_end_id": "563159",
                 "dom_update": {
                 "window_text": {"visible": true},
                 "title": {"visible": true},
                 "tour_next": {"visible": true},
                 "tour_prev": {"visible": true},
                 "tour_exit": {"visible": true},
                 
                 "title": "Zooming in",
                 "window_text": "Touch with two fingers, spread them apart to zoom in.  You can also use your mouse wheel to zoom.",
                 
                 },
                 "wait": 7000,
       },
                 {
                 "ott": "563159",
                 "ott_end_id": "44565",
                 "dom_update": {
                 "window_text": {"visible": true},
                 "title": {"visible": true},
                 "tour_next": {"visible": true},
                 "tour_prev": {"visible": true},
                 "tour_exit": {"visible": true},
                 
                 "title": "Zooming out",
                 "window_text": "Pinch your fingers together to zoom out. You can move the map left, right up and down with your fingers or by left clicking and moving the mouse.",
                          },
                          "wait": 7000,
                },
                {
                    "ott": "44565",
                    "ott_end_id": "913935",
                    "dom_update": {
                          "tour_UI": {"visible": false},
                    },
                },
                {
                          "ott": "913935",
                          "dom_update": {
                                "tour_UI": {"visible": true},
                                "title": "Threat of extinction",
                                "window_text": "Species known to be under threat of extinction are shown with red leaves. This information comes from the International Union for the Conservation of Nature (IUCN) Red List.",
                          },
                          "wait": 25000
                },
                {
                          "ott": "913935",
                          "ott_end_id": "855577",
                          "dom_update": {
                          "title": "Search for something",
                          "window_text": "You can click on search to see some suggested popular places to visit or enter the name of something you specifically want to find in the tree of life.  There’s so much life out there you’ll be amazed what you can find.",
                          // I'd quite like to show the search icon here really
                          },
                },
                {
                          "ott": "855577",
                          "dom_update": {
                          "tour_UI": {"visible": false},
                          },
                          "wait": 5000
                 },
                 {
                          "ott": "855577",
                          "dom_update": {
                          "tour_UI": {"visible": true},
                          "title": "Are you lost?",
                          "window_text": "The compass icon will show where you are in the complete tree of life, you can click on the path to zoom out and see more of the tree.  The reset icon will take you back to the start location, which should be familiar to you.",
                          // I'd quite like to show the search icon here really
                          },
                          "wait": 15000
                 },
                 {
                          "ott": "229562",
                          "dom_update": {
                          "tour_UI": {"visible": true},
                          "title": "Find common ancestors",
                          "window_text": "Next to the search button you can click on the advanced search button. This will enable you to mark multiple places on the tree and find the most recent common ancestor of any set of species. Have fun exploring!",
                     // I'd quite like to show the search icon here really
                     },
             },
       ]
}