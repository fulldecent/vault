const BigNumber = require('bignumber.js');
const Ledger = artifacts.require("./Ledger.sol");
const utils = require('./utils');
const moment = require('moment');

const tokenTypes = {
  ETH: 0,
}

contract('Ledger', function(accounts) {
  var ledger;

  beforeEach(function() {
    return Ledger.new().then((instance) => {
      ledger = instance;
    });
  });

  describe('#deposit', () => {
    it("should increase the user's balance", async () => {
      await ledger.deposit({from: web3.eth.accounts[1], value: 100});
      const balance = await ledger.getAccountBalanceRaw.call(web3.eth.accounts[1], tokenTypes.ETH);
      assert.equal(balance.valueOf(), 100);
    });

    it("should create debit and credit ledger entries", async () => {
      await ledger.deposit({from: web3.eth.accounts[1], value: 100});
      await utils.assertEvents(ledger, [
      {
        event: "LedgerEntry",
        args: {
          acct: web3.eth.accounts[1],
          debit: web3.toBigNumber('100')
        }
      },
      {
        event: "LedgerEntry",
        args: {
          acct: ledger.address,
          credit: web3.toBigNumber('100')
        }
      }
      ]);
    });
  });

  describe('#getBalanceWithInterest', () => {
    it("should calculate cumulative interest", async () => {
      // % 5 interest paid out monthly for 10 years
      const precision = 10;
      const multiplyer = Math.pow(10, precision);
      const principal = new BigNumber(5000);
      const interestRate = new BigNumber(0.05);
      const payoutsPerTimePeriod = new BigNumber(12);
      const duration = 10;
      const timeStamp = new BigNumber(moment().add(duration, 'years').unix());
      ledger = await Ledger.new(interestRate * 100, payoutsPerTimePeriod)
      await ledger.deposit({value: principal.times(multiplyer)});
      const balance = await ledger.getBalanceWithInterest.call(web3.eth.accounts[0], tokenTypes.ETH, timeStamp);
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
