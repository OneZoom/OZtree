OneZoom javascript documentation entry file is index.markdown. It includes documentation entries for each submodule by including '{{submodule.markdown}}'. 

We use flatdoc as the template to display our documentation. You can view our documentation by going to 127.0.0.1:8000/module_api.html. As you can see, this page contains three columns. The left is navigation bar which are the content table of our documentation. The middle part is the main body. The right part is further explanation of the middle part. 

To insert an entry in the left navbar, here are several ways to do it:
```
Main Entry 
==== ('=' > 4)

Sub Entry (Blue by default)
---- ('-' > 4) 

Sub title of Sub Entry
### (header larger than h3)
```

The content in between the titles will be displayed in the middle part. To make further explanation and let it appear in the right part, you can either insert code block like:  
\`\`\`  
[code block]  
\`\`\`

or you can use '>' to insert non-code examples:  
\> this is non code-example