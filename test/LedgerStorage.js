"use strict";

const LedgerStorage = artifacts.require("./storage/LedgerStorage.sol");
const utils = require('./utils');

const customer = 1;
const ledgerAccount = 2;
const asset = 3;

contract('LedgerStorage', function(accounts) {
  var ledgerStorage;

  beforeEach(async () => {
    [ledgerStorage] = await Promise.all([LedgerStorage.new()]);
    await ledgerStorage.allow(web3.eth.accounts[0]);
  });

  describe('#increaseBalanceByAmount', () => {
    it("should increase balance by amount", async () => {
      await ledgerStorage.increaseBalanceByAmount(customer, ledgerAccount, asset, 4);

      assert.equal(await ledgerStorage.getBalance.call(customer, ledgerAccount, asset), 4);

      await ledgerStorage.increaseBalanceByAmount(customer, ledgerAccount, asset, 5);

      assert.equal(await ledgerStorage.getBalance.call(customer, ledgerAccount, asset), 9);
    });

    it("should handle overflow", async () => {
      const whammo = web3.toBigNumber('2').pow('255').plus(1);
      await ledgerStorage.increaseBalanceByAmount(customer, ledgerAccount, asset, whammo);

      await utils.assertGracefulFailure(ledgerStorage, "LedgerStorage::BalanceOverflow", [1, 3, null, null], async () => {
        await ledgerStorage.increaseBalanceByAmount(customer, ledgerAccount, asset, whammo);
      });
    });

    it("should emit event", async () => {
      await ledgerStorage.increaseBalanceByAmount(customer, ledgerAccount, asset, 4);

      await utils.assertEvents(ledgerStorage, [
      {
        event: "BalanceIncrease",
        args: {
          ledgerAccount: web3.toBigNumber('2'),
          amount: web3.toBigNumber('4')
        }
      }]);
    });

    it("should be allowed only", async () => {
      await utils.assertOnlyAllowed(ledgerStorage, ledgerStorage.increaseBalanceByAmount.bind(null, 1, 2, 3, 4), web3);
    });
  });

  describe('#decreaseBalanceByAmount', () => {
    it("should decrease balance by amount", async () => {
      await ledgerStorage.increaseBalanceByAmount(customer, ledgerAccount, asset, 4);

      assert.equal(await ledgerStorage.getBalance.call(customer, ledgerAccount, asset), 4);

      await ledgerStorage.decreaseBalanceByAmount(customer, ledgerAccount, asset, 2);

      assert.equal(await ledgerStorage.getBalance.call(customer, ledgerAccount, asset), 2);
    });

    it("shoud handle insufficient balance", async () => {
      await utils.assertGracefulFailure(ledgerStorage, "LedgerStorage::InsufficientBalance", [1, 3, 0, 2], async () => {
        await ledgerStorage.decreaseBalanceByAmount(customer, ledgerAccount, asset, 2);
      });
    });

    it("should emit event", async () => {
      await ledgerStorage.increaseBalanceByAmount(customer, ledgerAccount, asset, 5);
      await ledgerStorage.decreaseBalanceByAmount(customer, ledgerAccount, asset, 4);

      await utils.assertEvents(ledgerStorage, [
      {
        event: "BalanceDecrease",
        args: {
          ledgerAccount: web3.toBigNumber('2'),
          amount: web3.toBigNumber('4')
        }
      }]);
    });

    it("should be allowed only", async () => {
      await utils.assertOnlyAllowed(ledgerStorage, ledgerStorage.decreaseBalanceByAmount.bind(null, 1, 2, 3, 4), web3);
    });
  });

  describe('#saveCheckpoint', () => {
    it("should update checkpoint", async () => {
      await ledgerStorage.saveCheckpoint(customer, ledgerAccount, asset);

      const firstBlockNumber = (await ledgerStorage.getBalanceBlockNumber.call(customer, ledgerAccount, asset)).valueOf();

      // Mine 20 blocks
      await utils.mineBlocks(web3, 20);

      await ledgerStorage.saveCheckpoint(customer, ledgerAccount, asset);

      const secondBlockNumber = (await ledgerStorage.getBalanceBlockNumber.call(customer, ledgerAccount, asset)).valueOf();

      assert.equal(secondBlockNumber - firstBlockNumber, 21);
    });

    it("should be allowed only", async () => {
      await utils.assertOnlyAllowed(ledgerStorage, ledgerStorage.saveCheckpoint.bind(null, 1, 2, 3), web3);
    });
  });

});