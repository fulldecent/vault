"use strict";

const BigNumber = require('bignumber.js');
const MoneyMarket = artifacts.require("./MoneyMarket.sol");
const LedgerStorage = artifacts.require("./storage/LedgerStorage.sol");
const TestLedgerStorage = artifacts.require("./test/TestLedgerStorage.sol");
const BorrowStorage = artifacts.require("./storage/BorrowStorage.sol");
const BorrowInterestRateStorage = artifacts.require("./storage/BorrowInterestRateStorage.sol");
const SupplyInterestRateStorage = artifacts.require("./storage/SupplyInterestRateStorage.sol");
const TokenStore = artifacts.require("./storage/TokenStore.sol");
const PriceOracle = artifacts.require("./storage/PriceOracle.sol");
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
  CustomerSupply: web3.toBigNumber(0),
  CustomerWithdrawal: web3.toBigNumber(1),
  Interest: web3.toBigNumber(2),
  CustomerBorrow: web3.toBigNumber(3),
  CustomerPayBorrow: web3.toBigNumber(4),
  CollateralPayBorrow: web3.toBigNumber(5),
};

const LedgerAccount = {
  Cash: web3.toBigNumber(0),
  Borrow: web3.toBigNumber(1),
  Supply: web3.toBigNumber(2),
  InterestExpense: web3.toBigNumber(3),
  InterestIncome: web3.toBigNumber(4),
  Trading: web3.toBigNumber(5),
};

