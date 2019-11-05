module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    exec: {
      precompile_python: {
        // compile python to make it faster on the server and hence reduce server load.
        // this needs python 2 installed to work
        cwd: "../../",
        command: 'python2 -c "import gluon.compileapp; gluon.compileapp.compile_application(\'' + process.cwd() + '\', skip_failed_views=True)"'
      },
      test: {
        command: 'npm run test'
      },
      precompile_js: {
        command: 'npm run precompile_js' //command defined in package.json
      },
      precompile_js_dev: {
        command: 'npm run precompile_js_dev' //command defined in package.json
      },
      precompile_docs: {
        //put all markdown files referred to in OZTreeModule/docs/index.markdown in a single _compiled.markdown file
        //and substitute .png / svg images with data (base64 encoded for png) so they become embedded in the doc
        cwd: "OZprivate/rawJS/OZTreeModule/docs",
        command: "perl compile_docs.pl index.markdown > _compiled.markdown"
      },
      partial_install: {
        //See documentation in https://github.com/OneZoom/OZtree#onezoom-setup
        command: "perl -i OZprivate/ServerScripts/Utilities/partial_install.pl static/minlife.html"
      },
      partial_local_install: {
        //used for development only. This will create the minlife file as normal, but
        //using your local machine to source the page, rather than downloading the minlife
        //file from the main OneZoom server. This means that as well as local changes to
        //the treeviewer javascript, local changes you make to other files (such as
        // treeviewer/layout.html and treeviewer/UI_layer.load) will be incorporated
        //into the minlife tree. However, it assumes you have a local server running on
        //127.0.0.1:8000, and pics_dir = http://images.onezoom.org/ set in your appconfig.ini.
        //
        //See documentation in https://github.com/OneZoom/OZtree#onezoom-setup
        command: function (input_file, output_file) {
          if (!output_file) {
            // Only one argument supplied, assume input and output are the same
            output_file = input_file
          }
          return "curl -s 'http://127.0.0.1:8000/" + input_file + "' > static/" + output_file + ";" +
                 "perl -i OZprivate/ServerScripts/Utilities/partial_install.pl static/" + output_file + ";" +
                 "perl -i -pe 's|http://127.0.0.1:8000|http://beta.onezoom.org|g' static/" + output_file + ";";
        }
      }
    },
    jsdoc2md: {
      separateOutputFilePerInput: {
        files: [
          { expand: true,
            cwd: '<%=pkg.directories.js_src%>',
            src: '**/*.js', 
            dest: 'OZprivate/rawJS/OZTreeModule/docs/src',
            ext: '.md' }
        ]
      },
      withOptions: {
        options: {
          'heading-depth': 4,
          'global-index-format': 'none'
        }
      }
    },
    compass: {
      dist: {
        options: {
          sassDir: '<%=pkg.directories.css_src%>',
          cssDir: '<%=pkg.directories.css_dist%>',
          environment: 'development',
          outputStyle: 'compressed'
        }
      }
    },
    uglify: {
      main: {
        files: {
          //also moves the files
          '<%=pkg.directories.js_dest%>/common.js': ['<%=pkg.directories.js_dist%>/common.js'],
          '<%=pkg.directories.js_dest%>/search_ui.js': ['<%=pkg.directories.js_dist%>/search_ui.js'],
          '<%=pkg.directories.js_dest%>/OZentry.js': ['<%=pkg.directories.js_dist%>/OZentry.js'],
          //these "old" files only help with drawing leaves on the sponsor_leaf etc pages, and
          //can be ignored. They can be removed when https://github.com/OneZoom/OZtree/issues/28
          //is solved
          '<%=pkg.directories.old_js_dest%>/Drawing.js': ['<%=pkg.directories.old_js_dist%>/Drawing.js'],
          '<%=pkg.directories.old_js_dest%>/Leaf_draw.js': ['<%=pkg.directories.old_js_dist%>/Leaf_draw.js'],
        }
      }
    },
    clean: {
      build:[
        '<%=pkg.directories.js_dest%>/*',
        '<%=pkg.directories.js_dist%>/*.js*',
        //these "old" files only help with drawing leaves on the sponsor_leaf etc pages, and
        //can be ignored. They can be removed when https://github.com/OneZoom/OZtree/issues/28
        //is solved
        '<%=pkg.directories.old_js_dest%>/*',
        '<%=pkg.directories.old_js_dist%>/*.js*',
      ],
      compile:[
        '<%=pkg.directories.js_dest%>/*',
        '<%=pkg.directories.js_dist%>/*.js*',
        //these "old" files only help with drawing leaves on the sponsor_leaf etc pages, and
        //can be ignored. They can be removed when https://github.com/OneZoom/OZtree/issues/28
        //is solved
        '<%=pkg.directories.old_js_dest%>/*',
        '<%=pkg.directories.old_js_dist%>/*.js*',
      ],
    },
    compress: {
      main: {
        options: {
          mode: 'gzip'
        },
        files: [
          {
            expand: true,
            cwd: '<%=pkg.directories.js_dest%>',
            src: ['*.js'],
            dest: '<%=pkg.directories.js_dest%>',
            ext: '.js.gz'
          },
          { //quick hack for the fragments of old code
            //these "old" files only help with drawing leaves on the sponsor_leaf etc pages, and
            //can be ignored. They can be removed when https://github.com/OneZoom/OZtree/issues/28
            //is solved

            expand: true,
            cwd: '<%=pkg.directories.old_js_dest%>',
            src: ['*.js'],
            dest: '<%=pkg.directories.old_js_dest%>',
            ext: '.js.gz'
          },
          {
            expand: true,
            cwd: '<%=pkg.directories.css_dist%>',
            src: ['*.css'],
            dest: '<%=pkg.directories.css_dist%>',
            ext: '.css.gz'
          },
          {
            expand: true,
            cwd: '<%=pkg.directories.old_css_dest_and_dist%>',
            src: ['*.css'],
            dest: '<%=pkg.directories.old_css_dest_and_dist%>',
            ext: '.css.gz'
          }
        ]
      }
    },
    copy: {
      to_live: {
        files: [
          // includes files within path
          {expand: true, cwd: '<%=pkg.directories.js_dist%>', src: "**", dest: '<%=pkg.directories.js_dest%>/', filter: 'isFile'},
          {expand: true, cwd: '<%=pkg.directories.old_js_dist%>', src: "**", dest: '<%=pkg.directories.old_js_dest%>/', filter: 'isFile'},
        ]
      },
      //these "old" files only help with drawing leaves on the sponsor_leaf etc pages, and
      //can be ignored. They can be removed when https://github.com/OneZoom/OZtree/issues/28
      //is solved
      old_js: {
          expand: true, cwd: '<%=pkg.directories.old_js_src%>', src: '*.js', dest: '<%=pkg.directories.old_js_dist%>/', filter: 'isFile'
      },
    },
    curl: {
        'get_minlife': {
            //this should be changed to the production URL when live
            //src:'http://www.onezoom.org/treeviewer/minlife.html/?lang=' + grunt.option('lang') || '',
            src:'http://beta.onezoom.org/treeviewer/minlife.html',
            dest:'static/minlife.html',
        }
    }
  });

  grunt.loadNpmTasks("grunt-exec");
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-compass');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-jsdoc-to-markdown');
  grunt.loadNpmTasks('grunt-curl');

  grunt.registerTask("test", ["exec:test"]);
  grunt.registerTask("precompile-python", ["exec:precompile_python"]);
  grunt.registerTask("precompile-js", ["exec:precompile_js"]);
  grunt.registerTask("precompile-js_dev", ["exec:precompile_js_dev"]);
  grunt.registerTask("partial-install", ["curl:get_minlife", "exec:partial_install"]);
  grunt.registerTask("partial-local-install", [
    "compile",
    "exec:partial_local_install:life.html:minlife.html",
    "exec:partial_local_install:otop.html:minotop.html",
  ]);
  grunt.registerTask("precompile-docs", ["jsdoc2md", "exec:precompile_docs"]);
  grunt.registerTask("build", ["clean:build", "precompile-python", "precompile-js", "copy:old_js", "compass", "uglify", "compress", "precompile-docs"]);
  grunt.registerTask("compile", ["clean:compile", "precompile-js_dev", "copy:old_js", "compass" , "compress", "copy:to_live", "precompile-docs"]);
};
