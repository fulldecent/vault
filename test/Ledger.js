const BigNumber = require('bignumber.js');
const Ledger = artifacts.require("./Ledger.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

async function deposit(ledger, token, acct, amount) {
  await token.deposit({from: acct, value: amount});
  await token.approve(ledger.address, amount, {from: acct});
  await ledger.deposit(token.address, acct, amount);
}

contract('Ledger', function(accounts) {
  var ledger;
  var etherToken;

  beforeEach(function() {
    return Ledger.new().then((instance) => {
      ledger = instance;

      return EtherToken.new().then((instance) => {
        etherToken = instance;
      });
    });
  });

  describe('#deposit', () => {
    it("should increase the user's balance", async () => {
      // first deposit assets into W-Eth contract
      await etherToken.deposit({from: web3.eth.accounts[1], value: 100});
      await etherToken.approve(ledger.address, 100, {from: web3.eth.accounts[1]});

      // verify initial state
      assert.equal((await etherToken.balanceOf(ledger.address)).valueOf(), 0);
      assert.equal((await etherToken.balanceOf(web3.eth.accounts[1])).valueOf(), 100);

      // commit deposit in ledger
      await ledger.deposit(etherToken.address, web3.eth.accounts[1], 100);

      // verify balance in ledger
      const balance = await ledger.getAccountBalanceRaw(web3.eth.accounts[1], etherToken.address);
      assert.equal(balance.valueOf(), 100);

      // verify balances in W-Eth
      assert.equal((await etherToken.balanceOf(ledger.address)).valueOf(), 100);
      assert.equal((await etherToken.balanceOf(web3.eth.accounts[1])).valueOf(), 0);
    });

    it("should create debit and credit ledger entries", async () => {
      await deposit(ledger, etherToken, web3.eth.accounts[1], 100);

      await utils.assertEvents(ledger, [
      {
        event: "LedgerEntry",
        args: {
          acct: web3.eth.accounts[1],
          asset: etherToken.address,
          debit: web3.toBigNumber('100')
        }
      },
      {
        event: "LedgerEntry",
        args: {
          acct: ledger.address,
          asset: etherToken.address,
          credit: web3.toBigNumber('100')
        }
      }
      ]);
    });

    it("should only work if properly authorized", async () => {
      await etherToken.deposit({from: web3.eth.accounts[1], value: 100});
      await etherToken.approve(ledger.address, 99, {from: web3.eth.accounts[1]});

      try {
        await ledger.deposit(etherToken.address, web3.eth.accounts[1], 100);
        assert.fail('should have thrown');
      } catch(error) {
        assert.equal(error.message, "VM Exception while processing transaction: revert")
      }
    });

    it("should fail for unknown assets", async () => {
      try {
        await ledger.deposit(0, web3.eth.accounts[1], 100);
        assert.fail('should have thrown');
      } catch(error) {
        assert.equal(error.message, "VM Exception while processing transaction: revert")
      }
    });
  });

  describe('with interest', () => {
    describe('#setInterestRate', () => {
      it("should set interest rate", async () => {
        await ledger.setInterestRate(etherToken.address, 5, 12, {from: web3.eth.accounts[0]});

        const [interestRate, payoutsPerYear] = (await ledger.getInterestRate(etherToken.address)).valueOf();
        assert.equal(interestRate.valueOf(), 5);
        assert.equal(payoutsPerYear.valueOf(), 12);
      });

      it("should emit event", async () => {
        await ledger.setInterestRate(etherToken.address, 5, 12, {from: web3.eth.accounts[0]});

        await utils.assertEvents(ledger, [
        {
          event: "InterestRateChange",
          args: {
            asset: etherToken.address,
            interestRate: web3.toBigNumber('5'),
            payoutsPerYear: web3.toBigNumber('12')
          }
        }]);
      });

      it("should be owner only", async () => {
        try {
          await ledger.setInterestRate(etherToken.address, 5, 12, {from: web3.eth.accounts[1]});
          assert.fail('should have thrown');
        } catch(error) {
          assert.equal(error.message, "VM Exception while processing transaction: revert")
        }
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
        const timestamp = new BigNumber(moment().add(duration, 'years').unix());

        await ledger.setInterestRate(etherToken.address, interestRate * 100, payoutsPerTimePeriod);
        await deposit(ledger, etherToken, web3.eth.accounts[1], principal.times(multiplyer));

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

  describe('#withdrawl', () => {
    describe('if you have enough funds', () => {
      it("should decrease the account's balance", async () => {
        await deposit(ledger, etherToken, web3.eth.accounts[1], 100);

        await ledger.withdraw(etherToken.address, 40, {from: web3.eth.accounts[1]});
        const balance = await ledger.getAccountBalanceRaw.call(web3.eth.accounts[1], etherToken.address);
        assert.equal(balance.valueOf(), 60);

        // verify balances in W-Eth
        assert.equal((await etherToken.balanceOf(ledger.address)).valueOf(), 60);
        assert.equal((await etherToken.balanceOf(web3.eth.accounts[1])).valueOf(), 40);
      });

      it("should create debit and credit ledger entries", async () => {
        await deposit(ledger, etherToken, web3.eth.accounts[1], 100);

        await ledger.withdraw(etherToken.address, 40, {from: web3.eth.accounts[1]});

        await utils.assertEvents(ledger, [
        {
          event: "LedgerEntry",
          args: {
            acct: ledger.address,
            asset: etherToken.address,
            debit: web3.toBigNumber('40')
          }
        },
        {
          event: "LedgerEntry",
          args: {
            acct: web3.eth.accounts[1],
            asset: etherToken.address,
            credit: web3.toBigNumber('40')
          }
        }
        ]);
      });
    });

    describe("if you don't have sufficient funds", () => {
      it("throws an error", async () => {
        await deposit(ledger, etherToken, web3.eth.accounts[1], 100);

        try {
          await ledger.withdraw(etherToken.address, 101, {from: web3.eth.accounts[1]});
          assert.fail('should have thrown');
        } catch (error) {
          assert.equal(error.message, "VM Exception while processing transaction: invalid opcode")
        }
      });
    });
  });
});
