"use strict";

const BigNumber = require('bignumber.js');
const Supplier = artifacts.require("./Supplier.sol");
const LedgerStorage = artifacts.require("./storage/LedgerStorage.sol");
const TestLedgerStorage = artifacts.require("./test/TestLedgerStorage.sol");
const InterestRateStorage = artifacts.require("./storage/InterestRateStorage.sol");
const TokenStore = artifacts.require("./storage/TokenStore.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');
const interestRateScale = (10 ** 16); // InterestRateStorage.sol interestRateScale
const blockUnitsPerYear = 210240; // Tied to test set up in which InterestRateStorage.sol blockScale is 10. 2102400 blocks per year / 10 blocks per unit = 210240 units per year


const LedgerType = {
  Debit: web3.toBigNumber(0),
  Credit: web3.toBigNumber(1)
};

const LedgerReason = {
  CustomerSupply: web3.toBigNumber(0),
  CustomerWithdrawal: web3.toBigNumber(1),
  Interest: web3.toBigNumber(2)
};

const LedgerAccount = {
  Cash: web3.toBigNumber(0),
  Borrow: web3.toBigNumber(1),
  Supply: web3.toBigNumber(2),
  InterestExpense: web3.toBigNumber(3),
  InterestIncome: web3.toBigNumber(4)
};

contract('Supplier', function(accounts) {
  var supplier;
  var etherToken;
  var tokenStore;
  var interestRateStorage;
  var testLedgerStorage;

  beforeEach(async () => {
    const ledgerStorage = await LedgerStorage.new();
    tokenStore = await TokenStore.new();
    interestRateStorage = await InterestRateStorage.new(10);
    testLedgerStorage = await TestLedgerStorage.new();

    [supplier, etherToken] = await Promise.all([Supplier.new(), EtherToken.new()]);
    await ledgerStorage.allow(supplier.address);
    await tokenStore.allow(supplier.address);
    await interestRateStorage.allow(supplier.address);
    await supplier.setLedgerStorage(ledgerStorage.address);
    await supplier.setSupplyInterestRateStorage(interestRateStorage.address);
    await supplier.setTokenStore(tokenStore.address);
  });

  describe('#customerSupply', () => {
    it("should increase the user's balance", async () => {
      // first supply assets into W-Eth contract
      await utils.createAndApproveWeth(supplier, etherToken, 100, web3.eth.accounts[1]);

      // verify initial state

      assert.equal(await utils.tokenBalance(etherToken, supplier.address), 0);
      assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 100);

      // commit supply in supplier
      await supplier.customerSupply(etherToken.address, 100, {from: web3.eth.accounts[1]});

      // verify balance in supplier
      assert.equal((await utils.ledgerAccountBalance(supplier, web3.eth.accounts[1], etherToken.address)).toNumber(), 100);

      // verify balances in W-Eth
      assert.equal(await utils.tokenBalance(etherToken, tokenStore.address), 100);
      assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 0);
    });

    it("should create debit and credit ledger entries", async () => {
      await utils.supplyEth(supplier, etherToken, 100, web3.eth.accounts[1]);

      await utils.assertEvents(supplier, [
      {
        event: "LedgerEntry",
        args: {
          ledgerReason: LedgerReason.CustomerSupply,
          ledgerType: LedgerType.Debit,
          ledgerAccount: LedgerAccount.Cash,
          customer: web3.eth.accounts[1],
          asset: etherToken.address,
          amount: web3.toBigNumber('100'),
          balance: web3.toBigNumber('0'),
          interestRateBPS: web3.toBigNumber('0'),
          nextPaymentDate: web3.toBigNumber('0')
        }
      },
      {
        event: "LedgerEntry",
        args: {
          ledgerReason: LedgerReason.CustomerSupply,
          ledgerType: LedgerType.Credit,
          ledgerAccount: LedgerAccount.Supply,
          customer: web3.eth.accounts[1],
          asset: etherToken.address,
          amount: web3.toBigNumber('100'),
          balance: web3.toBigNumber('100'),
          interestRateBPS: web3.toBigNumber('0'),
          nextPaymentDate: web3.toBigNumber('0')
        }
      }
      ]);
    });

    it("should only work if ERC20 properly authorized amount", async () => {
      await utils.createAndApproveWeth(supplier, etherToken, 100, web3.eth.accounts[1], 99);

      await utils.assertGracefulFailure(supplier, "Supplier::TokenTransferFromFail", [null, 100, null], async () => {
        await supplier.customerSupply(etherToken.address, 100, {from: web3.eth.accounts[1]});
      });

      // works okay for 99
      await supplier.customerSupply(etherToken.address, 99, {from: web3.eth.accounts[1]});
    });

    it("should fail for unknown assets", async () => {
      try {
        await supplier.customerSupply(0, 100, {from: web3.eth.accounts[1]});
        assert.fail('should have thrown');
      } catch(error) {
        assert.equal(error.message, "VM Exception while processing transaction: revert")
      }
    });
  });

  describe('#customerWithdraw', () => {
    describe('if you have enough funds', () => {
      it("should decrease the account's balance", async () => {
        await utils.supplyEth(supplier, etherToken, 100, web3.eth.accounts[1]);

        assert.equal(await utils.ledgerAccountBalance(supplier, web3.eth.accounts[1], etherToken.address), 100);

        await supplier.customerWithdraw(etherToken.address, 40, web3.eth.accounts[1], {from: web3.eth.accounts[1]});
        assert.equal(await utils.ledgerAccountBalance(supplier, web3.eth.accounts[1], etherToken.address), 60);

        // verify balances in W-Eth
        assert.equal(await utils.tokenBalance(etherToken, tokenStore.address), 60);
        assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 40);
      });

      it("should update the user's balance with interest since the last checkpoint", async () => {
        const supplyAmount = 20000000000000000;
        const withdrawAmount = 10000000000000000;
        const supplyAmountBigNumber = new BigNumber(supplyAmount);
        const withdrawalAmountBigNumber = new BigNumber(withdrawAmount);
        const startingBlockNumber = web3.eth.blockNumber;

        await utils.supplyEth(supplier, etherToken, supplyAmount, web3.eth.accounts[1]);

        await interestRateStorage.allow(web3.eth.accounts[0]);
        const [snapshotStartingBlockNumber, startingBlockUnit] = await utils.buildSnapshots(web3, etherToken, interestRateStorage);

        await supplier.customerWithdraw(etherToken.address, withdrawAmount, web3.eth.accounts[1], {from: web3.eth.accounts[1]});

        await utils.assertEvents(supplier, [
        // Supply
        {
          event: "LedgerEntry",
          args: {
              ledgerReason: LedgerReason.CustomerSupply,
              ledgerType: LedgerType.Debit,
              ledgerAccount: LedgerAccount.Cash,
              customer: web3.eth.accounts[1],
              asset: etherToken.address,
              amount: supplyAmountBigNumber,
              balance: web3.toBigNumber('0'),
              interestRateBPS: web3.toBigNumber('0'),
              nextPaymentDate: web3.toBigNumber('0')
            }
          },
          {
            event: "LedgerEntry",
            args: {
              ledgerReason: LedgerReason.CustomerSupply,
              ledgerType: LedgerType.Credit,
              ledgerAccount: LedgerAccount.Supply,
              customer: web3.eth.accounts[1],
              asset: etherToken.address,
              amount: supplyAmountBigNumber,
              balance: supplyAmountBigNumber,
              interestRateBPS: web3.toBigNumber('0'),
              nextPaymentDate: web3.toBigNumber('0')
            }
          },
          // InterestExpense
          {
          event: "LedgerEntry",
          args: {
              ledgerReason: LedgerReason.Interest,
              ledgerType: LedgerType.Debit,
              ledgerAccount: LedgerAccount.InterestExpense,
              customer: web3.eth.accounts[1],
              asset: etherToken.address,
              amount: web3.toBigNumber('8561645008'),
              balance: web3.toBigNumber('0'),
              interestRateBPS: web3.toBigNumber('0'),
              nextPaymentDate: web3.toBigNumber('0')
            }
          },
          {
            event: "LedgerEntry",
            args: {
              ledgerReason: LedgerReason.Interest,
              ledgerType: LedgerType.Credit,
              ledgerAccount: LedgerAccount.Supply,
              customer: web3.eth.accounts[1],
              asset: etherToken.address,
              amount: web3.toBigNumber('8561645008'),
              balance: web3.toBigNumber('20000008561645008'),
              interestRateBPS: web3.toBigNumber('0'),
              nextPaymentDate: web3.toBigNumber('0')
            }
          },
          // Withdrawal
          {
          event: "LedgerEntry",
          args: {
              ledgerReason: LedgerReason.CustomerWithdrawal,
              ledgerType: LedgerType.Debit,
              ledgerAccount: LedgerAccount.Supply,
              customer: web3.eth.accounts[1],
              asset: etherToken.address,
              amount: web3.toBigNumber(withdrawAmount),
              balance: web3.toBigNumber('10000008561645008'),
              interestRateBPS: web3.toBigNumber('0'),
              nextPaymentDate: web3.toBigNumber('0')
            }
          },
          {
            event: "LedgerEntry",
            args: {
              ledgerReason: LedgerReason.CustomerWithdrawal,
              ledgerType: LedgerType.Credit,
              ledgerAccount: LedgerAccount.Cash,
              customer: web3.eth.accounts[1],
              asset: etherToken.address,
              amount: withdrawalAmountBigNumber,
              balance: web3.toBigNumber('0'),
              interestRateBPS: web3.toBigNumber('0'),
              nextPaymentDate: web3.toBigNumber('0')
            }
          }
        ], {fromBlock: startingBlockNumber, toBlock: 'latest'});
      });

      it("should create debit supplys and credit cash", async () => {
        const initialBalance = 100;
        const initialBalanceBigNumber = web3.toBigNumber(initialBalance);
        const withdrawalAmount = 40;
        const withdrawalAmountBigNumber = web3.toBigNumber(withdrawalAmount);

        await utils.supplyEth(supplier, etherToken, initialBalance, web3.eth.accounts[1]);

        assert.equal(await utils.ledgerAccountBalance(supplier, web3.eth.accounts[1], etherToken.address), initialBalance);

        await supplier.customerWithdraw(etherToken.address, withdrawalAmount, web3.eth.accounts[1], {from: web3.eth.accounts[1]});

        await utils.assertEvents(supplier, [
        {
          event: "LedgerEntry",
          args: {
              ledgerReason: LedgerReason.CustomerWithdrawal,
              ledgerType: LedgerType.Debit,
              ledgerAccount: LedgerAccount.Supply,
              customer: web3.eth.accounts[1],
              asset: etherToken.address,
              amount: withdrawalAmountBigNumber,
              balance: initialBalanceBigNumber.minus(withdrawalAmountBigNumber),
              interestRateBPS: web3.toBigNumber('0'),
              nextPaymentDate: web3.toBigNumber('0')
            }
          },
          {
            event: "LedgerEntry",
            args: {
              ledgerReason: LedgerReason.CustomerWithdrawal,
              ledgerType: LedgerType.Credit,
              ledgerAccount: LedgerAccount.Cash,
              customer: web3.eth.accounts[1],
              asset: etherToken.address,
              amount: withdrawalAmountBigNumber,
              balance: web3.toBigNumber('0'),
              interestRateBPS: web3.toBigNumber('0'),
              nextPaymentDate: web3.toBigNumber('0')
            }
          }
        ]);
      });
    });

    describe("if you don't have sufficient funds", () => {
      it("throws an error", async () => {
        await utils.supplyEth(supplier, etherToken, 100, web3.eth.accounts[1]);

        // Withdrawing 101 is an error
        await utils.assertGracefulFailure(supplier, "Supplier::InsufficientBalance", [null, 101, null, 100], async () => {
          await supplier.customerWithdraw(etherToken.address, 101, web3.eth.accounts[1], {from: web3.eth.accounts[1]});
        });

        // but withdrawing 100 is okay
        await supplier.customerWithdraw(etherToken.address, 100, web3.eth.accounts[1], {from: web3.eth.accounts[1]});

        // Withdrawing any more is an error
        await utils.assertGracefulFailure(supplier, "Supplier::InsufficientBalance", [null, 1, null, 0], async () => {
          await supplier.customerWithdraw(etherToken.address, 1, web3.eth.accounts[1], {from: web3.eth.accounts[1]});
        });
      });
    });

    describe('#getScaledSupplyRatePerGroup', async () => {
      it('should return correct rate with liquidity ratio of 25% (supply rate 25%)', async () => {
        await supplier.setLedgerStorage(testLedgerStorage.address);

        await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 50);
        await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Borrow, 150);

        const interestRateBPS = await supplier.getScaledSupplyRatePerGroup(etherToken.address, interestRateScale, blockUnitsPerYear);

        utils.validateRate(assert, 750, interestRateBPS.toNumber(), 3567351000, "25%");
        //                                           exact value is 3567351598
      });

      it('should return correct rate with liquidity ratio of 0% (supply rate 10%)', async () => {
        await supplier.setLedgerStorage(testLedgerStorage.address);

        await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 0);
        await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Borrow, 150);

        const interestRateBPS = await supplier.getScaledSupplyRatePerGroup(etherToken.address, interestRateScale, blockUnitsPerYear);

        utils.validateRate(assert, 1000, interestRateBPS.toNumber(), 4756468000, "10%");
        //                                            exact value is 4756468797
      });

      it('should return correct rate with liquidity ratio of 100% (supply rate 0%)', async () => {
        await supplier.setLedgerStorage(testLedgerStorage.address);

        await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 50);
        await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Borrow, 0);

        const interestRateBPS = await supplier.getScaledSupplyRatePerGroup(etherToken.address, interestRateScale, blockUnitsPerYear);

        utils.validateRate(assert, 0, interestRateBPS.toNumber(), 0, "0%");
      });

      it('should return correct rate with liquidity ratio of 50% (supply rate 5%)', async () => {
        await supplier.setLedgerStorage(testLedgerStorage.address);

        await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 100);
        await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Borrow, 100);

        const interestRateBPS = await supplier.getScaledSupplyRatePerGroup(etherToken.address, interestRateScale, blockUnitsPerYear);

        utils.validateRate(assert, 500, interestRateBPS.toNumber(), 2378234000, "5%");
        //                                           exact value is 2378234398
      });

      it('should return correct rate with liquidity ratio of 0.99% (supply rate 9.91%)', async () => {
        await supplier.setLedgerStorage(testLedgerStorage.address);

        await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 100);
        await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Borrow, 10000);

        const interestRateBPS = await supplier.getScaledSupplyRatePerGroup(etherToken.address, interestRateScale, blockUnitsPerYear);

        utils.validateRateWithMaxRatio(assert, 991, interestRateBPS.toNumber(), 4708903320, 0.0011, "9.91%");
        //                                                       exact value is 4708904109
      });
    });

    describe('#snapshotSupplierInterestRate', async () => {
      it('should snapshot the current balance', async () => {
        await supplier.setLedgerStorage(testLedgerStorage.address);

        await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 50);
        await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Borrow, 150);

        const blockNumber = web3.eth.blockNumber;
        await supplier.snapshotSupplierInterestRate(etherToken.address);

        utils.validateRate(assert, 750, (await interestRateStorage.getSnapshotBlockUnitInterestRate(etherToken.address, blockNumber)).toNumber(),
            3567351000, "7.5%");
        //  3567351598 is the exact value
      });

      it('should be called once per block unit');
    });
  });

});
