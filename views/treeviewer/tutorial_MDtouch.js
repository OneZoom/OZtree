{
  "general": {
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
  },
  /**
   * Tour stop shared is the shared properties of all tour stop
   * Each tour stop could overwrite the properties independently
   */
  "tourstop_shared": {
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
          "outsidebox": {
              "style": {"display": "none"} /* remove completely */
          },
      },
  },
  "tourstops": [
      {
        "transition_in":"fly", // can be "fly" (default), "leap", or "fly_straight" (rare)
        "fly_in_speed":2, // Relative to the global animation_speed
        // Can be "show_self" "force_hide", otherwise (by default) previous stop is left unchanged during flight transition
        "fly_in_visibility": null,
        "ott": "93302", //Biota
        "update_class": {
          "title": "{{=T('What is the tree of life?')}}{{if is_testing:}} - ALL LIFE{{pass}}",
          "window_text": "{{=T('The tree of life shows how all life on earth is related.  Each leaf represents a different species. The branches show how these many species evolved from common ancestors over billions of years.')}}",
          "tour_prev": {
            "style": {"visibility": "hidden"} // Prev button invisible for first stop
          },
        },
        //default to null means "wait for next button to go to next stop"
        "wait": 3000,
        //used if this stop is entered by pressing previous stop
        "wait_after_prev": null,
      },
      {
        "ott": "770315", // humans
        "fly_in_visibility": "force_show",
        "update_class": {
            "title": "{{=T('Exploring the tree')}}{{if is_testing:}} - HUMANS{{pass}}",
            "window_text": {
                "style":{"min-height":0},
                "text":"{{=T('You can explore this complete tree of life by zooming in and out like you would use an online map.')}}"},
            
        },
      "wait": 2500,
      },
      {
        "ott": "351685",
        "transition_in": "fly_straight",
        "fly_in_visibility": "show_self",
        "fly_in_speed": 0.3,
        "update_class": {
            "title": "{{=T('Panning')}}",
            "tour_container": {"style": {"top": "100px", "left":"300px"}},
            "window_text": "<svg style='float:right; margin:0 20px' xmlns='http://www.w3.org/2000/svg' height='117.556' width='66.571'><defs><clipPath id='a'><path d='M0 612h792V0H0z'/></clipPath></defs><g clip-path='url(#a)' transform='matrix(1.25 0 0 -1.25 -153.644 541.92)'><path fill='#878786' d='M173.585 366.091c-.051-.516-.093-.93-.116-1.209-.138-1.711-.559-6.92-1.89-9.374-1.488-2.745-.53-6.242-.488-6.39l.034-.094c.267-.601.173-1.295-.274-2.007-.694-1.107-2.887-3.22-9.786-4.94-8.277-2.062-10.714-.1-10.88.046-.734.979-14.437 19.381-14.005 27.985.058 3.317.243 12.149.393 13.166.124.842-.047 1.99-.228 3.208-.173 1.162-.494 3.326-.113 3.675 0 0 .07.01.237-.029l.197-.028c.108-.009 2.59-.26 3.787-3.653-.033-1.686-.065-3.468-.094-5.352-.025-1.578-.043-2.742-.06-3.291-.106-3.204-1.466-5.268-1.48-5.288l.907-.39.904-.39c.066.096 1.607 2.403 1.726 6.025.018.553.037 1.725.061 3.314.03 1.918.064 3.739.1 5.473l.037.008c-.01.035-.024.064-.036.098.312 14.844.851 22.903 1.603 23.961.63.737 1.652 1.118 2.547.95.775-.148 1.278-.683 1.416-1.508.141-.845.318-3.779.524-7.175.6-9.965 1.179-18.378 2.17-20.384l1.915.602c-.626 1.268-1.134 6.614-1.524 12.03 1.066.172 2 .056 2.842-.35 1.886-.912 3.056-3.218 3.52-5.072.472-1.882 1.008-6.904 1.013-6.955l2.052.138c-.022.21-.55 5.166-1.046 7.139-.06.24-.167.616-.327 1.062 3.987.067 4.984-3.131 5.089-3.518.439-1.611 3.348-7.915 3.47-8.183l1.933.568a201.935 201.935 0 0 0-2.378 5.345c2.37-.273 3.642-2.22 4.995-4.689.375-.683.728-1.327 1.108-1.838 1.25-1.68.418-9.964.145-12.686m1.625 13.524c-.315.423-.643 1.023-.991 1.658-1.279 2.335-3.167 5.781-7.569 5.712-.153.396-.268.722-.326.938-.545 2-2.807 5.183-7.813 4.77-.696 1.293-1.78 2.692-3.434 3.491-1.21.585-2.56.778-4.024.591-.15 2.21-.28 4.365-.39 6.186-.215 3.575-.385 6.4-.538 7.313-.251 1.503-1.366 2.582-2.982 2.888-1.716.325-3.615-.327-4.722-1.622-.98-1.146-1.545-7.377-1.89-21.575-1.472 1.421-3.108 1.709-3.582 1.76-.99.205-1.631-.045-2-.296-1.282-.87-.989-2.85-.648-5.14.16-1.069.323-2.174.227-2.824-.193-1.308-.399-12.844-.406-13.313-.465-9.261 13.726-28.12 14.33-28.918l.039-.047c.205-.233 1.667-1.697 5.966-1.697 1.844 0 4.21.27 7.221 1.02 7.246 1.806 9.99 4.136 11.015 5.773.68 1.085.82 2.23.396 3.234-.095.373-.764 3.23.38 5.34 1.32 2.434 1.804 6.826 2.055 9.919.022.273.063.679.114 1.184.601 5.986.965 11.785-.428 13.655'/><path d='M146.277 433.535l-7.446-7.446h2.808v-8.21h9.15v8.21h2.933zM168.999 412.068l-7.446 7.445v-2.807h-8.21v-9.151h8.21v-2.933zM122.915 411.922l7.446-7.446v2.808h8.21v9.15h-8.21v2.933z'/></g></svg>{{=T('You can move the map left, right up and down by moving a single finger on the screen.')}}",
        },
        "wait": 1000,
      },
      {
        "ott": "913935",
        "fly_in_speed": 0.4,
        "fly_in_visibility": "show_self",
        "update_class": {
             "title": "{{=T('Zooming')}}",
             "tour_container": {"style": {"top":"200px", "left":"350px"}},
             "window_text": "<svg style='float:right; margin:0 20px' xmlns='http://www.w3.org/2000/svg' height='109.288' width='79.985'><defs><clipPath id='a'><path d='M0 612h792V0H0z'/></clipPath></defs><g clip-path='url(#a)' transform='matrix(.66155 0 0 -.65108 -306.7 214.426)'><path fill='#878786' d='M579.858 213.479c-.093-1.008-.168-1.82-.209-2.365-.248-3.345-1.007-13.525-3.405-18.322-2.68-5.366-.954-12.2-.88-12.489l.062-.186c.482-1.174.312-2.53-.492-3.923-1.248-2.162-5.198-6.293-17.624-9.654-15.45-4.179-19.6.095-19.602.095-.325.405-32.482 40.694-36.886 59.756l-.061.198c-2.527 6.5-5.161 14.347-5.01 15.69.162 1.42-.066 3.845-.356 6.916-.448 4.753-1.282 13.602.6 15.377.133.123.193.106.266.107 1.91 0 3.493-.591 4.835-1.81 5.51-4.998 4.819-17.946 4.811-18.077l-.016-.272.09-.261c.168-.501 3.91-11.23 12.234-12.068-.567-4.157-1.203-6.113-1.216-6.154l1.779-.45 1.778-.453c.125.368 3.063 9.277 2.032 30.165-.339 6.85-1.264 14.08-2.08 20.458-1.32 10.303-2.961 23.125.147 23.94.669.173 1.22.12 1.798-.173 3.395-1.734 5.477-10.164 6.476-14.215l.652-2.614c3.16-12.715 7.984-30.336 13.359-36.54l2.966 1.926c-3.327 3.84-6.617 13.3-9.094 21.77 3.13.7 5.821.492 7.997-.647 2.7-1.416 4.143-4.003 4.593-5.953.885-3.829 5.33-17.463 5.518-18.04l3.568.872c-.04.125-3.643 11.177-5.04 16.225 7.61.455 9.514-6.064 9.71-6.839.79-3.148 6.028-15.47 6.252-15.994l3.478 1.11c-1.126 2.646-2.916 6.948-4.283 10.449 4.257-.537 6.562-4.34 8.998-9.165.673-1.336 1.308-2.597 1.993-3.594 2.252-3.284.754-19.476.262-24.796m2.927 26.434c-.568.826-1.158 2-1.786 3.24-2.301 4.563-5.712 11.299-13.63 11.165-.275.775-.483 1.411-.588 1.833-.989 3.932-5.1 10.22-14.245 9.31-.74 1.875-2.365 4.684-5.807 6.487-3.054 1.601-6.693 1.93-10.806 1.015-1.2 4.311-2.146 8.113-2.717 10.407l-.65 2.61c-1.732 7.011-3.793 14.047-8.22 16.308-1.46.746-3.105.912-4.755.48-6.06-1.587-4.746-11.843-2.76-27.365.811-6.328 1.73-13.5 2.062-20.242.423-8.565.156-15.07-.296-19.744-5.321.641-8.417 8.07-8.962 9.51.088 2.14.316 14.564-5.842 20.154-2.054 1.864-4.584 2.808-7.52 2.808h-.048c-1.14-.004-2.16-.4-2.951-1.147-2.76-2.602-2.365-9.31-1.565-17.808.252-2.678.491-5.207.361-6.34-.299-2.62 3.815-13.495 5.149-16.932 4.64-19.748 36.113-59.184 37.459-60.864.368-.455 3-3.315 10.743-3.315 3.32 0 7.581.527 13.004 1.994 13.048 3.53 17.989 8.084 19.835 11.283 1.225 2.12 1.477 4.361.713 6.323-.169.726-1.375 6.312.685 10.435 2.378 4.759 3.252 13.345 3.702 19.39.04.534.113 1.327.203 2.314 1.083 11.702 1.74 23.034-.768 26.69'/><path d='M538.295 329.338h-18.964l3.576-3.575-10.455-10.456 11.653-11.652 10.455 10.455 3.735-3.735zM463.61 254.653l18.964.002-3.576 3.575 10.455 10.454-11.652 11.652-10.456-10.454-3.734 3.735z'/></g></svg>{{=T('Touch the screen with two fingers: spread them apart to zoom in, pinch together to zoom out. Alternatively, you can use the on screen ‘+’ and ‘-’ buttons.')}}",
          },
          "wait": 500,
      },
      {
          "ott": "532117",
          "fly_in_visibility": "force_hide",
          "update_class": {
          "tour_container": {"style": {"top":"40vh", "left":"30vh"}},
              "title": "{{=T('Threat of extinction')}}",
              "window_text": "{{=T('Species known to be under threat of extinction are shown with red leaves. This information comes from the International Union for the Conservation of Nature (IUCN) Red List.')}}",
          },
          "wait": 20000
       },
       {
            "ott": "300553",
            "fly_in_visibility": "show_self",
            "update_class": {
                // put this near the search box
                "title": "{{=T('Searching for something?')}}",
                "tour_container": {"style": {"top": "90px", "left": "auto", "right":"300px"}},
                "window_text": "<svg style='float:left;margin:0 10px; xmlns='http://www.w3.org/2000/svg' height='40' width='40' viewBox='0 0 20 20'><circle r='7' cy='9' cx='9' stroke-width='1.1' stroke='#999' fill='none'/><path d='M14 14l4 4-4-4z' stroke-width='1.1' stroke='#999' fill='none'/><path d='M7.318 10.553c-1.086-.583-.818-1.554.07-2.155 1.018-.84 2.642-1.463 3.328-2.409.285-.71-1.304-1.416-2.565-1.096-.605.003-1.078.702-1.636.317-.298-.308.239-.621.775-.718 1.517-.318 3.498-.243 4.602.45.86.62.622 1.477-.032 2.117-.989.981-2.936 1.645-3.494 2.746-.128.43.8.775 1.55.67.614.272-.343.576-.864.528-.614-.096-1.278-.19-1.739-.45zM10.471 12.9c.1.938-1.704 1.493-2.428.74-.784-.64-.091-1.952 1.082-1.834.703.03 1.393.511 1.342 1.093z'/></svg>{{=T('You can click in the search box above to see some suggested popular places to visit or enter the name of something you specifically want to find in the tree of life.  There’s so much life out there you’ll be amazed what you can find.')}}",
                "outsidebox": {
                    "style":{"top":"60px", "right":"230px", "width":"80px", "height":"80px", "display":"block"},
                    "html":"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 43.561 43.152' height='80' width='80'><defs><marker id='a' orient='auto' overflow='visible'><path d='M-10.69-4.437L1.328-.017-10.69 4.401c1.92-2.61 1.909-6.18 0-8.84z' fill='#da0000' fill-rule='evenodd' stroke='#da0000' stroke-width='.6875' stroke-linejoin='round'/></marker></defs><path d='M67.042 130.23c24.897-5.443 33.074-12.871 40.09-40.076' fill='none' stroke='#da0000' stroke-width='1.223' marker-end='url(#a)' transform='translate(-66.524 -87.628)'/></svg>"}
            },
            "wait": 20000
       },
       {
            "ott": "237343",
            "fly_in_visibility": "force_hide",
            "fly_in_speed": 0.2,
            "transition_in": "fly_straight",
            "pos":"max",
            "update_class": {
                "title": "{{=T('Are you lost?')}}",
                "tour_container": {"style": {"top": "auto", "left": "300px", "bottom":"200px"}},
                "window_text": {
                    "style":{"min-height":"230px"},
                    "html":"<p><div style='float:left;margin:0 10px;border:1px solid grey;padding: 10px;border-radius: 5px;'><svg width='40' height='40' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg' data-svg='compass'><circle fill='none' stroke='#000' stroke-width='1.1' cx='9.5' cy='9.5' r='9'></circle><path d='m 9.5,3.5 -1.5,6 1.5,6 1.5,-6 z' fill='none' stroke='#000' stroke-linejoin='miter' stroke-miterlimit='8' transform='rotate(40 9.5 9.5)'></path><path d='m 9.5,3.5 -1.5,6 3,0 z' fill='#000' transform='rotate(40 9.5 9.5)'></path><path fill='none' stroke='#000' stroke-linecap='round' d='M 9.5,0.5 9.5,2'></path><path fill='none' stroke='#000' stroke-linecap='round' d='m 9.5,17 0,1.5'></path><path fill='none' stroke='#000' stroke-linecap='round' d='M 0.5,9.5 2,9.5'></path><path fill='none' stroke='#000' stroke-linecap='round' d='m 17,9.5 1.5,0'></path></svg></div>{{=T('The compass icon will show where you are in the complete tree of life. Select the named locations to zoom out and see more of the tree.')}}</p><p>{{=T('The reset icon will take you back to the start location,')}}<span style='float:left;margin:10px 10px;border:1px solid grey;padding: 10px;border-radius: 5px;'><svg width='40' height='40' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg' data-svg='refresh'><path fill='none' stroke='#000' stroke-width='1.1' d='M17.08,11.15 C17.09,11.31 17.1,11.47 17.1,11.64 C17.1,15.53 13.94,18.69 10.05,18.69 C6.16,18.68 3,15.53 3,11.63 C3,7.74 6.16,4.58 10.05,4.58 C10.9,4.58 11.71,4.73 12.46,5'></path><polyline fill='none' stroke='#000' points='9.9 2 12.79 4.89 9.79 7.9'></polyline></svg></span>{{=T('which should be familiar to you.')}}</p>"},
                "outsidebox": {
                    "style":{"bottom": "230px", "left": "80px", "height": "300px", "width": "230px", "display":"block"},
                    "html":"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 77.345 21.441' height='81.035' width='292.327'><defs><marker id='a' orient='auto' overflow='visible'><path d='M-10.69-4.437L1.328-.017-10.69 4.401c1.92-2.61 1.909-6.18 0-8.84z' fill='#da0000' fill-rule='evenodd' stroke='#da0000' stroke-width='.6875' stroke-linejoin='round'/></marker></defs><path d='M179.49 88.162c-28.549-1.475-38.364-5.2-75.533 18.396' fill='none' stroke='#da0000' stroke-width='1.223' marker-end='url(#a)' transform='translate(-102.177 -86.426)'/></svg><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 77.359 28.238' height='450' width='292.38'><defs><marker id='a' orient='auto' overflow='visible'><path d='M-10.69-4.437L1.328-.017-10.69 4.401c1.92-2.61 1.909-6.18 0-8.84z' fill='#da0000' fill-rule='evenodd' stroke='#da0000' stroke-width='.6875' stroke-linejoin='round'/></marker></defs><path d='M180.019 83.664c-16.642 15.194-43.655-3.876-76.062 22.894' fill='none' stroke='#da0000' stroke-width='1.223' marker-end='url(#a)' transform='translate(-102.298 -79.791)'/></svg>"}
            },
            "wait": 40000
        },
        {
            "ott": "229560",
            "fly_in_visibility": "show_self",
            "pos":"max",
            "update_class": {
                // put this near the common ancestor button
                "tour_container": {"style": {"top": "10px", "left": "auto", "right":"530px"}},
                "title": "{{=T('Detailed information on all life')}}",
                "window_text": "{{=T('Click on the text on any named leaf or branch to get further information about that species or group of species. We use specially treated wikipedia pages to provide information on well over a million species, and tens of thousands of groups')}}",
            },
            "wait": 8000,
            // Special for the tutorial only: open up a window
            "exec": function(tourstop) {
                tourstop.tour.onezoom.config.ui.openLinkouts();
                tourstop.tour.onezoom.config.ui.populateLinkouts(
                    {"data":{
                        "wiki": ["/tree/wikipedia_OZpage?Q=181537&embed=3&leaf=0&name=Amniota&wlang=en"]},
                     "name": "Amniota",
                     "ott": 229560,})
               setTimeout(() => {window.onezoom.config.ui.closeAll()}, 7000)
            }
        },
        {
            "ott": 691846,
            "update_class": {
                // have a hidden stop that allows us to fire off a mark some areas
                "tour_container": {"style": {"display":"None"}},
            },
            "wait": 200,
            "exec": function(tourstop) {
               tourstop.controller.mark_area(tourstop.data_repo.ott_id_map[691846]) //animals
               tourstop.controller.mark_area(tourstop.data_repo.ott_id_map[99252])  //plants
               setTimeout(() => {tourstop.controller.clear_all_marked_areas()}, 7000)
            }
       },
        {
            "ott": 99252,
            "fly_in_visibility": "show_self",
            "update_class": {
                // put this near the common ancestor button
                "tour_container": {"style": {"top": "10px", "left": "auto", "right":"530px"}},
                "title": "{{=T('Find common ancestors')}}",
                "window_text": "<div style='float:right;margin:0 20px;padding:8px;border:2px solid grey;border-radius:50%'><svg width='40' height='40' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'><circle fill='none' stroke='#000' stroke-width='1.2' cx='5.79' cy='2.79' r='1.79'></circle><circle fill='none' stroke='#000' stroke-width='1.2' cx='14.19' cy='2.79' r='1.79'></circle><ellipse fill='none' stroke='#000' stroke-width='1.2' cx='10.03' cy='16.79' rx='1.79' ry='1.79'></ellipse><path fill='none' stroke='#000' stroke-width='2' d='M5.79,4.57 L5.79,6.56 C5.79,9.19 10.03,10.22 10.03,13.31 C10.03,14.86 10.04,14.55 10.04,14.55 C10.04,14.37 10.04,14.86 10.04,13.31 C10.04,10.22 14.2,9.19 14.2,6.56 L14.2,4.57'></path></svg></div><p>{{=T('Next to the search button you can select the advanced search button. This will enable you to mark multiple places on the tree and find the most recent common ancestor of any set of species, such as animals and plants.')}}",
            },
            "wait": 2000,
       },
        {
            "ott": null, // If there is no OTT, or it is null, return to roughly the position when the tour was first started
            "fly_in_visibility": "show_self",
            "update_class": {
                "tour_container": {"style": {"top": "10px", "left": "auto", "right":"530px"}},
                "title": {"style": {"display":"None"}},
                "window_text": {
                    "style":{"text-align":"center", "padding":"1em"},
                    "html":"<p>We’re returning you to the rough location where you were before starting this tutorial.</p><h1>{{=T('Have fun exploring!')}}</h1>"},
                "tour_next": {
                    "style": {"visibility": "hidden"} // Prev button invisible for last stop
                    },
            },
       },
   ]
}