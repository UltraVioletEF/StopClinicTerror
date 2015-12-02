var LIVERELOAD_PORT = 35729;
var SERVER_PORT = 4000;
var lrSnippet = require('connect-livereload')({port: LIVERELOAD_PORT});
var serveStatic = require('serve-static');
var mountFolder = function (connect, dir) {
    return serveStatic(require('path').resolve(dir));
};


module.exports = function (grunt) {
    grunt.initConfig({
        shell: {
            jekyllBuild: {
                command: 'jekyll build'
            }
        },
        connect: {
            options: {
                port: grunt.option('port') || SERVER_PORT,
                hostname: 'localhost',
            },
            livereload: {
                options: {
                    middleware: function (connect) {
                        return [
                            lrSnippet,
                            mountFolder(connect, '_site')
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
            tasks: ['shell:jekyllBuild'],
            options: {
                livereload: grunt.option('livereloadport') || LIVERELOAD_PORT
            },
          },
        }
    });

    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-shell');
    grunt.registerTask('default', ['shell', 'connect', 'watch']);
};