# SVG Caster

SVG font to SVG converter

```shell
npm install -g svg-caster
svg-caster -h
```

```
Usage: svg-caster [options]

Options:
  --svg-font             Path to SVG font file
  --svg-font-css         Path to SVG font CSS file
  --svg-font-css-prefix  Prefix for icon names in font CSS file
  --svg                  Path/Pattern to SVG file/files
  --svg-set              Path/Pattern to SVG set file/files
  --out-svg              Path to output SVG files folder
  --out-svg-set          Path to output SVG set file
  --svgo                 Optimize SVG with SVGO
  --pretty               Prettify output SVG and SVG sets
  --name-parser          Name formatter parser regular expression pattern
  --name-replace         Name formatter replace regular expression pattern
  --name-replacement     Name formatter replacement
  --name-lower           Name lower case formatter
  --id-uniquify          Uniquify identificators for insert into DOM
  -h, --help             Show help

Examples:
  svg-caster --svg-font ./font.svg          Convert SVG font to SVG files
  --svg-font-css ./font.css --out-svg ./
  svg/
  svg-caster --svg-font ./font.svg          Convert SVG font to SVG set file
  --svg "./svg/*.svg" --out-svg-set ./svg-
  sprite.svg
  svg-caster --svg-set "./one/*.svg"        Convert multiple SVG set files to
  --svg-set "./two/*.svg" --out-svg-set     one
  ./out.svg
  svg-caster --svg "./material-             Convert google material design icons
  design-icons/*/svg/production/*24px.svg"  to SVG set
  --out-svg-set "./material-design-icons
  .svg" --pretty --svgo --name-parser "^
  ic_(.*?)_24px$" --name-replace="_" --
  name-replacement="-"

svg-caster (https://github.com/icons8/svg-caster)
```

Enjoy!
