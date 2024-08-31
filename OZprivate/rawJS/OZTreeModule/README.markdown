#### Setup
```
#set environment path
open applications/OneZoom/private/appconfig.ini
oztree_module_dir = OZTree_module
oztree_dir = OZTree_unminified

#create symbolic link
cd applications/OneZoom/static/OZTreeModule
ln -s ../../OZprivate/rawJS/OZTreeModule/dist ./

#install grunt and babelify which are used to transpile es6 to es5
npm install
```



#### Transpiling ecmascript 6 javascript code into ecmascript 5:
```
grunt precompile_js
#or
grunt precompile_js_dev
```


#### Compiling documentation of several modules into one:
```
grunt precompile_docs
```


#### View documentation for onezoom development:
```
1. python web2py.py -i 127.0.0.1 -p 8000 -a pass
2. 127.0.0.1:8000/dev/DOCS
```
