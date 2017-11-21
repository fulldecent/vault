var solc = require('solc');
const path = require('path');
const filePath = process.argv[2];
const fileName = path.basename(filePath);
const workingDirectory = path.dirname(filePath);
const _ = require("lodash");
const fs = require('fs');
var recursiveReaddir = require("recursive-readdir");
const swarm = require("swarm-js").at("http://swarm-gateways.net");
const COMPILER_VERSION = "0.4.18+commit.9cf6e910"

const readFiles = (dirname) => {
  const readDirPr = new Promise( (resolve, reject) => {
    fs.readdir(dirname,
      (err, filenames) => (err) ? reject(err) : resolve(filenames))
  });

  return recursiveReaddir(dirname).then( filenames => Promise.all(filenames.map((filename) => {
    return new Promise ( (resolve, reject) => {
      console.log("reading " + filename)
      fs.readFile(filename, 'utf-8',
        (err, content) => (err) ? console.log(err) : resolve([path.resolve(filename), content]));
    })
  })).catch(Promise.reject))
};

readFiles(workingDirectory)
  .then( allContents => {
    const input = _.fromPairs(allContents);
    console.log(input);
    var output = solc.compile({ sources: input }, 0)
    console.log(output.contracts)
    var metadata = JSON.parse(output.contracts[`${path.resolve(filePath)}:${fileName.replace(/.sol$/, '')}`].metadata);
    var compiler = metadata.compiler;
    compiler.version = COMPILER_VERSION;
    metadata.compiler = compiler;
    console.log(JSON.stringify(metadata));
    swarm.upload(JSON.stringify(metadata)).then(hash => {
        console.log("Uploaded file. Address: ", hash);
    });
  }, error => console.log(error));
