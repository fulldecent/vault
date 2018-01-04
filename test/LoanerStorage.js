const BigNumber = require('bignumber.js');
const LoanerStorage = artifacts.require("./storage/LoanerStorage.sol");
const utils = require('./utils');
const moment = require('moment');
const tokenAddrs = utils.tokenAddrs;

contract('LoanerStorage', function(accounts) {
  var loanerStorage;

  beforeEach(async () => {
    [loanerStorage] = await Promise.all([LoanerStorage.new()]);
    await loanerStorage.allow(web3.eth.accounts[0]);
  });

  describe('#addLoanableAsset', () => {
    it("should add asset as loanable", async () => {
      assert.equal((await loanerStorage.loanableAsset.call(tokenAddrs.OMG)).valueOf(), false);

      await loanerStorage.addLoanableAsset(tokenAddrs.OMG, {from: web3.eth.accounts[0]});

      assert.equal((await loanerStorage.loanableAsset.call(tokenAddrs.OMG)).valueOf(), true);
    });

    it('should be idempotent');

    it("should emit event", async () => {
      await loanerStorage.addLoanableAsset(tokenAddrs.OMG, {from: web3.eth.accounts[0]});

      await utils.assertEvents(loanerStorage, [
      {
        event: "NewLoanableAsset",
        args: {
          asset: tokenAddrs.OMG
        }
      }]);
    });

    it("should be owner only", async () => {
      await utils.assertOnlyOwner(loanerStorage, loanerStorage.addLoanableAsset.bind(null, tokenAddrs.OMG), web3);
    });
  });

  describe('#setMinimumCollateralRatio', () => {
    it("should change minimumCollateralRatio", async () => {
      await loanerStorage.setMinimumCollateralRatio(3, {from: web3.eth.accounts[0]});

      assert.equal((await loanerStorage.minimumCollateralRatio.call()).valueOf(), 3);
    });

    it("should emit event", async () => {
      await loanerStorage.setMinimumCollateralRatio(4, {from: web3.eth.accounts[0]});

      await utils.assertEvents(loanerStorage, [
      {
        event: "MinimumCollateralRatioChange",
        args: {
          newMinimumCollateralRatio: web3.toBigNumber('4')
        }
      }]);
    });

    it("should be owner only", async () => {
      await utils.assertOnlyOwner(loanerStorage, loanerStorage.setMinimumCollateralRatio.bind(null, 5), web3);
    });
  });

  describe('#loanableAsset', async () => {
    it('checks if loanable asset', async () => {
      assert.equal((await loanerStorage.loanableAsset.call(tokenAddrs.OMG)).valueOf(), false);

      await loanerStorage.addLoanableAsset(tokenAddrs.OMG, {from: web3.eth.accounts[0]});

      assert.equal((await loanerStorage.loanableAsset.call(tokenAddrs.OMG)).valueOf(), true);
    });
  });

});
