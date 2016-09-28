---
title: Building a Static Site Generator
published: 9-28-2016
description: A little look at what it really takes to build a static site generator.  Do you really need Jekyll or similar for your simple site?
---
When I decided to start a site to put everything on I decided that I didn't want to run a complete CMS solution instead I wanted something simple and easy that worked with Markdown.

I looked at a lot of existing static site generators; Jekyll, GitBook, Hugo, Octopress, Metalsmith, Wintersmith, Docpad, and more.

What I kept running into was "I had a super simple HTML markup template, I had mardown files with my content, and I just wanted to generate the damned site from those!"  I didn't want to install a heavy weight framework, have built in workflow, and other wonderful magic (that you may want).  I wanted simple.  Was that too much to ask?  Apparently.

So, screw it, Anarchist Ahoy!  Let's build a static site generator.

## Taxonomy

*That's a fancy word for placing stuff where it belongs.*

I chose to put everything basically in the root of the repo, then have the publisher script create a folder called "site" that would then be pushed to the gh-pages branch in Github using subtree's.  This was after a LOT of reading and random finds on the good ol' Google.

The structure looks like:

 * fonts/ - Web fonts
 * images/ - Images
 * js/ - JavaScript source files, haven't needed this yet
 * pages/ - Holds the source Markdown for the pages
 * site/ - Generated site
 * solarized-dark-syntax/ - Syntax highlighter styles for code
 * style/ - Stylesheets
 * tools/ - Scripts and stuff

## Tooling

Ok, break out your terminal and favorite editor, its time to get to some code.

First we need to determine what exactly we want to do.  So in this case its take a simple HTML template file that uses Handlebars for fluffing out the actual page, grab a bunch of Markdown files from different directories (pages/ for pages, posts/ for posts), highlight any source code in those files, and publish them to a folder.

