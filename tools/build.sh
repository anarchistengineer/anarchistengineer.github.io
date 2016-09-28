#!/bin/bash

rm -rf site
mkdir site
cp -r fonts/ site/fonts/
cp -r images/ site/images/
cp -r js/ site/js/
cp -r style/ site/style/

rm -f style/syntax.css
cd solarized-dark-syntax/
node ../node_modules/.bin/lessc --include-path=styles index.less ../style/syntax.css
cd ..

node tools/generator.js
