const BigNumber = require('bignumber.js');
const Bank = artifacts.require("./Bank.sol");
const utils = require('./utils');
const moment = require('moment');

const tokenTypes = {
  ETH: 0,
}

contract('Bank', function(accounts) {
  var bank;

  beforeEach(function() {
    return Bank.new().then((instance) => {
      bank = instance;
    });
  });

  it("sets the owner", async () => {
    const owner = await bank.getOwner.call();
    assert.equal(owner, web3.eth.accounts[0]);
  });

  describe('#deposit', () => {
    it("should increase the user's balance", async () => {
      await bank.deposit({from: web3.eth.accounts[1], value: 100});
      const balance = await bank.getBalance.call(web3.eth.accounts[1], tokenTypes.ETH);
      assert.equal(balance.valueOf(), 100);
    });

    it("should set the lastEntryTimestamp", async () => {
      await bank.deposit({from: web3.eth.accounts[1], value: 100});
      const lastEntryTimestamp = await bank.getLastEntryTimestamp.call(web3.eth.accounts[1], tokenTypes.ETH);
      assert.closeTo(lastEntryTimestamp.toNumber(), moment().unix(), 3);
    });


    it("should create debit and credit ledger entries", async () => {
      await bank.deposit({from: web3.eth.accounts[1], value: 100});
      await utils.assertEvents(bank, [
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
          address_: bank.address,
          credit: web3.toBigNumber('100')
        }
      }
      ]);
    });
  });

  describe('#withdrawl', () => {
    describe('if you have enough funds', () => {
      it("should decrease the user's balance", async () => {
        await bank.deposit({from: web3.eth.accounts[1], value: 100});
        await bank.withdraw(50, {from: web3.eth.accounts[1]});
        const balance = await bank.getBalance.call(web3.eth.accounts[1], tokenTypes.ETH);
        assert.equal(balance.valueOf(), 50);
      });

      it("should create debit and credit ledger entries", async () => {
        await bank.deposit({from: web3.eth.accounts[1], value: 100});
        await bank.withdraw(50, {from: web3.eth.accounts[1]});
        await utils.assertEvents(bank, [
        {
          event: "LedgerEntry",
          args: {
            address_: bank.address,
            debit: web3.toBigNumber('50')
          }
        },
        {
          event: "LedgerEntry",
          args: {
            address_: web3.eth.accounts[1],
            credit: web3.toBigNumber('50')
          }
        }
        ]);
      });
    });

    describe("if you don't have enough funds", () => {
      it("throws an error", async () => {
        await bank.deposit({from: web3.eth.accounts[1], value: 100});
        try {
          await bank.withdraw(101, {from: web3.eth.accounts[1]});
        } catch (error) {
          assert.match(error, /VM Exception[a-zA-Z0-9 ]+: invalid opcode/);
        }
      });

    });
  });

  describe('#newLoan', () => {
    describe('when the loan is valid', () => {
      it("pays out the amount requested", async () => {
        // fund the bank
        await bank.sendTransaction({value: web3.toWei(1, "ether")})

        const amountLoaned = await bank.newLoan.call(web3.toWei(1, "ether"), tokenTypes.ETH);
        assert.equal(amountLoaned.valueOf(), web3.toWei(1, "ether"));
      });
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
      bank = await Bank.new(interestRate * 100, payoutsPerTimePeriod)
      await bank.deposit({value: principal.times(multiplyer)});
      const balance = await bank.getBalanceWithInterest.call(web3.eth.accounts[0], tokenTypes.ETH, timeStamp);
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
