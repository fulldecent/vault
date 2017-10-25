const BigNumber = require('bignumber.js');
const ETHSavingsAccount = artifacts.require("./ETHSavingsAccount.sol");
const utils = require('./utils');
const moment = require('moment');

const tokenTypes = {
  ETH: 0,
}

contract('ETHSavingsAccount', function(accounts) {
  var account;

  beforeEach(function() {
    return ETHSavingsAccount.new().then((instance) => {
      account = instance;
    });
  });

  describe('#deposit', () => {
    it("should increase the user's balance", async () => {
      await account.deposit({from: web3.eth.accounts[1], value: 100});
      const balance = await account.getBalance.call(web3.eth.accounts[1], tokenTypes.ETH);
      assert.equal(balance.valueOf(), 100);
    });

    it("should create debit and credit ledger entries", async () => {
      await account.deposit({from: web3.eth.accounts[1], value: 100});
      await utils.assertEvents(account, [
      {
        event: "LedgerEntry",
        args: {
          address_: web3.eth.accounts[1],
          debit: web3.toBigNumber('100')
        }
      },
      {
        event: "LedgerEntry",
        args: {
          address_: account.address,
          credit: web3.toBigNumber('100')
        }
      }
      ]);
    });
  });

  describe('#getBalanceWithInterest', () => {
    it.only("should calculate cumulative interest", async () => {
      // %0.05 interest paid out annually
      const precision = 10000;
      const principal = new BigNumber(100);
      const interestRate = new BigNumber(0.05);
      const payoutsPerTimePeriod = new BigNumber(12);
      const time = new BigNumber(1);
      account = await ETHSavingsAccount.new(interestRate * 100, payoutsPerTimePeriod)
      await account.deposit({from: web3.eth.accounts[1], value: principal});
      const balance = await account.getBalanceWithInterest.call(web3.eth.accounts[1], tokenTypes.ETH, time, precision);
      const expectedValue = utils.compoundedInterest({
        principal: principal.dividedBy(100),
        interestRate,
        payoutsPerTimePeriod,
        time,
      }).times(100).toFixed(0);
      assert.equal(balance.valueOf(), expectedValue);
    });
  });
});