contract('MoneyMarket', function(accounts) {
  var moneyMarket;
  var etherToken;
  var pigToken;
  var borrowInterestRateStorage;
  var supplyInterestRateStorage;
  var borrowStorage;
  var priceOracle;
  var ledgerStorage;
  var tokenStore;
  var testLedgerStorage;

  beforeEach(async () => {
    tokenStore = await TokenStore.new();
    borrowInterestRateStorage = await BorrowInterestRateStorage.new(10);
    supplyInterestRateStorage = await SupplyInterestRateStorage.new(10);
    ledgerStorage = await LedgerStorage.new();
    borrowStorage = await BorrowStorage.new();
    priceOracle = await PriceOracle.new();
    testLedgerStorage = await TestLedgerStorage.new();

    [moneyMarket, etherToken, pigToken] = await Promise.all([MoneyMarket.new(), EtherToken.new(), PigToken.new()]);

    await ledgerStorage.allow(moneyMarket.address);
    await borrowStorage.allow(moneyMarket.address);
    await borrowStorage.setMinimumCollateralRatio(2);
    await supplyInterestRateStorage.allow(moneyMarket.address);
    await borrowInterestRateStorage.allow(moneyMarket.address);
    await priceOracle.allow(moneyMarket.address);
    await tokenStore.allow(moneyMarket.address);

    await moneyMarket.setLedgerStorage(ledgerStorage.address);
    await moneyMarket.setBorrowStorage(borrowStorage.address);
    await moneyMarket.setSupplyInterestRateStorage(supplyInterestRateStorage.address);
    await moneyMarket.setBorrowInterestRateStorage(borrowInterestRateStorage.address);
    await moneyMarket.setPriceOracle(priceOracle.address);
    await moneyMarket.setTokenStore(tokenStore.address);

    await utils.setAssetValue(priceOracle, etherToken, 1, web3);
    await borrowStorage.addBorrowableAsset(etherToken.address);
  });

  describe('#customerBorrow', () => {
    it("pays out the amount requested", async () => {
      await utils.supplyEth(moneyMarket, etherToken, 100, web3.eth.accounts[1]);
      await moneyMarket.customerBorrow(etherToken.address, 20, {from: web3.eth.accounts[1]});
      await utils.assertEvents(moneyMarket, [
        {
          event: "LedgerEntry",
          args: {
            ledgerReason: LedgerReason.CustomerBorrow,
            ledgerType: LedgerType.Debit,
            ledgerAccount: LedgerAccount.Borrow,
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
            ledgerAccount: LedgerAccount.Supply,
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
  describe('#customerPayBorrow', () => {
    it("accrues interest and reduces the balance", async () => {
      await borrowInterestRateStorage.snapshotCurrentRate(etherToken.address, 50000);
      await utils.supplyEth(moneyMarket, etherToken, 100, web3.eth.accounts[1]);
      await moneyMarket.customerBorrow(etherToken.address, 20, {from: web3.eth.accounts[1]});
      await utils.mineBlocks(web3, 10);
      await moneyMarket.customerPayBorrow(etherToken.address, 18, {from: web3.eth.accounts[1]});
      await utils.assertEvents(moneyMarket, [
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
            ledgerAccount: LedgerAccount.Borrow,
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
            ledgerReason: LedgerReason.CustomerPayBorrow,
            ledgerType: LedgerType.Credit,
            ledgerAccount: LedgerAccount.Borrow,
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
            ledgerReason: LedgerReason.CustomerPayBorrow,
            ledgerType: LedgerType.Debit,
            ledgerAccount: LedgerAccount.Supply,
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
      await utils.assertOnlyOwner(borrowStorage, borrowStorage.setMinimumCollateralRatio.bind(null, 1), web3);
    });
  });

  describe('#addBorrowableAsset', () => {
    it('only can be called by the contract owner', async () => {
      await utils.assertOnlyOwner(borrowStorage, borrowStorage.addBorrowableAsset.bind(null, 1), web3);
    });
  });

  describe('#customerBorrow', () => {
    describe('when the borrow is valid', () => {
      it("pays out the amount requested", async () => {
        await utils.supplyEth(moneyMarket, etherToken, 100, web3.eth.accounts[1]);
        await moneyMarket.customerBorrow(etherToken.address, 20, {from: web3.eth.accounts[1]});
        await moneyMarket.customerWithdraw(etherToken.address, 20, web3.eth.accounts[1], {from: web3.eth.accounts[1]});

        // verify balances in W-Eth
        assert.equal(await utils.tokenBalance(etherToken, tokenStore.address), 80);
        assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 20);
      });
    });

    describe("when the user doesn't have enough collateral supplied", () => {
      it("fails", async () => {
        await utils.supplyEth(moneyMarket, etherToken, 100, web3.eth.accounts[0]);

        await utils.assertGracefulFailure(moneyMarket, "Borrower::InvalidCollateralRatio", [null, 201, 100], async () => {
          await moneyMarket.customerBorrow(etherToken.address, 201, {from: web3.eth.accounts[0]});
        });
      });
    });
  });

  describe("when the user tries to take a borrow out of an unsupported asset", () => {
    it("fails", async () => {
      await utils.supplyEth(moneyMarket, etherToken, 100, web3.eth.accounts[0]);

      await utils.assertGracefulFailure(moneyMarket, "Borrower::AssetNotBorrowable", [null], async () => {
        await moneyMarket.customerBorrow(utils.tokenAddrs.OMG, 50, {from: web3.eth.accounts[0]});
      });
    });
  });

  describe('#getMaxBorrowAvailable', () => {
    it('gets the maximum borrow available', async () => {
      await utils.supplyEth(moneyMarket, etherToken, 100, web3.eth.accounts[1]);
      await moneyMarket.customerBorrow(etherToken.address, 20, {from: web3.eth.accounts[1]});
      await moneyMarket.customerWithdraw(etherToken.address, 20, web3.eth.accounts[1], {from: web3.eth.accounts[1]});

      const eqValue = await moneyMarket.getMaxBorrowAvailable(web3.eth.accounts[1]);

      assert.equal(eqValue.valueOf(), 160);
    });
  });

  describe('#getValueEquivalent', () => {
    it('should get value of assets', async () => {
      // supply Ether tokens for acct 1
      await borrowStorage.addBorrowableAsset(pigToken.address);
      await pigToken.allocate(web3.eth.accounts[0], 100);

      // // Approve wallet for 55 tokens
      await pigToken.approve(moneyMarket.address, 100, {from: web3.eth.accounts[0]});
      await moneyMarket.customerSupply(pigToken.address, 100, web3.eth.accounts[0], {from: web3.eth.accounts[0]});
      await utils.supplyEth(moneyMarket, etherToken, 100, web3.eth.accounts[1]);
      //
      // set PriceOracle value (each Eth is now worth two Eth!)
      await utils.setAssetValue(priceOracle, etherToken, 2, web3);
      await utils.setAssetValue(priceOracle, pigToken, 2, web3);
      await moneyMarket.customerBorrow(pigToken.address, 1, {from: web3.eth.accounts[1]});
      await moneyMarket.customerWithdraw(pigToken.address, 1, web3.eth.accounts[1], {from: web3.eth.accounts[1]});

      // get value of acct 1
      const eqValue = await moneyMarket.getValueEquivalent.call(web3.eth.accounts[1]);
      await moneyMarket.getValueEquivalent(web3.eth.accounts[1]);

      assert.equal(eqValue.valueOf(), 198);
    });
  });

  it("sets the owner", async () => {
    const owner = await moneyMarket.getOwner.call();
    assert.equal(owner, web3.eth.accounts[0]);
  });
  
  describe('#getScaledBorrowRatePerGroup', async () => {
    it('should return correct balance with liquidity ratio of 25% (borrow rate 25%)', async () => {
      await moneyMarket.setLedgerStorage(testLedgerStorage.address);

      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 50);
      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Borrow, 150);

      console.log("interestRateScale="+interestRateScale+", blockUnitsPerYear="+blockUnitsPerYear);
      const interestRateBPS = (await moneyMarket.getScaledBorrowRatePerGroup.call(etherToken.address, interestRateScale, blockUnitsPerYear));
      (await moneyMarket.getScaledBorrowRatePerGroup(etherToken.address, interestRateScale, blockUnitsPerYear));

      console.log(["interestRateBPS=",interestRateBPS]);

      utils.validateRate(assert, 2500, interestRateBPS.toNumber(), 11891170000, "25%");
    });


    it('should return correct balance with liquidity ratio of 0% (borrow rate 30%)', async () => {
      await moneyMarket.setLedgerStorage(testLedgerStorage.address);

      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 0);
      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Borrow, 150);

      const interestRateBPS = await moneyMarket.getScaledBorrowRatePerGroup.call(etherToken.address, interestRateScale, blockUnitsPerYear);

    utils.validateRate(assert, 3000, interestRateBPS.toNumber(), 14269404000, "30%");
    });

    it('should return correct balance with liquidity ratio of 100% (borrow rate 10%)', async () => {
      await moneyMarket.setLedgerStorage(testLedgerStorage.address);

      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 50);
      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Borrow, 0);

      const interestRateBPS = await moneyMarket.getScaledBorrowRatePerGroup.call(etherToken.address, interestRateScale, blockUnitsPerYear);

      utils.validateRate(assert, 1000, interestRateBPS.toNumber(), 4756468000, "10%");
    });

    it('should return correct balance with liquidity ratio of 50% (borrow rate 20%)', async () => {
      await moneyMarket.setLedgerStorage(testLedgerStorage.address);

      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 100);
      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Borrow, 100);

      const interestRateBPS = await moneyMarket.getScaledBorrowRatePerGroup.call(etherToken.address, interestRateScale, blockUnitsPerYear);

      utils.validateRate(assert, 2000, interestRateBPS.toNumber(), 9512936000, "20%");
    });

    it('should return correct balance with liquidity ratio of 0.99% (borrow rate 29.82%)', async () => {
      await moneyMarket.setLedgerStorage(testLedgerStorage.address);

      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 100);
      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Borrow, 10000);

      const interestRateBPS = await moneyMarket.getScaledBorrowRatePerGroup.call(etherToken.address, interestRateScale, blockUnitsPerYear);

      // For this one, the error ratio is 0.00067.
      utils.validateRateWithMaxRatio(assert, 2982, interestRateBPS.toNumber(), 14174274640, 0.00068, "29.82%");
    });

    it('should return correct balance with liquidity ratio of 0.559471% (borrow rate 18.8105726872247%)', async () => {
        await moneyMarket.setLedgerStorage(testLedgerStorage.address);

      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 127);
      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Borrow, 100);

      const interestRateBPS = await moneyMarket.getScaledBorrowRatePerGroup.call(etherToken.address, interestRateScale, blockUnitsPerYear);

      // For this one, the error ratio is 0.00003061.
      utils.validateRateWithMaxRatio(assert, 1881.05726872247, interestRateBPS.toNumber(), 8946916308, 0.0000307, "18.8105726872247%");
      //                                                                      exact value  8947190205
    });
  });

    describe('#snapshotBorrowInterestRate', async () => {
    it('should snapshot the current balance', async () => {
      await moneyMarket.setLedgerStorage(testLedgerStorage.address);

      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Cash, 50);
      await testLedgerStorage.setBalanceSheetBalance(etherToken.address, LedgerAccount.Borrow, 150);

      const blockNumber = web3.eth.blockNumber;

      await moneyMarket.snapshotBorrowInterestRate(etherToken.address);

        utils.validateRate(assert, 2500, (await borrowInterestRateStorage.getSnapshotBlockUnitInterestRate(etherToken.address, blockNumber)).toNumber(),
            11891170000, "25%");
    });

    it('should be called once per block unit');
  });
});
