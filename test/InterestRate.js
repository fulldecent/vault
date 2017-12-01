const BigNumber = require('bignumber.js');
const InterestRate = artifacts.require("./Base/InterestRate.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

contract('InterestRate', function(accounts) {
  var interestRate;
  var etherToken;

  beforeEach(async () => {
    [interestRate, etherToken] = await Promise.all([InterestRate.new(), EtherToken.new()]);
  });

  describe('#setInterestRate', () => {
    it("should set interest rate", async () => {
      await interestRate.setInterestRate(etherToken.address, 500, {from: web3.eth.accounts[0]});

      const interestRate = await interestRate.getInterestRate.call(etherToken.address);
      assert.equal(interestRate, 500);
    });

    it("should emit event", async () => {
      await interestRate.setInterestRate(etherToken.address, 500, {from: web3.eth.accounts[0]});

      await utils.assertEvents(interestRate, [
      {
        event: "InterestRateChange",
        args: {
          asset: etherToken.address,
          interestRateBPS: web3.toBigNumber('500')
        }
      }]);
    });

    it("should be owner only", async () => {
      await utils.assertOnlyOwner(interestRate.setInterestRate.bind(null, etherToken.address, 500), web3);
    });
  });
});
