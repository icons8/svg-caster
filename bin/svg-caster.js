#!/usr/bin/env node

'use strict';

var
  Application = require('../lib/Application'),
  yargs = require('yargs'),

  argv = yargs
    .usage('Usage: $0 [options]')

    .describe('svg-font', 'Path to svg font file')
    .describe('svg-font-css', 'Path to svg font css file')
    .describe('svg-font-css-prefix', 'Prefix for icon names in font css file')
    .describe('svg', 'Path/Pattern to svg file/files')
    .describe('svg-set', 'Path/Pattern to svg set file/files')
    .describe('out-svg', 'Path to output svg files folder')
    .describe('out-svg-set', 'Path to output svg set file')
    .describe('shorty', 'Shortify output svg and svg sets')
    .describe('pretty', 'Prettify output svg and svg sets')

    .help('h')
    .alias('h', 'help')

    .example('$0 --svg-font ./font.svg --svg-font-css ./font.css --out-svg ./svg/', 'Convert svg font to svg files')
    .example('$0 --svg-font ./font.svg --svg "./svg/*.svg" --out-svg-set ./svg-sprite.svg', 'Convert svg font to svg set file')
    .example('$0 --svg-set "./one/*.svg" --svg-set "./two/*.svg" --out-svg-set ./out.svg', 'Convert multiple svg set files to one')

    .epilog('svg-caster (https://github.com/icons8/svg-caster)')
    .argv,

  options;

options = argv;

new Application(options).run();
