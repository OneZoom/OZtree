const fs = require('fs');
const sass = require('sass');
const process = require('process');
const path = require('path');

partial_install_site = "http://www.onezoom.org";
partial_local_install_site = "http://127.0.0.1:8000"; // if you are running a local installation
preferred_python3 = "python3.7"; // in case you have multiple python3 versions installed
web2py_py = path.join(path.dirname(path.dirname(process.cwd())), 'web2py.py');

/** Generate a function to execute a web2py script, handing over all arguments */
function exec_web2py_script(script_name, init_args) {
    return function () {
        return [
            preferred_python3,
            web2py_py,
            '-S OZtree/default',
            '-M',
            '-e',
            '-R', 'applications/OZtree/' + script_name,
            '--args',
            ...(init_args || []),
            ...arguments,
        ].join(' ');
    }
}

module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    exec: {
      compile_python: {
        // compile python to make it faster on the server and hence reduce server load.
        // should probably be run using the same python version as used to run web2py
        cwd: "../../",
        command:
                preferred_python3 + ' -c "import gluon.compileapp; gluon.compileapp.compile_application(\''
                + process.cwd()
                + '\', skip_failed_views=True)"'
            + ' || ' + // If python 3.7 isn't available, use the system-defined python3 instead
                'python3 -c "import gluon.compileapp; gluon.compileapp.compile_application(\''
                + process.cwd()
                + '\', skip_failed_views=True)"'
      },
      background_tasks: {
        cwd: "../../",
        command: exec_web2py_script("private/background_tasks.py"),
      },
      db_fixtures: {
        command: function () {
            // Either accept a list of test filenames, or work it out ourselves and run all tests
            var tests = arguments.length > 0 ? arguments : fs.readdirSync('tests/fixtures/').filter(function (x) {
                return x.match('^.*\.py');
            });

            return Array.prototype.map.call(tests, function (test_path) {
                return exec_web2py_script('tests/fixtures/' + test_path)();
            }).join(" && ");
        }
      },
      make_release_info: {
        command: 'git describe --tags > RELEASE_INFO && python3 OZprivate/ServerScripts/Utilities/get_release_name.py RELEASE_INFO >> RELEASE_INFO'
      },
      test_server: {
        command: function () {
            // Either accept a list of test filenames, or work it out ourselves and run all tests
            var tests = arguments.length > 0 ? arguments : fs.readdirSync('tests/unit/').filter(function (x) {
                return x.match('^test_.*\.py');
            });

            return Array.prototype.map.call(tests, function (test_path) {
                return exec_web2py_script('tests/unit/' + test_path)();
            }).join(" && ");
        }
      },
      test_server_functional: {
        command: 'nosetests3 tests/functional/'
      },
      test_client: {
        command: 'npm run test'
      },
      compile_js: {
        command: 'npm run compile_js' //command defined in package.json
      },
      compile_js_dev: {
        command: 'npm run compile_js_dev' //command defined in package.json
      },
      unify_docs: {
        //put all markdown files referred to in OZTreeModule/docs/index.markdown in a single _compiled.markdown file
        //and substitute .png / svg images with data (base64 encoded for png) so they become embedded in the doc
        cwd: "OZprivate/rawJS/OZTreeModule/docs",
        command: "perl compile_docs.pl index.markdown > _compiled.markdown"
      },
      convert_links_to_local: {
        // Any .html file in /static is fair game. See documentation in
        // https://github.com/OneZoom/OZtree#onezoom-setup
        command: 
            "python3 OZprivate/ServerScripts/Utilities/partial_install.py" +
            " --search " + partial_local_install_site + // replace local urls, for partial local install
            " --replace " + partial_install_site +
            " static/*.html"
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
    sass: {
      // SCSS -> CSS files
      options: {
        implementation: sass,
        sourceMap: true,
        outputStyle: 'compressed'
      },
      dist: {
         files: [{
             expand: true,
             cwd: '<%=pkg.directories.css_src%>',
             src: ['*.scss'],
             ext: '.css',
             dest: '<%=pkg.directories.css_dist%>'
         }]
      }
    },
    clean: [
        'compiled',
        '<%=pkg.directories.js_dest%>/*',
        '<%=pkg.directories.js_dist%>/*.js*',
    ],
    compress: {  // NB: the main tree viewer is compressed using webpack, not directly in grunt
      main: {
        options: {
          mode: 'gzip'
        },
        files: [
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
      prod: {
        files: [
          {expand: true, cwd: '<%=pkg.directories.js_dist%>', src: "**", dest: '<%=pkg.directories.js_dest%>/', filter: 'isFile'}
        ]
      },
      dev: {
        files: [
          {expand: true, cwd: '<%=pkg.directories.js_dist%>', src: "**", dest: '<%=pkg.directories.js_dest%>/', filter: 'isFile'}
        ]
      },
    },
    'curl-dir': {
        'get_minlife': {
            src: [
                partial_install_site + '/treeviewer/minlife.html', // TODO - add language specific option: /?lang=' + (grunt.option('lang') || ''),
                partial_install_site + '/treeviewer/minlife_tour.html' // TODO - add language specific option:
            ],
            dest:'static',
        },
        'get_local_minlife': {
            //used for development only. This will create the minlife file as normal, but
            //using your local machine to source the page, rather than downloading the minlife
            //file from the main OneZoom server. This means that as well as local changes to
            //the treeviewer javascript, local changes you make to other files (such as
            // treeviewer/layout.html and treeviewer/UI_layer.load) will be incorporated
            //into the minlife tree. However, it assumes you have a local server running on
            //127.0.0.1:8000, and pics_dir = http://images.onezoom.org/ set in your appconfig.ini.
            src: [
                partial_local_install_site + '/treeviewer/minlife.html',
                partial_local_install_site + '/treeviewer/minlife_tour.html',
            ],
            dest:'static',
        }
    }
  });

  grunt.loadNpmTasks("grunt-exec");
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-jsdoc-to-markdown');
  grunt.loadNpmTasks('grunt-curl');
  grunt.loadNpmTasks('grunt-sass');

  grunt.registerTask("make_release_info", ["exec:make_release_info"]);
  grunt.registerTask("test", ["exec:test_server", "exec:test_client"]);
  grunt.registerTask("test-client", ["exec:test_client"]);
  grunt.registerTask("test-server", ["exec:test_server"]);
  grunt.registerTask("test-server-functional", ["exec:test_server", "exec:test_server_functional"]);
  grunt.registerTask("css", ["sass"]);
  grunt.registerTask("docs", ["jsdoc2md", "exec:unify_docs"]);
  grunt.registerTask("compile-python", ["exec:compile_python"]);
  grunt.registerTask("compile-js", ["exec:compile_js"]);
  grunt.registerTask("compile-js_dev", ["exec:compile_js_dev"]);
  grunt.registerTask("partial-install",       ["compile-js", "css", "copy:dev", "curl-dir:get_minlife", "exec:convert_links_to_local"]);
  grunt.registerTask("partial-local-install", ["compile-js", "css", "copy:dev", "curl-dir:get_local_minlife", "exec:convert_links_to_local"]);
  grunt.registerTask("prod", ["clean", "compile-python", "compile-js", "css", "compress", "copy:prod", "make_release_info", "docs"]);
  grunt.registerTask("dev",  ["clean",               "compile-js_dev", "css", "compress", "copy:dev",  "make_release_info", "docs"]);
};
