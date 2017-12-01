const BigNumber = require('bignumber.js');
const Savings = artifacts.require("./Savings.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

const LedgerType = {
  Debit: web3.toBigNumber(0),
  Credit: web3.toBigNumber(1)
};

const LedgerAction = {
  CustomerDeposit: web3.toBigNumber(0),
  CustomerWithdrawal: web3.toBigNumber(1),
  Interest: web3.toBigNumber(2)
};

const LedgerAccount = {
  Cash: web3.toBigNumber(0),
  Loan: web3.toBigNumber(1),
  Deposit: web3.toBigNumber(2),
  InterestExpense: web3.toBigNumber(3),
  InterestIncome: web3.toBigNumber(4)
};

contract('Savings', function(accounts) {
  var savings;
  var etherToken;

  beforeEach(async () => {
    [savings, etherToken] = await Promise.all([Savings.new(), EtherToken.new()]);
  });

  describe('#customerDeposit', () => {
    it("should increase the user's balance", async () => {
      // first deposit assets into W-Eth contract
      await utils.createAndApproveWeth(savings, etherToken, 100, web3.eth.accounts[1]);

      // verify initial state

      assert.equal(await utils.tokenBalance(etherToken, savings.address), 0);
      assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 100);

      // commit deposit in savings
      await savings.customerDeposit(etherToken.address, 100, web3.eth.accounts[1]);

      // verify balance in savings
      assert.equal(await utils.ledgerAccountBalance(savings, web3.eth.accounts[1], etherToken.address), 100);

      // verify balances in W-Eth
      assert.equal(await utils.tokenBalance(etherToken, savings.address), 100);
      assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 0);
    });

    it("should create debit and credit ledger entries", async () => {
      await utils.depositEth(savings, etherToken, 100, web3.eth.accounts[1]);

      await utils.assertEvents(savings, [
      {
        event: "LedgerEntry",
        args: {
          ledgerType: LedgerType.Debit,
          ledgerAction: LedgerAction.CustomerDeposit,
          ledgerAccount: LedgerAccount.Cash,
          customer: web3.eth.accounts[1],
          asset: etherToken.address,
          amount: web3.toBigNumber('100'),
          finalBalance: web3.toBigNumber('0')
        }
      },
      {
        event: "LedgerEntry",
        args: {
          ledgerType: LedgerType.Credit,
          ledgerAction: LedgerAction.CustomerDeposit,
          ledgerAccount: LedgerAccount.Deposit,
          customer: web3.eth.accounts[1],
          asset: etherToken.address,
          amount: web3.toBigNumber('100'),
          finalBalance: web3.toBigNumber('100')
        }
      }
      ]);
    });

    it("should only work if ERC20 properly authorized", async () => {
      await utils.createAndApproveWeth(savings, etherToken, 100, web3.eth.accounts[1], 99);

      try {
        await savings.customerDeposit(etherToken.address, 100, web3.eth.accounts[1]);
        assert.fail('should have thrown');
      } catch(error) {
        assert.equal(error.message, "VM Exception while processing transaction: revert")
      }

      // works okay for 99
      await savings.customerDeposit(etherToken.address, 99, web3.eth.accounts[1]);
    });

    it("should fail for unknown assets", async () => {
      try {
        await savings.customerDeposit(0, 100, web3.eth.accounts[1]);
        assert.fail('should have thrown');
      } catch(error) {
        assert.equal(error.message, "VM Exception while processing transaction: revert")
      }
    });
  });

  describe('#customerDeposit', () => {
    describe('if you have enough funds', () => {
      it("should decrease the account's balance", async () => {
        await utils.depositEth(savings, etherToken, 100, web3.eth.accounts[1]);

        assert.equal(await utils.ledgerAccountBalance(savings, web3.eth.accounts[1], etherToken.address), 100);

        await savings.customerWithdraw(etherToken.address, 40, web3.eth.accounts[1], {from: web3.eth.accounts[1]});
        assert.equal(await utils.ledgerAccountBalance(savings, web3.eth.accounts[1], etherToken.address), 60);

        // verify balances in W-Eth
        assert.equal(await utils.tokenBalance(etherToken, savings.address), 60);
        assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 40);
      });

      it("should update the user's balance with interest since the last checkpoint", async () => {
        const startingBlock = web3.eth.blockNumber;
        const depositAmount = web3.toWei("1", "ether");
        const depositAmountBigNumber = new BigNumber(depositAmount);
        const withdrawAmount = web3.toWei(".5", "ether");
        const withdrawalAmountBigNumber = new BigNumber(withdrawAmount);

        await savings.setInterestRate(etherToken.address, 500, {from: web3.eth.accounts[0]});
        await utils.depositEth(savings, etherToken, depositAmount, web3.eth.accounts[1]);

        await utils.increaseTime(web3, moment(0).add(2, 'years').unix());
        await savings.customerWithdraw(etherToken.address, withdrawAmount, web3.eth.accounts[1], {from: web3.eth.accounts[1]});

        const balanceWithInterest = utils.compoundedInterest({
          principal: depositAmountBigNumber,
          interestRate: new BigNumber(0.05),
          payoutsPerTimePeriod: new BigNumber(12),
          duration: 2,
        }).toFixed(6);

        const expectedBalance = balanceWithInterest - withdrawalAmountBigNumber;
        const actualBalance = await utils.ledgerAccountBalance(savings, web3.eth.accounts[1], etherToken.address)

        assert.equal(actualBalance, expectedBalance);

        const actualInterest = actualBalance.plus(withdrawalAmountBigNumber).minus(depositAmountBigNumber);

        await utils.assertEvents(savings, [
        // Deposit
        {
          event: "LedgerEntry",
          args: {
              ledgerType: LedgerType.Debit,
              ledgerAction: LedgerAction.CustomerDeposit,
              ledgerAccount: LedgerAccount.Cash,
              customer: web3.eth.accounts[1],
              asset: etherToken.address,
              amount: depositAmountBigNumber,
              finalBalance: web3.toBigNumber('0')
            }
          },
          {
            event: "LedgerEntry",
            args: {
              ledgerType: LedgerType.Credit,
              ledgerAction: LedgerAction.CustomerDeposit,
              ledgerAccount: LedgerAccount.Deposit,
              customer: web3.eth.accounts[1],
              asset: etherToken.address,
              amount: depositAmountBigNumber,
              finalBalance: depositAmountBigNumber
            }
          },
          // InterestExpense
          {
          event: "LedgerEntry",
          args: {
              ledgerType: LedgerType.Debit,
              ledgerAction: LedgerAction.Interest,
              ledgerAccount: LedgerAccount.InterestExpense,
              customer: web3.eth.accounts[1],
              asset: etherToken.address,
              amount: actualInterest,
              finalBalance: web3.toBigNumber('0')
            }
          },
          {
            event: "LedgerEntry",
            args: {
              ledgerType: LedgerType.Credit,
              ledgerAction: LedgerAction.Interest,
              ledgerAccount: LedgerAccount.Deposit,
              customer: web3.eth.accounts[1],
              asset: etherToken.address,
              amount: actualInterest,
              finalBalance: actualInterest.plus(depositAmountBigNumber)
            }
          },
          // Withdrawal
          {
          event: "LedgerEntry",
          args: {
              ledgerType: LedgerType.Debit,
              ledgerAction: LedgerAction.CustomerWithdrawal,
              ledgerAccount: LedgerAccount.Deposit,
              customer: web3.eth.accounts[1],
              asset: etherToken.address,
              amount: withdrawalAmountBigNumber,
              finalBalance: actualBalance
            }
          },
          {
            event: "LedgerEntry",
            args: {
              ledgerType: LedgerType.Credit,
              ledgerAction: LedgerAction.CustomerWithdrawal,
              ledgerAccount: LedgerAccount.Cash,
              customer: web3.eth.accounts[1],
              asset: etherToken.address,
              amount: withdrawalAmountBigNumber,
              finalBalance: web3.toBigNumber('0')
            }
          }
        ], {fromBlock: startingBlock, toBlock: 'latest'});
      });

      it("should create debit deposits and credit cash", async () => {
        const initialBalance = 100;
        const initialBalanceBigNumber = web3.toBigNumber(initialBalance);
        const withdrawalAmount = 40;
        const withdrawalAmountBigNumber = web3.toBigNumber(withdrawalAmount);

        await utils.depositEth(savings, etherToken, initialBalance, web3.eth.accounts[1]);

        assert.equal(await utils.ledgerAccountBalance(savings, web3.eth.accounts[1], etherToken.address), initialBalance);

        await savings.customerWithdraw(etherToken.address, withdrawalAmount, web3.eth.accounts[1], {from: web3.eth.accounts[1]});

        await utils.assertEvents(savings, [
        {
          event: "LedgerEntry",
          args: {
              ledgerType: LedgerType.Debit,
              ledgerAction: LedgerAction.CustomerWithdrawal,
              ledgerAccount: LedgerAccount.Deposit,
              customer: web3.eth.accounts[1],
              asset: etherToken.address,
              amount: withdrawalAmountBigNumber,
              finalBalance: initialBalanceBigNumber.minus(withdrawalAmountBigNumber)
            }
          },
          {
            event: "LedgerEntry",
            args: {
              ledgerType: LedgerType.Credit,
              ledgerAction: LedgerAction.CustomerWithdrawal,
              ledgerAccount: LedgerAccount.Cash,
              customer: web3.eth.accounts[1],
              asset: etherToken.address,
              amount: withdrawalAmountBigNumber,
              finalBalance: web3.toBigNumber('0')
            }
          }
        ]);
      });
    });

    describe("if you don't have sufficient funds", () => {
      it("throws an error", async () => {
        await utils.depositEth(savings, etherToken, 100, web3.eth.accounts[1]);

        try {
          // withdrawing 101 throws
          await savings.customerWithdraw(etherToken.address, 101, web3.eth.accounts[1], {from: web3.eth.accounts[1]});
          assert.fail('should have thrown');
        } catch (error) {
          assert.equal(error.message, "VM Exception while processing transaction: invalid opcode")
        }

        // but withdrawing 100 is okay
        await savings.customerWithdraw(etherToken.address, 100, web3.eth.accounts[1], {from: web3.eth.accounts[1]});
      });
    });
  });

});