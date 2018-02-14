"use strict";

const InterestRateStorage = artifacts.require("./storage/InterestRateStorage.sol");
const utils = require('./utils');

contract('InterestRateStorage', function(accounts) {
  var interestRateStorage;

    const cashLedger = 0;
    const asset = 1;
    const otherAsset = 2;
    const twoEth = 2e18;

  beforeEach(async () => {
    interestRateStorage = await InterestRateStorage.new();
    await interestRateStorage.allow(web3.eth.accounts[0]);
  });

    describe('#getCurrentBalance', async () => {
        it('should return correct balance', async () => {
        const blockRate1 = 5e-13;
        await interestRateStorage.saveBlockInterest(cashLedger, asset, utils.scaleInterest(blockRate1));

        const primaryBlockNumber = await interestRateStorage.blockInterestBlock(cashLedger, asset);
        const primaryTotalInterest = (await interestRateStorage.blockTotalInterest(cashLedger, asset, primaryBlockNumber)).toNumber();

        await utils.mineBlocks(web3, 20);
        const numBlocksAtRate1 = 21;  // we mined 20 and are now in the 21st block after the rate was set
        await interestRateStorage.saveBlockInterest(cashLedger, asset, utils.scaleInterest(1e-3));

        const currentBalance = await interestRateStorage.getCurrentBalance.call(cashLedger, asset, primaryBlockNumber, twoEth);
        assert.closeTo(currentBalance.toNumber(), twoEth * ( 1 + blockRate1 * numBlocksAtRate1 ), 10000);
    });
});

  describe('#getBalanceAt', async () => {
    it('reverts when no starting or ending total interest', async () => {

      // utils.scaleInterest() lets us specify the number in the scale we are used to in our daily lives
      // and have it converted to what the contract works in.
      await interestRateStorage.saveBlockInterest(cashLedger, asset, utils.scaleInterest(5e-13));

      const primaryBlockNumber = await interestRateStorage.blockInterestBlock(cashLedger, asset);
      const primaryTotalInterest = (await interestRateStorage.blockTotalInterest(cashLedger, asset, primaryBlockNumber)).toNumber();

      await utils.mineBlocks(web3, 20);
      await interestRateStorage.saveBlockInterest(cashLedger, asset, utils.scaleInterest(0.001));

      const secondaryBlockNumber = await interestRateStorage.blockInterestBlock(cashLedger, asset);
      const secondaryTotalInterest = (await interestRateStorage.blockTotalInterest(cashLedger, asset, secondaryBlockNumber)).toNumber();

      await utils.mineBlocks(web3, 20);
      // too bad javascript doesn't like 6_000_000.
      // if not using utils.scaleInterest, use exponent.
      await interestRateStorage.saveBlockInterest(cashLedger, asset, 6e6);

      const tertiaryBlockNumber = await interestRateStorage.blockInterestBlock(0, asset);
      const tertiaryTotalInterest = (await interestRateStorage.blockTotalInterest(0, asset, tertiaryBlockNumber)).toNumber();

      const principal = 100;

      assert.equal((await interestRateStorage.getBalanceAt.call(cashLedger, asset, primaryBlockNumber + 1, secondaryBlockNumber, principal)).toNumber(), principal);

      // what are these doing?
      await interestRateStorage.getBalanceAt(999, 1, primaryBlockNumber, secondaryBlockNumber, principal);
      await interestRateStorage.getBalanceAt(0, 999, primaryBlockNumber, secondaryBlockNumber, principal);

      // Make sure it works normally, correctly
      await interestRateStorage.getBalanceAt(cashLedger, asset, primaryBlockNumber, secondaryBlockNumber, principal);

      // Okay because primary interest is 0
      await interestRateStorage.getBalanceAt(cashLedger, asset, primaryBlockNumber, secondaryBlockNumber + 1, principal);

      await utils.assertFailure('VM Exception while processing transaction: revert', async () => {
        await interestRateStorage.getBalanceAt(cashLedger, asset, secondaryBlockNumber, tertiaryBlockNumber + 1, principal);
      });
    });

    it('calculates correct interest', async () => {
      const principal = 2e18; // 2 ether
      const primaryInterest = 0.05; // 5% interest per block
      const secondaryInterest = 0.1; // 10% interest per block
      const tertiaryInterest = 1.0; // 100% interest per block
      const quartaryInterest = 0.2; // 20% interest per block

      // make a shorter call
      function scale(interest) {
        return utils.scaleInterest(interest);
      }

      await interestRateStorage.saveBlockInterest(0, 1, scale(primaryInterest));

      const primaryBlockNumber = (await interestRateStorage.blockInterestBlock(0, 1)).toNumber();
      await utils.mineBlocks(web3, 9);
      await interestRateStorage.saveBlockInterest(0, 1, scale(secondaryInterest));
      const secondaryBlockNumber = (await interestRateStorage.blockInterestBlock(0, 1)).toNumber();
      await utils.mineBlocks(web3, 19);
      await interestRateStorage.saveBlockInterest(0, 1, scale(tertiaryInterest));
      const tertiaryBlockNumber = (await interestRateStorage.blockInterestBlock(0, 1)).toNumber();
      await utils.mineBlocks(web3, 9);
      await interestRateStorage.saveBlockInterest(0, 1, scale(quartaryInterest));
      const quartaryBlockNumber = (await interestRateStorage.blockInterestBlock(0, 1)).toNumber();

      const balanceAtoB = (await interestRateStorage.getBalanceAt.call(0, 1, primaryBlockNumber, secondaryBlockNumber, principal)).toNumber();
      await interestRateStorage.getBalanceAt(0, 1, primaryBlockNumber, secondaryBlockNumber, principal);
      const expectedBalanceAtoB = Math.trunc(
        principal *
        ( 1 + ( secondaryBlockNumber - primaryBlockNumber ) * primaryInterest )
      );

      assert.equal(
        balanceAtoB,
        expectedBalanceAtoB
      );

      const balanceAtoC = (await interestRateStorage.getBalanceAt.call(cashLedger, asset, primaryBlockNumber, tertiaryBlockNumber, principal)).toNumber();
      await interestRateStorage.getBalanceAt(cashLedger, asset, primaryBlockNumber, tertiaryBlockNumber, principal);
      const expectedBalanceAtoC = Math.trunc(
        principal *
        (
          1 + (
            ( tertiaryBlockNumber - secondaryBlockNumber ) * secondaryInterest +
            ( secondaryBlockNumber - primaryBlockNumber ) * primaryInterest
          )
        )
      );

      assert.equal(
        balanceAtoC,
        expectedBalanceAtoC
      );

      const balanceBtoC = (await interestRateStorage.getBalanceAt.call(cashLedger, asset, secondaryBlockNumber, tertiaryBlockNumber, principal)).toNumber();
      await interestRateStorage.getBalanceAt(cashLedger, asset, secondaryBlockNumber, tertiaryBlockNumber, principal);
      const expectedBalanceBtoC = Math.trunc(
        principal *
        (
          1 + (
            ( tertiaryBlockNumber - secondaryBlockNumber ) * secondaryInterest
          )
        )
      );

      assert.equal(
        balanceBtoC,
        expectedBalanceBtoC
      );
    });
  });

  describe('#saveBlockInterest', async () => {
    it('should start with given interest rate', async () => {
      await interestRateStorage.saveBlockInterest(cashLedger, asset, 50000);

      const blockNumber = await interestRateStorage.blockInterestBlock(cashLedger, asset);

      assert.isAbove(blockNumber, 0);

      assert.equal((await interestRateStorage.blockTotalInterest(cashLedger, asset, blockNumber)).toNumber(), 0);
      assert.equal((await interestRateStorage.blockInterestRate(cashLedger, asset, blockNumber)).toNumber(), 50000);
    });

    it('shouldnt affect another asset', async () => {

      await interestRateStorage.saveBlockInterest(cashLedger, asset, 50000);
      const blockNumber = await interestRateStorage.blockInterestBlock(cashLedger, asset);

      assert.equal(await interestRateStorage.blockInterestBlock(cashLedger, otherAsset), 0);
      assert.equal(await interestRateStorage.blockTotalInterest(cashLedger, otherAsset, blockNumber), 0);
      assert.equal(await interestRateStorage.blockInterestRate(cashLedger, otherAsset, blockNumber), 0);
    });

    it('should capture a new total interest', async () => {
      const initialBlockRate = 50000;
      // Let's say this was done in block 5.
      await interestRateStorage.saveBlockInterest(cashLedger, asset, initialBlockRate);


      const primaryBlockNumber = await interestRateStorage.blockInterestBlock(cashLedger, asset);
      const primaryTotalInterest = (await interestRateStorage.blockTotalInterest(cashLedger, asset, primaryBlockNumber)).toNumber();

      await utils.mineBlocks(web3, 20);
      // Assuming we started in block 5, after mining 20 blocks we are now in block 26.
      await interestRateStorage.saveBlockInterest(cashLedger, asset, 1e14);

      const secondaryBlockNumber = await interestRateStorage.blockInterestBlock(cashLedger, asset);
      const secondaryTotalInterest = (await interestRateStorage.blockTotalInterest(cashLedger, asset, secondaryBlockNumber)).toNumber();

      // 21 blocks had initialBlockRate: block 26 - block 5 = 21 blocks.
      assert.equal(secondaryTotalInterest - primaryTotalInterest, initialBlockRate * 21);
    });

    // Sadly, can't test repeated total interest since ganache
    // only gives us one trx per block

    it('should be allowed only', async () => {
      await utils.assertOnlyAllowed(interestRateStorage, interestRateStorage.saveBlockInterest.bind(null, cashLedger, asset, 50000), web3);
    });
  });

});
