const BigNumber = require('bignumber.js');
const Bank = artifacts.require("./Bank.sol");
const utils = require('./utils');
const moment = require('moment');

contract('Bank', function(accounts) {
  var bank;

  beforeEach(function() {
    return Bank.new().then((instance) => {
      bank = instance;
    });
  });
});
