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
      // % 5 interest paid out monthly for 10 years
      const precision = 10;
      const multiplyer = Math.pow(10, precision);
      const principal = new BigNumber(5000);
      const interestRate = new BigNumber(0.05);
      const payoutsPerTimePeriod = new BigNumber(12);
      const duration = 10;
      const timeStamp = new BigNumber(moment().add(duration, 'years').unix());
      account = await ETHSavingsAccount.new(interestRate * 100, payoutsPerTimePeriod)
      await account.deposit({value: principal.times(multiplyer)});
      const balance = await account.getBalanceWithInterest.call(web3.eth.accounts[0], tokenTypes.ETH, timeStamp);
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
