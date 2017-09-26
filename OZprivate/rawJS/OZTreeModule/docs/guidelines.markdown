If you want to modify OneZoom in a way that has not been provided for by provided by the web interface, then you will need to modify the javascript code within the OZTreeModule directory. This code is modularizing using ECMAscript 6 (ES6), according to the scheme below:

<img src='OZ_refactor_flow.svg' alt="Drawing" style="width: 100%;"/>

Each module is present in a different directory within `rawJS/OZTreeModule`. The modular structure aims to make the codebase more easily updateable, and allow for easy enhancement in the future. It should also provide a clear interface for other partners to use and modify OneZoom code. 


Possible future changes for OneZoom 
------------------------

2. Multiple theme support(with node metadata as parameter)
4. Support for more viewtype
5. Support for using webgl
6. Support for additional or different metadata


### Language package:

1. add_language_support (lang, language map)
2. select_language (lang)

### Theme package:

1. add_theme (name, theme object)
2. select_theme (name)


### Support for more viewtypes:

1. select_viewtype
2. add viewtype needs to add new way to do pre-calculation, new way to draw the node or leaf

### Support for webgl:

1. best to be independent of how to pre-calculation and how to re-calculation(drawreg)
2. be able to support both canvas 2d api and webgl api in case of browser incompatibility
3. possible implementation(need discussion): while drawing, node and leaves would output shapes in the following format:
  ```
  ["shape_type", "text", "sx", "sy", "ex", "ey", "stroke_or_fill"]
  ```

### Support for additional metadata:

1. Medadata has two kinds: one needs to be preprocessed and one does not need.
2. For one does not need preprocess it should be stored in metadata table.
3. For one need preprocess and has one to one map property then we can have a filter function for it and still hold it in metadata table
4. Otherwise store it in midnode object
5. Additional metadata may be displayed in nodes/leaves. It seems that there is no clear way to add these data and display them without diving into the code.(may discuss)


Possible Cooperator customization:
----------------------------

1. Different data source, different raw data format and hence different ways to parse data
2. Showing different contents on nodes
3. Different popup boxes or no popup boxes at all(different way for link click)
4. Add their own language
5. Add their own themes

### Different data source

1. feed by ajax or local
2. newick or other
3. node_detail/search .... apis would be different if use client's server
4. should we consider all of these now or there is no such possibility

### Showing different contents on nodes

1. Client might want charts, might use different data from biology data and hence different thing to display?

### Different popup boxes or no popup boxes at all(different way for link click)

1. Also related to should we allow users to design how to layout contents on a leaf and node
2. We should provide hooks for user to click to popup a different window.
3. should we set the same place as clickable or provide hooks for client to program as well. 




