module.exports = function(grunt) {
  grunt.registerTask('watchbuild', 'Rebuild files on file save', ['watch:build']);
  var microlibConfig = require('grunt-microlib').init.bind(this)(grunt);
  grunt.loadNpmTasks('grunt-microlib');

  var config = {
    pkg: grunt.file.readJSON('package.json'),
    env: process.env,

    cfg: {
      name: 'EasyIndexedDB',
      barename: 'eidb',
      namespace: 'EIDB'
    },

    watch: {
      build: {
        files: ['lib/**'],
        tasks: ['build']
      }
    }
  };

  grunt.initConfig(grunt.util._.merge(microlibConfig, config));
};
