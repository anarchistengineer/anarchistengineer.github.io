#!/bin/bash

rm -rf posts/
rm -rf pages/

rm -f style/syntax.css
cd solarized-dark-syntax/
node ../node_modules/.bin/lessc --include-path=styles index.less ../style/syntax.css
cd ..

node tools/generator.js
