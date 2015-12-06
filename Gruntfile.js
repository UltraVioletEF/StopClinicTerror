var LIVERELOAD_PORT = 35729;
var SERVER_PORT = 4000;
var liveReload = require('connect-livereload')({port: LIVERELOAD_PORT});
var serveStatic = require('serve-static');
var mountFolder = function (connect, dir) {
    return serveStatic(require('path').resolve(dir));
};


module.exports = function (grunt) {
    // load all grunt tasks
    require('load-grunt-tasks')(grunt);
    
    grunt.initConfig({
        config: { site: '_site' },
        connect: {
            options: {
                port: grunt.option('port') || SERVER_PORT,
                hostname: grunt.option('host') || '0.0.0.0',
            },
            livereload: {
                options: {
                    middleware: function (connect) {
                        return [
                            liveReload,
                            mountFolder(connect, '<%= config.site %>')
                        ];
                    }
                }
            }
        },
        watch: {
          livereload: {
            files: [
                '_config.yml',
                '_includes/**',
                'index.html',
                'styles/**',
                'scripts/**',
            ],
            tasks: ['jekyll'],
            options: {
                livereload: grunt.option('livereloadport') || LIVERELOAD_PORT
            },
          },
        },
        jekyll: {
          dist: {
            options: {
              src: '.',
              dest: '<%= config.site %>',
              config: '_config.yml',
              safe: true
            }
          }
        },

        clean: {
            dist: ['.tmp', '<%= config.site %>/*'],
            server: '.tmp'
        },

        useminPrepare: {
            html: 'index.html',
            options: {
                dest: '<%= config.site %>'
            }
        },
        usemin: {
            html: ['<%= config.site %>/{,*/}*.html'],
            css: ['<%= config.site %>/styles/{,*/}*.css'],
            js: '<%= config.site %>/scripts/{,*/}*.{js,json}',
            options: {
                dirs: ['<%= config.site %>'],
                assetsDirs: ['<%= config.site %>', '<%= config.site %>/images'],
                patterns: {
                  js: [
                      [/(data\/.*?\.(?:json))/gm, 'Update the JS to reference our revved json'],
                      [/(images\/.*?\.(?:gif|jpeg|jpg|png|webp|svg))/gm, 'Update the JS to reference our revved images']
                  ]
                }
            }
        },
        rev: {
            dist: {
                files: {
                    src: [
                        '<%= config.site %>/data/{,*/}*.json',
                        '<%= config.site %>/scripts/{,*/}*.js',
                        '<%= config.site %>/styles/{,*/}*.css',
                        '<%= config.site %>/images/{,*/}*.{png,jpg,jpeg,gif,svg}',
                        '!<%= config.site %>/styles/fonts/{,*/}*.*' //exclude fonts
                    ]
                }
            }
        },
        buildcontrol: {
            options: {
              dir: '<%= config.site %>',
              commit: true,
              push: true,
              message: 'Built %sourceName% from commit %sourceCommit% on branch %sourceBranch%'
            },
            ghpages: {
              options: {
                remote: 'git@github.com:spacedogXYZ/StopClinicTerror.git',
                branch: 'gh-pages',
              }
            },
        }
    });

    grunt.registerTask('default', ['jekyll', 'connect', 'watch']);
    grunt.registerTask('build', [
        'clean:dist',
        'jekyll',
        'rev',
        'usemin'
    ]);
};