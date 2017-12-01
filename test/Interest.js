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

  // TODO: Remove. I believe this is covered by Savigns.customerDeposit."should update the user's balance with interest since the last checkpoint"
  // @mason, verify ^^
  // describe('with interest', () => {
  //   describe('#getBalanceWithInterest', () => {
  //     it("should calculate cumulative interest", async () => {
  //       // % 5 interest paid out monthly for 10 years
  //       const precision = 10;
  //       const multiplyer = Math.pow(10, precision);
  //       const principal = new BigNumber(5000);
  //       const interestRate = new BigNumber(0.05);
  //       const payoutsPerTimePeriod = new BigNumber(12);
  //       const duration = 10;
  //       const currentTimestamp = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
  //       const timestamp = new BigNumber(currentTimestamp + moment(0).add(duration, 'years').unix());

  //       await ledger.setInterestRate(etherToken.address, interestRate * 100, payoutsPerTimePeriod);
  //       await utils.depositEth(ledger, etherToken, principal.times(multiplyer), web3.eth.accounts[1]);

  //       const balance = await ledger.getBalanceWithInterest(web3.eth.accounts[1], etherToken.address, timestamp);
  //       const expectedValue = utils.compoundedInterest({
  //         principal: principal,
  //         interestRate,
  //         payoutsPerTimePeriod,
  //         duration,
  //       }).toFixed(6);
  //       assert.equal((balance.valueOf()/multiplyer).toFixed(6), expectedValue);
  //     });
  //   });
  // });
});
