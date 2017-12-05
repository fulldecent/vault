const BigNumber = require('bignumber.js');
const Loaner = artifacts.require("./Loaner.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

contract('Loaner', function(accounts) {
  var loaner;
  var etherToken;

  beforeEach(async () => {
    [loaner, etherToken] = await Promise.all([Loaner.new(2), EtherToken.new()]);
    await loaner.setAssetValue(etherToken.address, 1);
    await loaner.addLoanableAsset(etherToken.address);
  });
});
