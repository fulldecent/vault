const BigNumber = require('bignumber.js');
const LedgerStorage = artifacts.require("./storage/LedgerStorage.sol");
const utils = require('./utils');
const moment = require('moment');

contract('LedgerStorage', function(accounts) {
  var ledgerStorage;

  beforeEach(async () => {
    // TODO: Set block unit size
    [ledgerStorage] = await Promise.all([LedgerStorage.new()]);
    await ledgerStorage.allow(web3.eth.accounts[0]);
  });

  describe('#increaseBalanceByAmount', () => {
    it("should increase balance by amount", async () => {
      await ledgerStorage.increaseBalanceByAmount(1, 2, 3, 4, {from: web3.eth.accounts[0]});

      assert.equal(await ledgerStorage.getBalance.call(1, 2, 3), 4);

      await ledgerStorage.increaseBalanceByAmount(1, 2, 3, 5, {from: web3.eth.accounts[0]});

      assert.equal(await ledgerStorage.getBalance.call(1, 2, 3), 9);
    });

    it("should handle overflow", async () => {
      const whammo = web3.toBigNumber('2').pow('255').plus(1);
      await ledgerStorage.increaseBalanceByAmount(1, 2, 3, whammo, {from: web3.eth.accounts[0]});

      await utils.assertGracefulFailure(ledgerStorage, "LedgerStorage::BalanceOverflow", [1, 3, null, null], async () => {
        await ledgerStorage.increaseBalanceByAmount(1, 2, 3, whammo, {from: web3.eth.accounts[0]});
      });
    });

    it("should emit event", async () => {
      await ledgerStorage.increaseBalanceByAmount(1, 2, 3, 4, {from: web3.eth.accounts[0]});

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
      await ledgerStorage.increaseBalanceByAmount(1, 2, 3, 4, {from: web3.eth.accounts[0]});

      assert.equal(await ledgerStorage.getBalance.call(1, 2, 3), 4);

      await ledgerStorage.decreaseBalanceByAmount(1, 2, 3, 2, {from: web3.eth.accounts[0]});

      assert.equal(await ledgerStorage.getBalance.call(1, 2, 3), 2);
    });

    it("shoud handle insufficient balance", async () => {
      await utils.assertGracefulFailure(ledgerStorage, "LedgerStorage::InsufficientBalance", [1, 3, 0, 2], async () => {
        await ledgerStorage.decreaseBalanceByAmount(1, 2, 3, 2, {from: web3.eth.accounts[0]});
      });
    });

    it("should emit event", async () => {
      await ledgerStorage.increaseBalanceByAmount(1, 2, 3, 5, {from: web3.eth.accounts[0]});
      await ledgerStorage.decreaseBalanceByAmount(1, 2, 3, 4, {from: web3.eth.accounts[0]});

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
      await ledgerStorage.saveCheckpoint(1, 2, 3, {from: web3.eth.accounts[0]});

      const firstBlockUnit = (await ledgerStorage.getBalanceBlockNumber.call(1, 2, 3)).valueOf();

      // Mine 20 blocks
      await utils.mineBlocks(web3, 20);

      await ledgerStorage.saveCheckpoint(1, 2, 3, {from: web3.eth.accounts[0]});

      const secondBlockUnit = (await ledgerStorage.getBalanceBlockNumber.call(1, 2, 3)).valueOf();

      assert.equal(secondBlockUnit - secondBlockUnit, 22); // should be 2
    });

    it("should be allowed only", async () => {
      await utils.assertOnlyAllowed(ledgerStorage, ledgerStorage.saveCheckpoint.bind(null, 1, 2, 3), web3);
    });
  });

  
});
