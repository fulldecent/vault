"use strict";

const BigNumber = require('bignumber.js');
const Vault = artifacts.require("./Vault.sol");
const LedgerStorage = artifacts.require("./storage/LedgerStorage.sol");
const TestLedgerStorage = artifacts.require("./test/TestLedgerStorage.sol");
const LoanerStorage = artifacts.require("./storage/LoanerStorage.sol");
const BorrowInterestRateStorage = artifacts.require("./storage/BorrowInterestRateStorage.sol");
const SavingsInterestRateStorage = artifacts.require("./storage/SavingsInterestRateStorage.sol");
const TokenStore = artifacts.require("./storage/TokenStore.sol");
const Oracle = artifacts.require("./storage/Oracle.sol");
const PigToken = artifacts.require("./token/PigToken.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');
const toAssetValue = (value) => (value * 10 ** 9);
const interestRateScale = (10 ** 16); // InterestRateStorage.sol interestRateScale
const blockUnitsPerYear = 210240; // Tied to test set up in which InterestRateStorage.sol blockScale is 10. 2102400 blocks per year / 10 blocks per unit = 210240 units per year

const LedgerType = {
  Debit: web3.toBigNumber(0),
  Credit: web3.toBigNumber(1)
};

const LedgerReason = {
  CustomerDeposit: web3.toBigNumber(0),
  CustomerWithdrawal: web3.toBigNumber(1),
  Interest: web3.toBigNumber(2),
  CustomerBorrow: web3.toBigNumber(3),
  CustomerPayLoan: web3.toBigNumber(4),
  CollateralPayLoan: web3.toBigNumber(5),
};

const LedgerAccount = {
  Cash: web3.toBigNumber(0),
  Loan: web3.toBigNumber(1),
  Deposit: web3.toBigNumber(2),
  InterestExpense: web3.toBigNumber(3),
  InterestIncome: web3.toBigNumber(4),
  Trading: web3.toBigNumber(5),
};

contract('Vault', function(accounts) {
  var vault;
  var etherToken;
  var pigToken;
  var borrowInterestRateStorage;
  var savingsInterestRateStorage;
  var loanerStorage;
  var oracle;
  var ledgerStorage;
  var tokenStore;
  var testLedgerStorage;

  beforeEach(async () => {
    tokenStore = await TokenStore.new();
    borrowInterestRateStorage = await BorrowInterestRateStorage.new(10);
    savingsInterestRateStorage = await SavingsInterestRateStorage.new(10);
    ledgerStorage = await LedgerStorage.new();
    loanerStorage = await LoanerStorage.new();
    oracle = await Oracle.new();
    testLedgerStorage = await TestLedgerStorage.new();

    [vault, etherToken, pigToken] = await Promise.all([Vault.new(), EtherToken.new(), PigToken.new()]);

    await ledgerStorage.allow(vault.address);
    await loanerStorage.allow(vault.address);
    await loanerStorage.setMinimumCollateralRatio(2);
    await savingsInterestRateStorage.allow(vault.address);
    await borrowInterestRateStorage.allow(vault.address);
    await oracle.allow(vault.address);
    await tokenStore.allow(vault.address);

    await vault.setLedgerStorage(ledgerStorage.address);
    await vault.setLoanerStorage(loanerStorage.address);
    await vault.setSavingsInterestRateStorage(savingsInterestRateStorage.address);
    await vault.setBorrowInterestRateStorage(borrowInterestRateStorage.address);
    await vault.setOracle(oracle.address);
    await vault.setTokenStore(tokenStore.address);

    await utils.setAssetValue(oracle, etherToken, 1, web3);
    await loanerStorage.addLoanableAsset(etherToken.address);
  });

  describe('#customerBorrow', () => {
    it("pays out the amount requested", async () => {
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
      await vault.customerBorrow(etherToken.address, 20, {from: web3.eth.accounts[1]});
      await utils.assertEvents(vault, [
        {
          event: "LedgerEntry",
          args: {
            ledgerReason: LedgerReason.CustomerBorrow,
            ledgerType: LedgerType.Debit,
            ledgerAccount: LedgerAccount.Loan,
            customer: web3.eth.accounts[1],
            asset: etherToken.address,
            amount: web3.toBigNumber('20'),
            balance: web3.toBigNumber('20'),
            interestRateBPS: web3.toBigNumber('0'),
            nextPaymentDate: web3.toBigNumber('0')
          }
        },
        {
          event: "LedgerEntry",
          args: {
            ledgerReason: LedgerReason.CustomerBorrow,
            ledgerType: LedgerType.Credit,
            ledgerAccount: LedgerAccount.Deposit,
            customer: web3.eth.accounts[1],
            asset: etherToken.address,
            amount: web3.toBigNumber('20'),
            balance: web3.toBigNumber('120'),
            interestRateBPS: web3.toBigNumber('0'),
            nextPaymentDate: web3.toBigNumber('0')
          }
        }
      ]);
    });
  });

  // TODO (as part of CE-62) : Get interest to be applied and uncomment the expected events with ledgerReason: LedgerReason.Interest
  describe('#customerPayLoan', () => {
    it("accrues interest and reduces the balance", async () => {
      await borrowInterestRateStorage.snapshotCurrentRate(etherToken.address, 50000);
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
      await vault.customerBorrow(etherToken.address, 20, {from: web3.eth.accounts[1]});
      await utils.mineBlocks(web3, 10);
      await vault.customerPayLoan(etherToken.address, 18, {from: web3.eth.accounts[1]});
      await utils.assertEvents(vault, [
      /*  {
          event: "LedgerEntry",
          args: {
            ledgerReason: LedgerReason.Interest,
            ledgerType: LedgerType.Credit,
            ledgerAccount: LedgerAccount.InterestIncome,
            customer: web3.eth.accounts[1],
            asset: etherToken.address,
            amount: web3.toBigNumber('2'),
            balance: web3.toBigNumber('0'),
            interestRateBPS: web3.toBigNumber('0'),
            nextPaymentDate: web3.toBigNumber('0')
          }
        },
        {
          event: "LedgerEntry",
          args: {
            ledgerReason: LedgerReason.Interest,
            ledgerType: LedgerType.Debit,
            ledgerAccount: LedgerAccount.Loan,
            customer: web3.eth.accounts[1],
            asset: etherToken.address,
            amount: web3.toBigNumber('2'),
            balance: web3.toBigNumber('22'),
            interestRateBPS: web3.toBigNumber('0'),
            nextPaymentDate: web3.toBigNumber('0')
          }
        }, */
        {
          event: "LedgerEntry",
          args: {
            ledgerReason: LedgerReason.CustomerPayLoan,
            ledgerType: LedgerType.Credit,
            ledgerAccount: LedgerAccount.Loan,
            customer: web3.eth.accounts[1],
            asset: etherToken.address,
            amount: web3.toBigNumber('18'),
            balance: web3.toBigNumber('2'),
            interestRateBPS: web3.toBigNumber('0'),
            nextPaymentDate: web3.toBigNumber('0')
          }
        },
        {
          event: "LedgerEntry",
          args: {
            ledgerReason: LedgerReason.CustomerPayLoan,
            ledgerType: LedgerType.Debit,
            ledgerAccount: LedgerAccount.Deposit,
            customer: web3.eth.accounts[1],
            asset: etherToken.address,
            amount: web3.toBigNumber('18'),
            balance: web3.toBigNumber('102'),
            interestRateBPS: web3.toBigNumber('0'),
            nextPaymentDate: web3.toBigNumber('0')
          }
        }
      ]);
    });
  });

  describe('#setMinimumCollateralRatio', () => {
    it('only can be called by the contract owner', async () => {
      await utils.assertOnlyOwner(loanerStorage, loanerStorage.setMinimumCollateralRatio.bind(null, 1), web3);
    });
  });

  describe('#addLoanableAsset', () => {
    it('only can be called by the contract owner', async () => {
      await utils.assertOnlyOwner(loanerStorage, loanerStorage.addLoanableAsset.bind(null, 1), web3);
    });
  });

  describe('#customerBorrow', () => {
    describe('when the loan is valid', () => {
      it("pays out the amount requested", async () => {
        await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
        await vault.customerBorrow(etherToken.address, 20, {from: web3.eth.accounts[1]});
        await vault.customerWithdraw(etherToken.address, 20, web3.eth.accounts[1], {from: web3.eth.accounts[1]});

        // verify balances in W-Eth
        assert.equal(await utils.tokenBalance(etherToken, tokenStore.address), 80);
        assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 20);
      });
    });

    describe("when the user doesn't have enough collateral deposited", () => {
      it("fails", async () => {
        await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[0]);

        await utils.assertGracefulFailure(vault, "Loaner::InvalidCollateralRatio", [null, 201, 100], async () => {
          await vault.customerBorrow(etherToken.address, 201, {from: web3.eth.accounts[0]});
        });
      });
    });
  });

  describe("when the user tries to take a loan out of an unsupported asset", () => {
    it("fails", async () => {
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[0]);

      await utils.assertGracefulFailure(vault, "Loaner::AssetNotLoanable", [null], async () => {
        await vault.customerBorrow(utils.tokenAddrs.OMG, 50, {from: web3.eth.accounts[0]});
      });
    });
  });

  describe('#getMaxLoanAvailable', () => {
    it('gets the maximum loan available', async () => {
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
      await vault.customerBorrow(etherToken.address, 20, {from: web3.eth.accounts[1]});
      await vault.customerWithdraw(etherToken.address, 20, web3.eth.accounts[1], {from: web3.eth.accounts[1]});

      const eqValue = await vault.getMaxLoanAvailable(web3.eth.accounts[1]);

      assert.equal(eqValue.valueOf(), 160);
    });
  });

  describe('#getValueEquivalent', () => {
    it('should get value of assets', async () => {
      // deposit Ether tokens for acct 1
      await loanerStorage.addLoanableAsset(pigToken.address);
      await pigToken.allocate(web3.eth.accounts[0], 100);

      // // Approve wallet for 55 tokens
      await pigToken.approve(vault.address, 100, {from: web3.eth.accounts[0]});
      await vault.customerDeposit(pigToken.address, 100, web3.eth.accounts[0], {from: web3.eth.accounts[0]});
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
      //
      // set Oracle value (each Eth is now worth two Eth!)
      await utils.setAssetValue(oracle, etherToken, 2, web3);
      await utils.setAssetValue(oracle, pigToken, 2, web3);
      await vault.customerBorrow(pigToken.address, 1, {from: web3.eth.accounts[1]});
      await vault.customerWithdraw(pigToken.address, 1, web3.eth.accounts[1], {from: web3.eth.accounts[1]});

      // get value of acct 1
      const eqValue = await vault.getValueEquivalent.call(web3.eth.accounts[1]);
      await vault.getValueEquivalent(web3.eth.accounts[1]);

      assert.equal(eqValue.valueOf(), 198);
    });
  });

  it("sets the owner", async () => {
    const owner = await vault.getOwner.call();
    assert.equal(owner, web3.eth.accounts[0]);
  });
  
  describe('#getScaledBorrowRatePerGroup', async () => {
    it('should return correct balance with liquidity ratio of 25%', async () => {
      await vault.setLedgerStorage(testLedgerStorage.address);

      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 50);
      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Loan, 150);

      console.log("interestRateScale="+interestRateScale+", blockUnitsPerYear="+blockUnitsPerYear);
      const interestRateBPS = (await vault.getScaledBorrowRatePerGroup.call(etherToken.address, interestRateScale, blockUnitsPerYear));
      (await vault.getScaledBorrowRatePerGroup(etherToken.address, interestRateScale, blockUnitsPerYear));

      console.log(["interestRateBPS=",interestRateBPS]);

      assert.equal(interestRateBPS.toNumber(), 11891170000);
    });


    it('should return correct balance with liquidity ratio of 0%', async () => {
      await vault.setLedgerStorage(testLedgerStorage.address);

      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 0);
      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Loan, 150);

      const interestRateBPS = await vault.getScaledBorrowRatePerGroup.call(etherToken.address, interestRateScale, blockUnitsPerYear);

    assert.equal(interestRateBPS.toNumber(), 14269404000);
    });

    it('should return correct balance with liquidity ratio of 100%', async () => {
      await vault.setLedgerStorage(testLedgerStorage.address);

      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 50);
      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Loan, 0);

      const interestRateBPS = await vault.getScaledBorrowRatePerGroup.call(etherToken.address, interestRateScale, blockUnitsPerYear);

      assert.equal(interestRateBPS.toNumber(), 4756468000);
    });

    it('should return correct balance with liquidity ratio of 50%', async () => {
      await vault.setLedgerStorage(testLedgerStorage.address);

      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 100);
      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Loan, 100);

      const interestRateBPS = await vault.getScaledBorrowRatePerGroup.call(etherToken.address, interestRateScale, blockUnitsPerYear);

      assert.equal(interestRateBPS.toNumber(), 9512936000);
    });

    it('should return correct balance with liquidity ratio of 0.99%', async () => {
      await vault.setLedgerStorage(testLedgerStorage.address);

      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 100);
      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Loan, 10000);

      const interestRateBPS = await vault.getScaledBorrowRatePerGroup.call(etherToken.address, interestRateScale, blockUnitsPerYear);

      assert.equal(interestRateBPS.toNumber(), 14174274640);
    });
  });

    describe('#snapshotBorrowInterestRate', async () => {
    it('should snapshot the current balance', async () => {
      await vault.setLedgerStorage(testLedgerStorage.address);

      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 50);
      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Loan, 150);

      const blockNumber = web3.eth.blockNumber;

      await vault.snapshotBorrowInterestRate(etherToken.address);

      assert.equal(
        (await borrowInterestRateStorage.getSnapshotBlockUnitInterestRate(etherToken.address, blockNumber)).toNumber(),
        11891170000
      );
    });

    it('should be called once per block unit');
  });
});
