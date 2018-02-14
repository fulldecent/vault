"use strict";

const BalanceSheet = artifacts.require("./storage/BalanceSheet.sol");
const utils = require('./utils');

const ledgerAccount = 2;
const asset = 3;

contract('BalanceSheet', function(accounts) {
  var balanceSheet;

  beforeEach(async () => {
    [balanceSheet] = await Promise.all([BalanceSheet.new()]);
    await balanceSheet.allow(web3.eth.accounts[0]);
  });

  describe('#increaseAccountBalance', () => {
    it("should increase account balance by amount", async () => {
      assert.equal(await balanceSheet.increaseAccountBalance.call(asset, ledgerAccount, 4), true);
      await balanceSheet.increaseAccountBalance(asset, ledgerAccount, 4);

      assert.equal((await balanceSheet.getBalanceSheetBalance.call(asset, ledgerAccount)).toNumber(), 4);

      await balanceSheet.increaseAccountBalance(asset, ledgerAccount, 5);

      assert.equal((await balanceSheet.getBalanceSheetBalance.call(asset, ledgerAccount)).toNumber(), 9);
    });

    it("should handle overflow", async () => {
      const whammo = web3.toBigNumber('2').pow('255').plus(1);

      await balanceSheet.increaseAccountBalance(asset, ledgerAccount, whammo);

      // TODO: This should break
      await utils.assertGracefulFailure(balanceSheet, "BalanceSheet::BalanceSheetOverflow", [asset, null, null], async () => {
        await balanceSheet.increaseAccountBalance(asset, ledgerAccount, whammo);
      });
    });

    it("should emit event for debit", async () => {
      await balanceSheet.increaseAccountBalance(asset, ledgerAccount, 4);

      await utils.assertEvents(balanceSheet, [
      {
        event: "BalanceSheetIncrease",
        args: {
          ledgerAccount: web3.toBigNumber(ledgerAccount),
          amount: web3.toBigNumber('4')
        }
      }]);
    });

    it("should be allowed only", async () => {
      await utils.assertOnlyAllowed(balanceSheet, balanceSheet.increaseAccountBalance.bind(null, asset, ledgerAccount, 4), web3);
    });
  });

  describe('#decreaseAccountBalance', () => {
    it("should decrease account balance by amount", async () => {
      await balanceSheet.increaseAccountBalance(asset, ledgerAccount, 4);

      assert.equal((await balanceSheet.getBalanceSheetBalance.call(asset, ledgerAccount)).toNumber(), 4);

      await balanceSheet.decreaseAccountBalance(asset, ledgerAccount, 2);

      assert.equal((await balanceSheet.getBalanceSheetBalance.call(asset, ledgerAccount)).toNumber(), 2);
    });

    it("should handle insufficient balance", async () => {
      await utils.assertGracefulFailure(balanceSheet, "BalanceSheet::BalanceSheetUnderflow", [asset, 0, 2], async () => {
        await balanceSheet.decreaseAccountBalance(asset, ledgerAccount, 2);
      });
    });

    it("should emit event for credit", async () => {
      await balanceSheet.increaseAccountBalance(asset, ledgerAccount, 5);
      await balanceSheet.decreaseAccountBalance(asset, ledgerAccount, 4);

      await utils.assertEvents(balanceSheet, [
      {
        event: "BalanceSheetDecrease",
        args: {
          ledgerAccount: web3.toBigNumber(ledgerAccount),
          amount: web3.toBigNumber('4')
        }
      }]);
    });

    it("should be allowed only", async () => {
      await utils.assertOnlyAllowed(balanceSheet, balanceSheet.decreaseAccountBalance.bind(null, asset, ledgerAccount, 4), web3);
    });
  });

  describe('#getBalanceSheetBalance', () => {
    it("return the balance if present", async () => {
      assert.equal(await balanceSheet.increaseAccountBalance.call(asset, ledgerAccount, 5), true);
      await balanceSheet.increaseAccountBalance(asset, ledgerAccount, 5);

      assert.equal((await balanceSheet.getBalanceSheetBalance.call(asset, ledgerAccount)).toNumber(), 5);
    });

    it("should return 0 if not present", async () => {
      assert.equal((await balanceSheet.getBalanceSheetBalance.call(asset, ledgerAccount)).toNumber(), 0);
    });
  });
});
