"use strict";

const BigNumber = require('bignumber.js');
const ArrayHelper = artifacts.require("./base/ArrayHelper.sol");
const utils = require('./utils');

contract('ArrayHelper', function(accounts) {
  var arrayHelper;

  beforeEach(async () => {
    arrayHelper = await ArrayHelper.new();
  });

  describe('#arrayContainsAddress', () => {
    it('decide whether or not the given array contains given address', async () => {
      assert.equal(await arrayHelper.arrayContainsAddress.call(
        web3.eth.accounts, web3.eth.accounts[1]), true)

      assert.equal(await arrayHelper.arrayContainsAddress.call(
        web3.eth.accounts, web3.eth.accounts[2]), true)

      assert.equal(await arrayHelper.arrayContainsAddress.call(
        web3.eth.accounts, arrayHelper.address), false)
    });
  });
});
