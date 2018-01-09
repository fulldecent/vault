const BigNumber = require('bignumber.js');
const InterestRateStorage = artifacts.require("./storage/InterestRateStorage.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

contract('InterestRateStorage', function(accounts) {
  var interestRateStorage;
  var etherToken;

  beforeEach(async () => {
    [interestRateStorage, etherToken] = await Promise.all([InterestRateStorage.new(), EtherToken.new()]);
    await interestRateStorage.allow(web3.eth.accounts[0]);
  });

  describe('#setInterestRate', () => {
    it("should set interest rate", async () => {
      await interestRateStorage.setInterestRate(etherToken.address, 500, {from: web3.eth.accounts[0]});

      const rate = await interestRateStorage.getInterestRate.call(etherToken.address);
      assert.equal(rate, 500);
    });

    it("should emit event", async () => {
      await interestRateStorage.setInterestRate(etherToken.address, 500, {from: web3.eth.accounts[0]});

      await utils.assertEvents(interestRateStorage, [
      {
        event: "InterestRateChange",
        args: {
          asset: etherToken.address,
          interestRateBPS: web3.toBigNumber('500')
        }
      }]);
    });

    it("should be owner only", async () => {
      await utils.assertOnlyOwner(interestRateStorage, interestRateStorage.setInterestRate.bind(null, etherToken.address, 500), web3);
    });
  });
});
