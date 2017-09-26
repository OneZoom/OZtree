function FunctionMap(functionName, argument) {
	switch(functionName) {
	case "form_change": 
		form_change_aux(argument);
		break;
	case "signpost_change":
		signpost_change();
		break;
	case "font_change":
		font_change_aux(argument);
		break;
	case "polytype_change":
		polytype_change_aux(argument);
		break;
	case "leaftype_change":
		leaftype_change_aux(argument);
		break;
	case "int_highlight_change":
		int_highlight_change_aux(argument);
		break;
	case "name_change":
		name_change();
		break;
	case "colour_change":
		colour_change_aux(argument);
		break;
	case "change_background_color":
		change_background_color(argument);
		break;
	case "highlight_color1":
		change_highlight_color1(argument);
		break;
	case "highlight_color2":
		change_highlight_color2(argument);
		break;
	case "leaf_color1":
		change_leaf_color1(argument);
		break;
	case "leaf_color2":
		change_leaf_color2(argument);
		break;
	case "branch_color1":
		change_branch_color1(argument);
		break;
	case "branch_color2":
		change_branch_color2(argument);
		break;
	case "text_color":
		change_text_color(argument);
        break;
	default:
			break;
	}
}


var selections = [
	{   "name": "View",
	
		"visible" :[
			{"type": "radio", 
			 "name": "view", 
			 "options": [
			             {"name" : "spiral", "value" : "1", "click": "form_change", "checked": "true"},
			             {"name" : "natural", "value" : "2", "click": "form_change"},
			             {"name" : "feather", "value" : "3", "click": "form_change"},
			             {"name" : "ballanced", "value" : "4", "click": "form_change"},
			             ]
			},
			
			{"type": "checkbox",
			 "name": "signs",
			 "options": [
			             {"name" : "draw signposts",
			            	 "checked": "true", "click": "signpost_change"},
			             ]
			},
			
			{"type": "checkbox", 
			 "name": "common", 
			 "options": [
			             {"name" : "use common name",
			            	 "checked":"true", "click": "name_change"},
			             ]
			},
		],
		
		"additional" :[
//            {"type": "radio",
//             "name": "polytomy",
//             "options": [
//                         {"name": "polytomy highlight", "value":"1", "checked": "false", "click": "polytype_change"},
//                         {"name": "polytomy blank", "value":"2", "checked": "false", "click": "polytype_change"},
//                         {"name": "ignore polytomies", "value":"3", "checked": "true", "click": "polytype_change"},
//                         ]
//            },
			{"type": "select",
             "name": "polytomy",
             "change": "polytype_change",
             "options": [
                         {"name": "ignore polytomies", "value":"3"},
                         {"name": "polytomy highlight", "value":"1"},
                         {"name": "polytomy blank", "value":"2"},
                         ]
            },
            
            {"type": "radio",
             "urlname":"ltype",
             "display_name": "leaf type",
             "name": "leaf_type",
             "options": [
                         {"name": "cricle","value":"1",
                        	 "checked": "false", "click": "leaftype_change"},
    
                         {"name": "leaf","value":"2",
                        	 "checked": "true", "click": "leaftype_change"},
                         ]
               },
               
           {"type": "radio",
            "urlname": "hltype",
            "display_name": "highlight type",
            "name": "highlight_type",
            "options": [
                        {"name": "circle", "value": "1",
                        	"checked": "false", "click": "int_highlight_change"},
      
                        {"name": "arrow", "value": "2",
                        	"checked": "true", "click": "int_highlight_change"},
                       ]
              },
            
            {"type": "select",
             "name": "font",
             "change": "font_change",
             "options": [
                         {"name" : "Helvetica", "value": "helvetica"},
                         {"name" : "Times new roman", "value": "times new roman"},
                         {"name" : "Lucida console", "value": "lucida console"},
                         {"name" : "Courier new", "value": "courier new"},
                         {"name" : "Arial", "value": "arial"},
                         {"name" : "Itatic", "value": "itatic"},
                         {"name" : "Verdana", "value": "verdana"},
                         ]
            },
			
		]
	},
	
	{	
		"name": "colours",
		"display_name": "Colours (optional)",
	
		"visible" :[
			{"type": "select",
			"display_name": "colours",
			"name": "colour", 
			"change": "colour_change",
			"options": [
			             {"name" : "conservation", "value" : "3"},
			             {"name" : "brown", "value" : "1"},
			             {"name" : "date", "value" : "2"},
			             {"name" : "customize", "value": "-1", "disable": "true"},
			             ]
			},
		],
		
		"additional" :[
			{"type" : "color",
			 "display_name": "background color",
			 "name" : "background_color",
			 "urlname": "bgcol",
			 "change": "change_background_color",
			 "original": "rgb(220,235,255)",
			},
			
			{"type" : "color",
			 "display_name": "highlight color 1",
			 "name" : "highlight_color1",
			 "urlname": "h1col",
			 "change": "highlight_color1",
			 "original": "rgb(0,0,0)",
			},
				
			{"type" : "color",
			 "display_name": "highlight color 2",
			 "name" : "highlight_color2",
			 "urlname": "h2col",
			 "change": "highlight_color2",
			 "original": "rgb(0,0,0)",
			},
			
			{"type" : "color",
			 "display_name": "leaf color 1",
			 "name" : "leaf_color1",
			 "urlname": "l1col",
			 "change": "leaf_color1",
			 "original": "rgb(0,0,0)",
			},
			
			{"type" : "color",
			 "display_name": "leaf color 2",
			 "name" : "leaf_color2",
			 "urlname": "l2col",
			 "change": "leaf_color2",
			 "original": "rgb(0,0,0)",
			},
			
			{"type" : "color",
			 "display_name": "branch color 1",
			 "name" : "branch_color1",
			 "urlname": "b1col",
			 "change": "branch_color1",
			 "original": "rgb(0,0,0)",
			},
			
			{"type" : "color",
			 "display_name": "branch color 2",
			 "name" : "branch_color2",
			 "urlname": "b2col",
			 "change": "branch_color2",
			 "original": "rgb(0,0,0)",
			},
			
			{"type" : "color",
			 "display_name": "text color",
			 "name" : "text_color",
			 "urlname": "txtcol",
			 "change": "text_color",
			 "original": "rgb(0,0,0)",
			},
		]
	},
	
	{	"display_name": "Animations (optional)",
		"name": "animation",
		"visible" :[
	            {"type": "radio", 
	            "name": "init", 
	            "options": [
	            	    {"name" : "long fly", "value" : "1", "checked": "true"},
			            {"name" : "short fly", "value" : "2"},
			            {"name" : "jump", "value" : "3"},
			            {"name" : "grow", "value" : "4"},
			            ]
	            },
	            
	            {
	            	"type": "combination",
	            	"name": "First species or taxa",
	            	"options": [
	            	            {"name": "Genus",
	            	            	"options":[
												{"type": "text",
											     "name": "genus",
												}
	            	            	           ]
	            	            },
	            	            
	            	            {"name": "Taxa",
	            	            	"options":[
												{"type": "text",
											     "name": "taxa",
												}
	            	            	           ]
	            	            },
	            	            
	            	            {"name": "Genus and species",
	            	            	"options":[
												{"type": "text",
												 "name": "genus",
												},
												
												{"type": "text",
												 "name": "species"
												}  	           
	            	            	           ]
	            	            }
	            	            ]
	            },
	            
	            {
	            	"type": "combination",
	            	"name": "Second species or taxa (optional)",
	            	"options": [
	            	            {"name": "Genus",
	            	            	"options":[
												{"type": "text",
												 "display_name": "genus",
											     "name": "genus2",
												}
	            	            	           ]
	            	            },
	            	            
	            	            {"name": "Taxa",
	            	            	"options":[
												{"type": "text",
												 "display_name": "taxa",
											     "name": "taxa2",
												}
	            	            	           ]
	            	            },
	            	            
	            	            {"name": "Genus and species",
	            	            	"options":[
												{"type": "text",
												 "display_name": "genus",
												 "name": "genus2",
												},
												
												{"type": "text",
												 "display_name": "species",
												 "name": "species2"
												}  	           
	            	            	           ]
	            	            }
	            	            ]
	            }
		],
		    		
		"additional" :[
		    			
		]		
	},
	
	{	"display_name": "Your website (optional)",
		"name": "your_website",
		"visible" :[
			{
				"type": "text", 
				"display_name": "URL",
				"name": "url"
			},
			
			{
				"type": "text",
				"display_name": "Name",
				"name": "name"
			},
			
			{
				"type": "text",
				"urlname": "logo",
				"name": "Logo_URL",
				"display_name": "Logo URL",
			},
		],
		    		
		"additional" :[
		    			
		]
	}
];

var previousId = "init_type";