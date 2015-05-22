#!/usr/bin/env node

'use strict';

var
  Application = require('../lib/Application'),
  yargs = require('yargs'),

  argv = yargs
    .usage('Usage: $0 [options]')

    .describe('svg-font', 'Path to SVG font file')
    .describe('svg-font-css', 'Path to SVG font CSS file')
    .describe('svg-font-css-prefix', 'Prefix for icon names in font CSS file')
    .describe('svg', 'Path/Pattern to SVG file/files')
    .describe('svg-set', 'Path/Pattern to SVG set file/files')
    .describe('out-svg', 'Path to output SVG files folder')
    .describe('out-svg-set', 'Path to output SVG set file')
    .describe('svgo', 'Optimize SVG with SVGO')
    .describe('pretty', 'Prettify output SVG and SVG sets')

    .help('h')
    .alias('h', 'help')

    .example('$0 --svg-font ./font.svg --svg-font-css ./font.css --out-svg ./svg/', 'Convert SVG font to SVG files')
    .example('$0 --svg-font ./font.svg --svg "./svg/*.svg" --out-svg-set ./svg-sprite.svg', 'Convert SVG font to SVG set file')
    .example('$0 --svg-set "./one/*.svg" --svg-set "./two/*.svg" --out-svg-set ./out.svg', 'Convert multiple SVG set files to one')

    .epilog('svg-caster (https://github.com/icons8/svg-caster)')
    .argv,

  options;

options = argv;

new Application(options).run();
