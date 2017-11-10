var solc = require('solc');
const path = require('path');
const filePath = process.argv[2];
const fileName = path.basename(filePath);
const workingDirectory = path.dirname(filePath);
const _ = require("lodash");
const fs = require('fs');
const swarm = require("swarm-js").at("http://swarm-gateways.net");
const COMPILER_VERSION = "0.4.17+commit.bdeb9e52"

const readFiles = (dirname) => {
  const readDirPr = new Promise( (resolve, reject) => {
    fs.readdir(dirname,
      (err, filenames) => (err) ? reject(err) : resolve(filenames))
  });

  return readDirPr.then( filenames => Promise.all(filenames.map((filename) => {
    return new Promise ( (resolve, reject) => {
      console.log("reading " + filename)
      fs.readFile(dirname + "/" + filename, 'utf-8',
        (err, content) => (err) ? reject(err) : resolve([path.resolve(dirname + "/" + filename), content]));
    })
  })).catch(Promise.reject))
};

console.log(workingDirectory);
readFiles(workingDirectory)
  .then( allContents => {
    const input = _.fromPairs(allContents);
    console.log(input);
    var output = solc.compile({ sources: input }, 1)
    console.log(output)
    var metadata = JSON.parse(output.contracts[`${path.resolve(filePath)}:${fileName.replace(/.sol$/, '')}`].metadata);
    var compiler = metadata.compiler;
    compiler.version = COMPILER_VERSION;
    metadata.compiler = compiler;
    console.log(JSON.stringify(metadata));
    swarm.upload(JSON.stringify(metadata)).then(hash => {
        console.log("Uploaded file. Address: ", hash);
    });
  }, error => console.log(error));
