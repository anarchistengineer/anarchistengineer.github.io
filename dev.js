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