Great, we need libraries for Markdown parsing, handling Handlebars templates, and grabbing all the files.

 * [Glob](https://github.com/isaacs/node-glob) - That will grab the files based on a "glob"
 * [marky-markdown](https://github.com/npm/marky-markdown) - Markdown processor with built in code highlighting from NPM!
 * [Async](https://github.com/caolan/async) - Utility stuff
 * [mkdirp](https://github.com/substack/node-mkdirp) - Create directories recursively
 * [moment](https://github.com/moment/moment) - Displaying dates
 * [datejs](https://github.com/datejs/Datejs) - Date parsing
 * [node-http-server](https://github.com/RIAEvangelist/node-http-server) - Development mode!
 * [nodemon](https://github.com/remy/nodemon) - Development mode!
 * [glob-watcher](https://github.com/gulpjs/glob-watcher) - Development mode!

I'm going to use Node v6.3.0 and ES6 to build the generator.

## Getting setup

So first thing I did:

```sh
git init
npm init
{bla bla}
npm install --save glob marky-markdown async mkdirp moment datejs node-http-server nodemon glob-watcher
mkdir pages
mkdir posts
mkdir images
mkdir js
mkdir style
mkdir tools
git clone git@github.com:atom/solarized-dark-syntax.git
cd solarized-dark-syntax
git submodule init
git submodule update
cd ..
```

## Build script

Next up was to create the tools/build.sh script that would do all the work like removing the old site/ creating a new one, coping over images, fonts, JavaScript, and styles.  It would then need to compile the syntax highlighting styles and copy those over to the site/style/ folder.  No default styles ship with marky-markdown and it took me forever to figure out that you can basically use any syntax highlighter styles for Atom with marky-markdown.  Cool!

```sh
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
```

Yep, that looks about right.  Of course it took a couple tries to get it right, but I don't figure you care to see the failed attempts.

## Generator

Now we need a way to take our source files, collect a list, compile them, and put them in the output project.  Rather than dump the code for this beast on the page, I'll just link you to [tools/generator.js](https://github.com/anarchistengineer/anarchistengineer.github.io/blob/master/tools/generator.js)

There are a few key points that might be useful for you to understand though:

### loadPage

```js
const loadPage = ({basePath, linkPath, filename}, callback)=>{
  fs.readFile(filename, (err, buffer)=>{
    const source = buffer.toString();
    const infoSource = reInfoSource.exec(source);
    const pageContent = source.replace(reInfoSource, '').trim();
    const link = filename.replace(basePath, linkPath).replace(/\.md$/, '.html');
    const headerSettings = (infoSource?infoSource[1].trim().split('\n'):[]).map((s)=>{
      if(!s){
        return false;
      }
      if(s[0]==='#'){
        return false;
      }
      const segments = s.split(':');
      const key = (segments.shift()||'').trim();
      const value = transformValue(key, segments.join(':').trim());
      return {[key]: value};
    }).reduce((o, v)=>Object.assign({}, o, v), {order: false});
    const pageSettings = Object.assign({}, headerSettings, {sourcefile: filename, destinationfile: outputPath+link, link, source: pageContent})
    return callback(null, pageSettings);
  });
};
```

loadPage takes care of the dirty work of actually loading in a source Markdown file, reads in the settings associated with the file, and returns an object that contains all the settings and base content for the page.

One of the big workers here is transformValue, its job is to take a setting value, determine the type, and then return it cast as that type:

```js
const transformValue = (key, v)=>{
  if(isNumeric(v)){
    return +v;
  }
  if(DATE_FIELDS.includes(key)){
    return Date.parse(v);
  }
  if(/^(true|t|y|yes)$/i.exec(v)){
    return moment(v);
  }
  if(/^(false|f|n|no)$/i.exec(v)){
    return false;
  }
  return v;
};
```

### processPages

processPages is the workhorse that actually takes the source files, compiles them, merges them with the HTML template file, and then outputs the final file.

A key here is that we actually have to call Handlebars twice.  The first time is against the Markdown source to transform it and expand it for things like the posts listing.  Next the modified source gets ran through marky-markdown to create the output HTML.  Finally we take the template (created with Handlebars), combine it with the compiled HTML, and save out the final file.

```js
const processPages = (pkg)=>{
  const toProcess = pkg.pages.concat(pkg.posts);
  const done = ()=>{
    console.log('All done');
  }
  async.each(toProcess, (page, next)=>{
    console.log(page.sourcefile, '->', page.destinationfile);
    const pageContents = marky(Handlebars.compile(page.source, {noEscape: true})(Object.assign({}, pkg, {page})), {sanitize: false}).html();
    const pageSettings = Object.assign({}, page, {content: pageContents});
    const source = template(Object.assign({}, pkg, {page: pageSettings}));
    const folder = path.dirname(page.destinationfile);
    mkdirp(folder, ()=>{
      fs.writeFile(page.destinationfile, source, ()=>next);
      next();
    });
  }, done);
};
```

## Development

I wanted a way to work on the Anarchist Engineer site without having to actually deploy it to Github Pages.  So in with node-http-server, a simple dev.js script and a quick npm script:

```js
"scripts": {
  "dev": "tools/build.sh; nodemon dev"
},
```

Ok, we now have an NPM script to launch dev mode, we just need a server to serve the content.  26 lines of JavaScript later and [dev.js](https://github.com/anarchistengineer/anarchistengineer.github.io/blob/master/dev.js) was complete:

```js
const watcher = require('glob-watcher');
const fork = require('child_process').fork;
const server = require('node-http-server');
const path = require('path');

const build = (callback)=>{
  const child = fork('./tools/generator.js');
  child.on('close', ()=>callback());
};

const fileUpdated = (done)=>{
  build(()=>{
    done();
  });
};

watcher(['./pages/**/*.md', './posts/**/*.md', './index.html'], fileUpdated);
build(()=>{});

const config = new server.Config;

config.contentType.woff = 'application/x-font-woff';
config.port = 8080;
config.root = path.resolve(__dirname, 'site');

server.deploy(config);
```

This simple wrapper basically sets up a glob watcher to wait for files to change.  When they do it runs the generator.  Then it stands up a simple static server with a custom contentType for the woff Font File's, and serves everything up on 8080.  Not bad.

Sure, it could use some tweaks, but hey it works.

## Publishing script

For publishing I wanted to be able to pass in options like version, patch, minor, major increment, don't publish, don't build, etc...  So I started with a basic shell script I keep in Gist for just these types of things [publish.sh](https://gist.github.com/jdarling/ce7a6878e2177d89634e6b588d7906c3)

Then I tweaked it to fit the project needs:

```sh
#!/bin/bash

tools/build.sh

MAJOR=false
MINOR=false
PATCH=false
UPREV=false

THIS_FOLDER=`pwd`

PUSH=true
PUBLISH=true

Showhelp () {
  echo "./publish.sh <options>"
  echo ""
  echo "  Options"
  echo "    -h or --help - Show this screen"
  echo "    -v <version> or --version <version> - Set the version number explicitly"
  echo "    -M or --major - Increment Major version number, reset minor and patch"
  echo "    -m or --minor - Increment Minor version number, reset patch"
  echo "    -p or --patch - Increment Patch version number"
  echo "    --msg or --message - Set the commit message, if not supplied version will be used"
  echo "    --nopush - Don't push the changes to git"
  echo "    --nopublish - Don't publish on NPM"
  echo "    version - Output current version number"
  exit 0
}

while [[ $# > 0 ]]
do
  key="$1"
  case $key in
    -M|--major)
      MAJOR=true
      UPREV=true
    ;;
    -m|--minor)
      MINOR=true
      UPREV=true
    ;;
    -p|--patch)
      PATCH=true
      UPREV=true
    ;;
    -v|--version)
    VERSION="$2"
    shift
    ;;
    --msg|--message)
    MESSAGE="$2"
    shift
    ;;
    version)
    echo $VERSION
    exit
    ;;
    --nopush|--no-push)
    PUSH=false
    ;;
    --nopublish|--no-publish)
    PUBLISH=false
    ;;
    -h|--help)
    Showhelp
    ;;
    *)
    # unknown option
    ;;
  esac
  shift # past argument or value
done

git add .
git commit -m "$MESSAGE"

if [[ $ORIG_VERSION != $VERSION ]]; then
  npm version $VERSION
fi

if [[ $PUSH ]]; then
  echo "Pushing changes to git"
  git push origin master
fi

if [[ $PUBLISH && $ORIG_VERSION != $VERSION ]]; then
  read -p "Are you sure your ready to publish? (y/n) " -n 1 -r
  echo    # (optional) move to a new line
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git subtree push --prefix site origin gh_pages
  else
    echo "Ok try again when your ready"
  fi
fi

echo "Done"
```

## Done

Now all I have to do is create markdown files, put them in the proper folder, set a few attributes in the file headings and run my ./publish.sh script.  Few moments later, here ya go, a Github Pages site generated with my very own static site generator.

All the code is on github in the [anarchistengineer.github.io](https://github.com/anarchistengineer/anarchistengineer.github.io) project.

## Final thoughts

That's it.  A few hours worth of work and here we have a custom static site generator complete.  In fact it took me longer to write this post than it did the write the static site generator itself.

Would I do it all again, absolutely.  Would I use something like Jekyll, absolutely.  Just depends on your wants and needs.  In this case I had a want to give it a shot and a basic need to create a static site on Github Pages.

Until next time, hopefully you got something useful from this,
 * Anarchist Engineer
