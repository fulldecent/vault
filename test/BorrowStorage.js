"use strict";

const BigNumber = require('bignumber.js');
const BorrowStorage = artifacts.require("./storage/BorrowStorage.sol");
const utils = require('./utils');
const moment = require('moment');
const tokenAddrs = utils.tokenAddrs;

contract('BorrowStorage', function(accounts) {
  var borrowStorage;

  beforeEach(async () => {
    [borrowStorage] = await Promise.all([BorrowStorage.new()]);
    await borrowStorage.allow(web3.eth.accounts[0]);
  });

  describe('#addBorrowableAsset', () => {
    it("should add asset as borrowable", async () => {
      assert.equal((await borrowStorage.borrowableAsset.call(tokenAddrs.OMG)).valueOf(), false);

      await borrowStorage.addBorrowableAsset(tokenAddrs.OMG, {from: web3.eth.accounts[0]});

      assert.equal((await borrowStorage.borrowableAsset.call(tokenAddrs.OMG)).valueOf(), true);
    });

    it('should be idempotent');

    it("should emit event", async () => {
      await borrowStorage.addBorrowableAsset(tokenAddrs.OMG, {from: web3.eth.accounts[0]});

      await utils.assertEvents(borrowStorage, [
      {
        event: "NewBorrowableAsset",
        args: {
          asset: tokenAddrs.OMG
        }
      }]);
    });

    it("should be owner only", async () => {
      await utils.assertOnlyOwner(borrowStorage, borrowStorage.addBorrowableAsset.bind(null, tokenAddrs.OMG), web3);
    });
  });

  describe('#setMinimumCollateralRatio', () => {
    it("should change minimumCollateralRatio", async () => {
      await borrowStorage.setMinimumCollateralRatio(3, {from: web3.eth.accounts[0]});

      assert.equal((await borrowStorage.minimumCollateralRatio.call()).valueOf(), 3);
    });

    it("should emit event", async () => {
      await borrowStorage.setMinimumCollateralRatio(4, {from: web3.eth.accounts[0]});

      await utils.assertEvents(borrowStorage, [
      {
        event: "MinimumCollateralRatioChange",
        args: {
          newMinimumCollateralRatio: web3.toBigNumber('4')
        }
      }]);
    });

    it("should be owner only", async () => {
      await utils.assertOnlyOwner(borrowStorage, borrowStorage.setMinimumCollateralRatio.bind(null, 5), web3);
    });
  });

  describe('#borrowableAsset', async () => {
    it('checks if borrowable asset', async () => {
      assert.equal((await borrowStorage.borrowableAsset.call(tokenAddrs.OMG)).valueOf(), false);

      await borrowStorage.addBorrowableAsset(tokenAddrs.OMG, {from: web3.eth.accounts[0]});

      assert.equal((await borrowStorage.borrowableAsset.call(tokenAddrs.OMG)).valueOf(), true);
    });
  });

});
