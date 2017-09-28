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
      install_restricted: {
        command: "perl -i OZprivate/ServerScripts/Utilities/install_restricted.pl static/minlife.html"
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
          //'<%=pkg.directories.js_dist%>/polytomy.min.js': ['<%=pkg.directories.js_dist%>/polytomy.js'],
          //'<%=pkg.directories.js_dist%>/at.min.js': ['<%=pkg.directories.js_dist%>/at.js'],
          //'<%=pkg.directories.js_dist%>/life.min.js': ['<%=pkg.directories.js_dist%>/life.js'],
          '<%=pkg.directories.js_dist%>/common.min.js': ['<%=pkg.directories.js_dist%>/common.js'],
          '<%=pkg.directories.js_dist%>/OZentry.min.js': ['<%=pkg.directories.js_dist%>/OZentry.js'],
          '<%=pkg.directories.old_js_dist%>/Drawing.min.js': ['<%=pkg.directories.old_js_dist%>/Drawing.js'],
          '<%=pkg.directories.old_js_dist%>/Leaf_draw.min.js': ['<%=pkg.directories.old_js_dist%>/Leaf_draw.js'],
        }
      }
    },
    clean: {
      build:[
        '<%=pkg.directories.js_dest%>/*',
        '<%=pkg.directories.js_dist%>/*.js*',
        '!<%=pkg.directories.js_dist%>/*.min.js*',
        '<%=pkg.directories.old_js_dest%>/*',
        '<%=pkg.directories.old_js_dist%>/*.js*',
        '!<%=pkg.directories.old_js_dist%>/*.min.js*',
      ],
      compile:[
        '<%=pkg.directories.js_dest%>/*',
        '<%=pkg.directories.js_dist%>/*.min.js*',
        '<%=pkg.directories.old_js_dest%>/*',
        '<%=pkg.directories.old_js_dist%>/*.min.js*',
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
            cwd: '<%=pkg.directories.js_dist%>',
            src: ['*.min.js'],
            dest: '<%=pkg.directories.js_dist%>',
            ext: '.min.js.gz'
          },
          { //quick hack for the fragments of old code
            expand: true,
            cwd: '<%=pkg.directories.old_js_dist%>',
            src: ['*.min.js'],
            dest: '<%=pkg.directories.old_js_dist%>',
            ext: '.min.js.gz'
          },
          {
            expand: true,
            cwd: '<%=pkg.directories.css_dist%>',
            src: ['*.min.css'],
            dest: '<%=pkg.directories.css_dist%>',
            ext: '.min.css.gz'
          },
          {
            expand: true,
            cwd: '<%=pkg.directories.css_dist%>',
            src: ['*.css', '!**/*.min.css'],
            dest: '<%=pkg.directories.css_dist%>',
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
      old_js: {
          expand: true, cwd: '<%=pkg.directories.old_js_src%>', src: '*.js', dest: '<%=pkg.directories.old_js_dist%>/', filter: 'isFile'
      },
    },
    curl: {
        'get_restricted': {
            //this should be changed to the production URL when live
            //src:'http://www.onezoom.org/minlife.html/?lang=' + grunt.option('lang') || '',
            src:'http://beta.onezoom.org/static/minlife.html',
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

  grunt.registerTask("precompile-python", ["exec:precompile_python"]);
  grunt.registerTask("precompile-js", ["exec:precompile_js"]);
  grunt.registerTask("precompile-js_dev", ["exec:precompile_js_dev"]);
  grunt.registerTask("install-restricted", ["curl:get_restricted", "exec:install_restricted"]);
  grunt.registerTask("precompile-docs", ["jsdoc2md", "exec:precompile_docs"]);
  grunt.registerTask("build", [ "precompile-python", "precompile-js", "copy:old_js", "compass","uglify", "compress", "clean:build", "copy:to_live","precompile_docs"]);
  grunt.registerTask("compile", ["precompile-js_dev", "copy:old_js", "compass" ,"clean:compile", "copy:to_live", "precompile-docs"]);
};
