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
                 "window_text": "<svg style='float:right; margin:0 20px' xmlns='http://www.w3.org/2000/svg' height='109.288' width='79.985'><defs><clipPath id='a'><path d='M0 612h792V0H0z'/></clipPath></defs><g clip-path='url(#a)' transform='matrix(.66155 0 0 -.65108 -306.7 214.426)'><path fill='#878786' d='M579.858 213.479c-.093-1.008-.168-1.82-.209-2.365-.248-3.345-1.007-13.525-3.405-18.322-2.68-5.366-.954-12.2-.88-12.489l.062-.186c.482-1.174.312-2.53-.492-3.923-1.248-2.162-5.198-6.293-17.624-9.654-15.45-4.179-19.6.095-19.602.095-.325.405-32.482 40.694-36.886 59.756l-.061.198c-2.527 6.5-5.161 14.347-5.01 15.69.162 1.42-.066 3.845-.356 6.916-.448 4.753-1.282 13.602.6 15.377.133.123.193.106.266.107 1.91 0 3.493-.591 4.835-1.81 5.51-4.998 4.819-17.946 4.811-18.077l-.016-.272.09-.261c.168-.501 3.91-11.23 12.234-12.068-.567-4.157-1.203-6.113-1.216-6.154l1.779-.45 1.778-.453c.125.368 3.063 9.277 2.032 30.165-.339 6.85-1.264 14.08-2.08 20.458-1.32 10.303-2.961 23.125.147 23.94.669.173 1.22.12 1.798-.173 3.395-1.734 5.477-10.164 6.476-14.215l.652-2.614c3.16-12.715 7.984-30.336 13.359-36.54l2.966 1.926c-3.327 3.84-6.617 13.3-9.094 21.77 3.13.7 5.821.492 7.997-.647 2.7-1.416 4.143-4.003 4.593-5.953.885-3.829 5.33-17.463 5.518-18.04l3.568.872c-.04.125-3.643 11.177-5.04 16.225 7.61.455 9.514-6.064 9.71-6.839.79-3.148 6.028-15.47 6.252-15.994l3.478 1.11c-1.126 2.646-2.916 6.948-4.283 10.449 4.257-.537 6.562-4.34 8.998-9.165.673-1.336 1.308-2.597 1.993-3.594 2.252-3.284.754-19.476.262-24.796m2.927 26.434c-.568.826-1.158 2-1.786 3.24-2.301 4.563-5.712 11.299-13.63 11.165-.275.775-.483 1.411-.588 1.833-.989 3.932-5.1 10.22-14.245 9.31-.74 1.875-2.365 4.684-5.807 6.487-3.054 1.601-6.693 1.93-10.806 1.015-1.2 4.311-2.146 8.113-2.717 10.407l-.65 2.61c-1.732 7.011-3.793 14.047-8.22 16.308-1.46.746-3.105.912-4.755.48-6.06-1.587-4.746-11.843-2.76-27.365.811-6.328 1.73-13.5 2.062-20.242.423-8.565.156-15.07-.296-19.744-5.321.641-8.417 8.07-8.962 9.51.088 2.14.316 14.564-5.842 20.154-2.054 1.864-4.584 2.808-7.52 2.808h-.048c-1.14-.004-2.16-.4-2.951-1.147-2.76-2.602-2.365-9.31-1.565-17.808.252-2.678.491-5.207.361-6.34-.299-2.62 3.815-13.495 5.149-16.932 4.64-19.748 36.113-59.184 37.459-60.864.368-.455 3-3.315 10.743-3.315 3.32 0 7.581.527 13.004 1.994 13.048 3.53 17.989 8.084 19.835 11.283 1.225 2.12 1.477 4.361.713 6.323-.169.726-1.375 6.312.685 10.435 2.378 4.759 3.252 13.345 3.702 19.39.04.534.113 1.327.203 2.314 1.083 11.702 1.74 23.034-.768 26.69'/><path d='M538.295 329.338h-18.964l3.576-3.575-10.455-10.456 11.653-11.652 10.455 10.455 3.735-3.735zM463.61 254.653l18.964.002-3.576 3.575 10.455 10.454-11.652 11.652-10.456-10.454-3.734 3.735z'/></g></svg>{{=T('Touch the screen with two fingers: spread them apart to zoom in, pinch together to zoom out.')}}",
           },
           "wait": 7000,
       },
           {
           "ott": "563159",
           "ott_end_id": "44565",
           "update_class": {
                 "title": "{{=T('Panning')}}",
                 "window_text": "{{=T('You can move the map left, right up and down by moving a single finger on the screen.')}}",
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
                "window_text": "{{=T('The compass icon will show where you are in the complete tree of life, select the named locations to zoom out and see more of the tree.  The reset icon will take you back to the start location, which should be familiar to you.')}}",
           },
           "wait": 15000
       },
       {
           "ott": "229562",
           "update_class": {
                "title": "{{=T('Find common ancestors')}}",
                "window_text": "{{=T('Next to the search button you can select the advanced search button. This will enable you to mark multiple places on the tree and find the most recent common ancestor of any set of species. Have fun exploring!')}}",
           },
       },
   ]
}