const marky = require('marky-markdown');
const Handlebars = require('handlebars');
const glob = require('glob');
const fs = require('fs');
const path = require('path');
const templateSource = fs.readFileSync(path.resolve(__dirname, '../src/', 'template.html')).toString();
const rssSourcePath = path.resolve(__dirname, '../src/', 'rss.xml');
const rssSource = fs.readFileSync(rssSourcePath).toString();
const nasty = require('nasty-json');
const pagesPath = path.resolve(__dirname, '../src/', 'pages');
const postsPath = path.resolve(__dirname, '../src/', 'posts');
const outputPath = path.resolve(__dirname, '../');
const async = require('async');
const mkdirp = require('mkdirp');
const moment = require('moment');
const reInfoSource = /^---([\S\s]*)---/;
require('datejs');

Handlebars.registerHelper('debug', function(optionalValue) {
  console.log('Current Context');
  console.log('====================');
  console.log(this);

  if (optionalValue) {
    console.log('Value');
    console.log('====================');
    console.log(optionalValue);
  }
});

Handlebars.registerHelper('first', function(context, block) {
  return block.fn(context[0]);
});

Handlebars.registerHelper('formatDate', function(context, block) {
  var f = block.hash.format || 'MMM Do, YYYY';
  return moment(context).format(f);
});

Handlebars.registerHelper('slice', function(context, block) {
  var ret = '',
      offset = parseInt(block.hash.offset) || 0,
      limit = parseInt(block.hash.limit) || 5,
      i = (offset < context.length) ? offset : 0,
      j = ((limit + offset) < context.length) ? (limit + offset) : context.length;

  for(i,j; i<j; i++) {
    ret += block.fn(context[i]);
  }

  return ret;
});

const template = Handlebars.compile(templateSource, {noEscape: true});
const rssTemplate = Handlebars.compile(rssSource, {noEscape: true});

const DATE_FIELDS = [
  'published',
];

const isNumeric = (n)=>{
  return !isNaN(parseFloat(n)) && isFinite(n);
};

const transformValue = (key, v)=>{
  if(isNumeric(v)){
    return +v;
  }
  if(DATE_FIELDS.includes(key)){
    return Date.parse(v);
  }
  if(/^(true|t|y|yes)$/i.exec(v)){
    return true;
  }
  if(/^(false|f|n|no)$/i.exec(v)){
    return false;
  }
  return v;
};

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

const loadPages = ({basePath, linkPath=''}, callback)=>{
  glob(`${basePath}/**/*.md`, (err, files)=>{
    let pages = [];
    const sortPages = ()=>{
      done(null, pages.sort((page1, page2)=>parseInt(page1.order)-parseInt(page2.order)));
    };
    const done = (err, pages)=>{
      callback(err, pages);
    };
    const initPage = (filename, next)=>{
      loadPage({basePath, linkPath, filename}, (err, settings)=>{
        pages.push(settings);
        return next();
      });
    };
    async.each(files, initPage, sortPages);
  });
};

const loadStaticPages = (callback)=>{
  loadPages({basePath: pagesPath}, callback);
};

const loadPosts = (callback)=>{
  loadPages({basePath: postsPath, linkPath: '/posts'}, (err, posts)=>{
    if(err){
      return callback(err);
    }
    return callback(null, posts
        .filter((post)=>post.published)
        .sort((post1, post2)=>post2.published.getTime()-post1.published.getTime()));
  });
};

const loadAll = (callback)=>{
  async.parallel([
    (done)=>loadStaticPages(done),
    (done)=>loadPosts(done),
  ], (err, [pages, posts])=>{
    if(err){
      return callback(err);
    }
    const nav = pages.filter((page)=>isNumeric(page.order));
    return callback(null, {nav, pages, posts});
  });
};

const processPages = (pkg)=>{
  const toProcess = pkg.pages.concat(pkg.posts);
  const done = ()=>{
    const rssContents = rssTemplate(pkg.posts);
    const rssDestPath = outputPath+'/rss.xml';
    console.log(rssSourcePath, '->', rssDestPath);
    fs.writeFile(rssDestPath, rssContents, ()=>{
      console.log('All done');
    });
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

loadAll((err, res)=>{
  if(err){
    console.error(err);
    return process.exit(1);
  }
  processPages(res);
});
