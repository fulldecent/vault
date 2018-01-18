"use strict";

const BigNumber = require('bignumber.js');
const Ledger = artifacts.require("./Ledger.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

contract('Ledger', function(accounts) {
  var ledger;
  var etherToken;

  beforeEach(async () => {
    [ledger, etherToken] = await Promise.all([Ledger.new(), EtherToken.new()]);
  });

});
