"use strict";

const InterestRateStorage = artifacts.require("./storage/InterestRateStorage.sol");
const utils = require('./utils');

contract('InterestRateStorage', function(accounts) {
  var interestRateStorage;

  beforeEach(async () => {
    interestRateStorage = await InterestRateStorage.new();
    await interestRateStorage.allow(web3.eth.accounts[0]);
  });

  describe('#getCurrentBalance', async () => {
    it('should return correct balance', async () => {
      await interestRateStorage.saveBlockInterest(0, 1, 50000);

      const primaryBlockNumber = await interestRateStorage.blockInterestBlock(0, 1);
      const primaryTotalInterest = (await interestRateStorage.blockTotalInterest(0, 1, primaryBlockNumber)).toNumber();

      await utils.mineBlocks(web3, 20);
      await interestRateStorage.saveBlockInterest(0, 1, 100000000000000);

      const currentBalance = await interestRateStorage.getCurrentBalance.call(0, 1, primaryBlockNumber, 2000000000000000000);

      assert.closeTo(currentBalance.toNumber(), 2000000000000000000 * 1.0000000000005 * 21, 10000);
    });
  });

  describe('#getBalanceAt', async () => {
    it('reverts when no starting or ending total interest', async () => {
      await interestRateStorage.saveBlockInterest(0, 1, 50000);

      const primaryBlockNumber = await interestRateStorage.blockInterestBlock(0, 1);
      const primaryTotalInterest = (await interestRateStorage.blockTotalInterest(0, 1, primaryBlockNumber)).toNumber();

      await utils.mineBlocks(web3, 20);
      await interestRateStorage.saveBlockInterest(0, 1, 100000000000000);

      const secondaryBlockNumber = await interestRateStorage.blockInterestBlock(0, 1);
      const secondaryTotalInterest = (await interestRateStorage.blockTotalInterest(0, 1, secondaryBlockNumber)).toNumber();

      utils.assertFailure('VM Exception while processing transaction: revert', async () => {
        await interestRateStorage.getBalanceAt(0, 1, primaryBlockNumber + 1, secondaryBlockNumber, 100);
      });

      utils.assertFailure('VM Exception while processing transaction: revert', async () => {
        await interestRateStorage.getBalanceAt(0, 1, primaryBlockNumber, secondaryBlockNumber + 1, 100);
      });

      utils.assertFailure('VM Exception while processing transaction: revert', async () => {
        await interestRateStorage.getBalanceAt(999, 1, primaryBlockNumber, secondaryBlockNumber, 100);
      });

      utils.assertFailure('VM Exception while processing transaction: revert', async () => {
        await interestRateStorage.getBalanceAt(0, 999, primaryBlockNumber, secondaryBlockNumber, 100);
      });

      // Make sure it works normally, correctly
      await interestRateStorage.getBalanceAt(0, 1, primaryBlockNumber, secondaryBlockNumber, 100);
    });

    it('calculates correct interest', async () => {
      const principal = 2000000000000000000; // 2 ether
      const primaryInterest = 0.05; // 5% interest per block
      const secondaryInterest = 0.1; // 10% interest per block
      const tertiaryInterest = 1.0; // 100% interest per block
      const quartaryInterest = 0.2; // 20% interest per block

      function scale(interest) {
        return Math.trunc(interest * Math.pow(10, 17));
      }

      await interestRateStorage.saveBlockInterest(0, 1, scale(primaryInterest));

      const primaryBlockNumber = (await interestRateStorage.blockInterestBlock(0, 1)).toNumber();
      await utils.mineBlocks(web3, 10);
      await interestRateStorage.saveBlockInterest(0, 1, scale(secondaryInterest));
      const secondaryBlockNumber = (await interestRateStorage.blockInterestBlock(0, 1)).toNumber();
      await utils.mineBlocks(web3, 20);
      await interestRateStorage.saveBlockInterest(0, 1, scale(tertiaryInterest));
      const tertiaryBlockNumber = (await interestRateStorage.blockInterestBlock(0, 1)).toNumber();
      await utils.mineBlocks(web3, 10);
      await interestRateStorage.saveBlockInterest(0, 1, scale(quartaryInterest));
      const quartaryBlockNumber = (await interestRateStorage.blockInterestBlock(0, 1)).toNumber();

      const balanceAtoB = (await interestRateStorage.getBalanceAt.call(0, 1, primaryBlockNumber, secondaryBlockNumber, principal)).toNumber();
      await interestRateStorage.getBalanceAt(0, 1, primaryBlockNumber, secondaryBlockNumber, principal);
      const expectedBalanceAtoB = Math.trunc( ( secondaryBlockNumber - primaryBlockNumber ) * ( 1 + primaryInterest ) * principal );

      assert.equal(
        balanceAtoB,
        expectedBalanceAtoB
      );

      const balanceAtoC = (await interestRateStorage.getBalanceAt.call(0, 1, primaryBlockNumber, tertiaryBlockNumber, principal)).toNumber();
      await interestRateStorage.getBalanceAt(0, 1, primaryBlockNumber, tertiaryBlockNumber, principal);
      const expectedBalanceAtoC = Math.trunc(
        principal *
        ( tertiaryBlockNumber - secondaryBlockNumber ) * ( 1 + secondaryInterest ) *
        ( secondaryBlockNumber - primaryBlockNumber ) * ( 1 + primaryInterest )
      );

      assert.equal(
        balanceAtoC,
        expectedBalanceAtoC
      );

      const balanceBtoC = (await interestRateStorage.getBalanceAt.call(0, 1, secondaryBlockNumber, tertiaryBlockNumber, principal)).toNumber();
      await interestRateStorage.getBalanceAt(0, 1, secondaryBlockNumber, tertiaryBlockNumber, principal);
      const expectedBalanceBtoC = Math.trunc(
        principal *
        ( tertiaryBlockNumber - secondaryBlockNumber ) * ( 1 + secondaryInterest )
      );

      assert.equal(
        balanceBtoC,
        expectedBalanceBtoC
      );
    });
  });

  describe('#saveBlockInterest', async () => {
    it('should start with given interest rate', async () => {
      await interestRateStorage.saveBlockInterest(0, 1, 50000);

      const blockNumber = await interestRateStorage.blockInterestBlock(0, 1);

      assert.isAbove(blockNumber, 0);

      assert.equal((await interestRateStorage.blockTotalInterest(0, 1, blockNumber)).toNumber(), 100000000000000000);
      assert.equal((await interestRateStorage.blockInterestRate(0, 1, blockNumber)).toNumber(), 50000);
    });

    it('shouldnt affect another asset', async () => {
      await interestRateStorage.saveBlockInterest(0, 1, 50000);
      const blockNumber = await interestRateStorage.blockInterestBlock(0, 1);

      assert.equal(await interestRateStorage.blockInterestBlock(5, 1), 0);
      assert.equal(await interestRateStorage.blockTotalInterest(5, 1, blockNumber), 0);
      assert.equal(await interestRateStorage.blockInterestRate(5, 1, blockNumber), 0);
    });

    it('should capture a new total interest', async () => {
      await interestRateStorage.saveBlockInterest(0, 1, 50000);

      const primaryBlockNumber = await interestRateStorage.blockInterestBlock(0, 1);
      const primaryTotalInterest = (await interestRateStorage.blockTotalInterest(0, 1, primaryBlockNumber)).toNumber();

      await utils.mineBlocks(web3, 20);
      await interestRateStorage.saveBlockInterest(0, 1, 100000000000000);

      const secondaryBlockNumber = await interestRateStorage.blockInterestBlock(0, 1);
      const secondaryTotalInterest = (await interestRateStorage.blockTotalInterest(0, 1, secondaryBlockNumber)).toNumber();

      assert.equal(secondaryTotalInterest / primaryTotalInterest, 1.0000000000005 * 21);
    });

    // Sadly, can't test repeated total interest since ganache
    // only gives us one trx per block

    it('should be allowed only', async () => {
      await utils.assertOnlyAllowed(interestRateStorage, interestRateStorage.saveBlockInterest.bind(null, 0, 1, 50000), web3);
    });
  });

});
