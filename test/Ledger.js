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

  describe('#deposit', () => {
    it("should increase the user's balance", async () => {
      // first deposit assets into W-Eth contract
      await utils.createAndApproveWeth(ledger, etherToken, 100, web3.eth.accounts[1]);

      // verify initial state

      assert.equal(await utils.tokenBalance(etherToken, ledger.address), 0);
      assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 100);

      // commit deposit in ledger
      await ledger.deposit(etherToken.address, 100, web3.eth.accounts[1]);

      // verify balance in ledger
      assert.equal(await utils.ledgerAccountBalance(ledger, web3.eth.accounts[1], etherToken.address), 100);

      // verify balances in W-Eth
      assert.equal(await utils.tokenBalance(etherToken, ledger.address), 100);
      assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 0);
    });

    it("should create debit and credit ledger entries", async () => {
      await utils.depositEth(ledger, etherToken, 100, web3.eth.accounts[1]);

      await utils.assertEvents(ledger, [
      {
        event: "LedgerEntry",
        args: {
          account: web3.eth.accounts[1],
          asset: etherToken.address,
          debit: web3.toBigNumber('100')
        }
      },
      {
        event: "LedgerEntry",
        args: {
          account: ledger.address,
          asset: etherToken.address,
          credit: web3.toBigNumber('100')
        }
      }
      ]);
    });

    it("should only work if properly authorized", async () => {
      await utils.createAndApproveWeth(ledger, etherToken, 100, web3.eth.accounts[1], 99);

      try {
        await ledger.deposit(etherToken.address, 100, web3.eth.accounts[1]);
        assert.fail('should have thrown');
      } catch(error) {
        assert.equal(error.message, "VM Exception while processing transaction: revert")
      }
    });

    it("should fail for unknown assets", async () => {
      try {
        await ledger.deposit(0, 100, web3.eth.accounts[1]);
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

  describe('#withdrawl', () => {
    describe('if you have enough funds', () => {
      it("should decrease the account's balance", async () => {
        await utils.depositEth(ledger, etherToken, 100, web3.eth.accounts[1]);

        assert.equal(await utils.ledgerAccountBalance(ledger, web3.eth.accounts[1], etherToken.address), 100);

        await ledger.withdraw(etherToken.address, 40, web3.eth.accounts[1], {from: web3.eth.accounts[1]});
        assert.equal(await utils.ledgerAccountBalance(ledger, web3.eth.accounts[1], etherToken.address), 60);

        // verify balances in W-Eth
        assert.equal(await utils.tokenBalance(etherToken, ledger.address), 60);
        assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 40);
      });

      it("should update the user's balance with interest since the last checkpoint", async () => {
        await ledger.setInterestRate(etherToken.address, 5, 1, {from: web3.eth.accounts[0]});
        await utils.depositEth(ledger, etherToken, web3.toWei("1", "ether"), web3.eth.accounts[1]);

        await utils.increaseTime(web3, moment(0).add(2, 'years').unix());
        await ledger.withdraw(etherToken.address, web3.toWei(".5", "ether"), web3.eth.accounts[1], {from: web3.eth.accounts[1]});
        const expectedBalance = utils.compoundedInterest({
          principal: new BigNumber(web3.toWei("1", "ether")),
          interestRate: new BigNumber(0.05),
          payoutsPerTimePeriod: new BigNumber(1),
          duration: 2,
        }).toFixed(6) - web3.toWei(".5", "ether");
        assert.equal(await utils.ledgerAccountBalance(ledger, web3.eth.accounts[1], etherToken.address), expectedBalance);

        await utils.assertEvents(ledger, [
        {
          event: "LedgerEntry",
          args: {
            account: web3.eth.accounts[1],
            asset: etherToken.address,
            debit: web3.toBigNumber('102500000000000000')
          }
        },
        {
          event: "LedgerEntry",
          args: {
            account: ledger.address,
            asset: etherToken.address,
            credit: web3.toBigNumber('102500000000000000')
          }
        },
        ]);
      });

      it("should create debit and credit ledger entries", async () => {
        await utils.depositEth(ledger, etherToken, 100, web3.eth.accounts[1]);

        assert.equal(await utils.ledgerAccountBalance(ledger, web3.eth.accounts[1], etherToken.address), 100);

        await ledger.withdraw(etherToken.address, 40, web3.eth.accounts[1], {from: web3.eth.accounts[1]});

        await utils.assertEvents(ledger, [
        {
          event: "LedgerEntry",
          args: {
            account: ledger.address,
            asset: etherToken.address,
            debit: web3.toBigNumber('40')
          }
        },
        {
          event: "LedgerEntry",
          args: {
            account: web3.eth.accounts[1],
            asset: etherToken.address,
            credit: web3.toBigNumber('40')
          }
        }
        ]);
      });
    });

    describe("if you don't have sufficient funds", () => {
      it("throws an error", async () => {
        await utils.depositEth(ledger, etherToken, 100, web3.eth.accounts[1]);

        try {
          await ledger.withdraw(etherToken.address, 101, web3.eth.accounts[1], {from: web3.eth.accounts[1]});
          assert.fail('should have thrown');
        } catch (error) {
          assert.equal(error.message, "VM Exception while processing transaction: invalid opcode")
        }
      });
    });
  });
});
