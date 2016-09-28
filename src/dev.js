const watcher = require('glob-watcher');
const fork = require('child_process').fork;
const server = require('node-http-server');
const path = require('path');

const build = (callback)=>{
  const child = fork(path.resolve(__dirname, '../tools/generator.js'));
  child.on('close', ()=>callback());
};

const fileUpdated = (done)=>{
  build(()=>{
    done();
  });
};

watcher(['/pages/**/*.md', '/posts/**/*.md', '/template.html', '/rss.xml'].map((fileName)=>__dirname+fileName), fileUpdated);
build(()=>{});

const config = new server.Config;

config.contentType.woff = 'application/x-font-woff';
config.contentType.xml = 'text/xml';
config.port = 8080;
config.root = path.resolve(__dirname, '../');

server.deploy(config);
