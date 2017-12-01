const BigNumber = require('bignumber.js');
const Interest = artifacts.require("./Base/Interest.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

contract('Interest', function(accounts) {
  var interest;
  var etherToken;

  beforeEach(async () => {
    [interest, etherToken] = await Promise.all([Interest.new(), EtherToken.new()]);
  });

  describe('#setInterestRate', () => {
    it("should set interest rate", async () => {
      await interest.setInterestRate(etherToken.address, 500, {from: web3.eth.accounts[0]});

      const interestRate = await interest.getInterestRate.call(etherToken.address);
      assert.equal(interestRate, 500);
    });

    it("should emit event", async () => {
      await interest.setInterestRate(etherToken.address, 500, {from: web3.eth.accounts[0]});

      await utils.assertEvents(interest, [
      {
        event: "InterestRateChange",
        args: {
          asset: etherToken.address,
          interestRateBPS: web3.toBigNumber('500')
        }
      }]);
    });

    it("should be owner only", async () => {
      await utils.assertOnlyOwner(interest.setInterestRate.bind(null, etherToken.address, 500), web3);
    });
  });
});
