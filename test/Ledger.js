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

  describe('with interest', () => {
    describe('#getBalanceWithInterest', () => {
      it("should calculate cumulative interest", async () => {
        // % 5 interest paid out monthly for 10 years
        const precision = 10;
        const multiplyer = Math.pow(10, precision);
        const principal = new BigNumber(5000);
        const interestRate = new BigNumber(0.05);
        const payoutsPerTimePeriod = new BigNumber(12);
        const duration = 10;
        const currentTimestamp = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
        const timestamp = new BigNumber(currentTimestamp + moment(0).add(duration, 'years').unix());

        await ledger.setInterestRate(etherToken.address, interestRate * 100, payoutsPerTimePeriod);
        await utils.depositEth(ledger, etherToken, principal.times(multiplyer), web3.eth.accounts[1]);

        const balance = await ledger.getBalanceWithInterest(web3.eth.accounts[1], etherToken.address, timestamp);
        const expectedValue = utils.compoundedInterest({
          principal: principal,
          interestRate,
          payoutsPerTimePeriod,
          duration,
        }).toFixed(6);
        assert.equal((balance.valueOf()/multiplyer).toFixed(6), expectedValue);
      });
    });
  });
});
