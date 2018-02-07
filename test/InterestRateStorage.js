"use strict";

const BigNumber = require('bignumber.js');
const InterestRateStorage = artifacts.require("./storage/InterestRateStorage.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

contract('InterestRateStorage', function(accounts) {
  var interestRateStorage;
  var etherToken;

  beforeEach(async () => {
    [interestRateStorage, etherToken] = await Promise.all([InterestRateStorage.new(10), EtherToken.new()]);
    await interestRateStorage.allow(web3.eth.accounts[0]);
  });

  describe('#getCurrentBalance', async () => {
    it('reverts when no starting total interest');
    it('reverts when no ending total interest');
    it('calculates correct interest');
  });

  describe('#saveBlockInterest', async () => {
    it.only('should start with given interest rate', async () => {
      await interestRateStorage.saveBlockInterest(0, 1, 50000); //

      const blockNumber = await interestRateStorage.blockInterestBlock(0, 1);

      assert.isAbove(blockNumber, 0);

      const totalInterest = (await interestRateStorage.blockInterest(0, 1, blockNumber)).toNumber();

      console.log(totalInterest);

      assert.equal(await interestRateStorage.blockInterestBlock(5, 1), 0);
      assert.equal(await interestRateStorage.blockInterest(5, 1, blockNumber), 0);
    });

    it.only('should capture a new total interest', async () => {
      await interestRateStorage.saveBlockInterest(0, 1, 50000);

      const primaryBlockNumber = await interestRateStorage.blockInterestBlock(0, 1);
      const primaryTotalInterest = (await interestRateStorage.blockInterest(0, 1, primaryBlockNumber)).toNumber();

      await interestRateStorage.saveBlockInterest(0, 1, 100000000000000);

      const secondaryBlockNumber = await interestRateStorage.blockInterestBlock(0, 1);
      const secondaryTotalInterest = (await interestRateStorage.blockInterest(0, 1, secondaryBlockNumber)).toNumber();

      console.log(primaryTotalInterest);
      console.log(secondaryTotalInterest);
    });

    // Sadly, can't test repeated total interest since ganache
    // only gives us one trx per block

    it.only('should be allowed only', async () => {
      await utils.assertOnlyAllowed(interestRateStorage, interestRateStorage.saveBlockInterest.bind(null, 0, 1, 50000), web3);
    });
  });

  // describe('#getCompoundedInterestRate', () => {
  //   it('should get correct block unit interest rates', async () => {
  //     const [startingBlockNumber, startingBlockUnit] = await utils.buildSnapshots(web3, etherToken, interestRateStorage);

  //     async function getCompoundedInterestRate(blockNumber) {
  //       return (await (interestRateStorage.getCompoundedInterestRate.call(etherToken.address, blockNumber))).toNumber();
  //     }

  //     // before 1st snapshot, so we use the value from the 1st snapshot,
  //     // which should have compounded values 100 * 200 * 300 * 400 bps (but converted out of annual bps to scaled storage value for num blocks)
  //     assert.equal(await getCompoundedInterestRate(startingBlockNumber - 10), 10000004280822504);

  //     // this matches the 1st snapshot group
  //     assert.equal(await getCompoundedInterestRate(startingBlockNumber), 10000004280822504);

  //     // still in the 1st snapshot group
  //     assert.equal(await getCompoundedInterestRate(startingBlockNumber + 1), 10000004280822504);

  //     // now in 2nd snapshot, which should have converted value of compounded 200 * 300 * 400 bps
  //     assert.equal(await getCompoundedInterestRate(startingBlockNumber + 10), 10000003329528429);

  //     // now in 3rd snapshot, which should have converted value of compounded 300 * 400 bps
  //     assert.equal(await getCompoundedInterestRate(startingBlockNumber + 20), 10000001902587519);

  //     // now in 4th snapshot, which should have no compounding yet, because no 5th snapshot rate exists to compound on it
  //     assert.equal(await getCompoundedInterestRate(startingBlockNumber + 30), 10000000000000000);

  //     // we've only made 4 snapshots, so return 4th instead of the non-existent 5th.
  //     assert.equal(await getCompoundedInterestRate(startingBlockNumber + 40), 10000000000000000);

  //       // we've only made 4 snapshots, so return 4th instead of the non-existent 6th.
  //     assert.equal(await getCompoundedInterestRate(startingBlockNumber + 50), 10000000000000000);
  //   });
  // });

  // describe('#getCurrentBalance', async () => {
  //   it('should get correct block unit interest rates', async () => {
  //     const [startingBlockNumber, startingBlockUnit] = await utils.buildSnapshots(web3, etherToken, interestRateStorage);

  //     async function getCurrentBalance(blockNumber) {
  //       return (await (interestRateStorage.getCurrentBalance.call(etherToken.address, blockNumber, 20000000000000000))).toNumber();
  //     }

  //     assert.equal(await getCurrentBalance(startingBlockNumber - 10), 20000008561645008);
  //     assert.equal(await getCurrentBalance(startingBlockNumber), 20000008561645008);
  //     assert.equal(await getCurrentBalance(startingBlockNumber + 1), 20000008561645008);
  //     assert.equal(await getCurrentBalance(startingBlockNumber + 10), 20000006659056858);
  //     assert.equal(await getCurrentBalance(startingBlockNumber + 20), 20000003805175038);
  //     assert.equal(await getCurrentBalance(startingBlockNumber + 30), 20000000000000000);
  //     assert.equal(await getCurrentBalance(startingBlockNumber + 40), 20000000000000000);
  //     assert.equal(await getCurrentBalance(startingBlockNumber + 50), 20000000000000000);
  //   });
  // });

  // describe('#snapshotCurrentRate', async () => {
  //   it('should snapshot the block unit', async () => {
  //     await utils.mineUntilBlockNumberEndsWith(web3, 3);

  //     var rate = utils.annualBPSToScaledPerGroupRate(500);

  //     await interestRateStorage.snapshotCurrentRate(etherToken.address, rate);

  //     const [
  //       currentBlock,
  //       currentBlockUnit,
  //       blockThreeUnitsBeforeCurrent,
  //       laterBlockThreeUnitsBeforeCurrent,
  //       blockTwoUnitsBeforeCurrent,
  //       laterBlockTwoUnitsBeforeCurrent,
  //       blockOneUnitBeforeCurrent,
  //       laterBlockOneUnitBeforeCurrent,
  //       blockInCurrentBlockUnit,
  //       laterBlockInCurrentBlockUnit,
  //       blockInUpcomingBlockUnit
  //     ] = getBlocks(web3, assert);

  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockThreeUnitsBeforeCurrent, currentBlockUnit, rate, 10000000000000000);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockThreeUnitsBeforeCurrent, currentBlockUnit, rate, 10000000000000000);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockTwoUnitsBeforeCurrent, currentBlockUnit, rate, 10000000000000000);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockTwoUnitsBeforeCurrent, currentBlockUnit, rate, 10000000000000000);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockOneUnitBeforeCurrent, currentBlockUnit, rate, 10000000000000000);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockOneUnitBeforeCurrent, currentBlockUnit, rate, 10000000000000000);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInCurrentBlockUnit, currentBlockUnit, rate, 10000000000000000);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockInCurrentBlockUnit, currentBlockUnit, rate, 10000000000000000);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInUpcomingBlockUnit, currentBlockUnit, rate, 10000000000000000);
  //   });

  //   it('should correctly snapshot two block units', async () => {
  //     await utils.mineUntilBlockNumberEndsWith(web3, 3);

  //     var rate500 = utils.annualBPSToScaledPerGroupRate(500);
  //     var rate501 = utils.annualBPSToScaledPerGroupRate(501);

  //     await interestRateStorage.snapshotCurrentRate(etherToken.address, rate500);

  //     // Mine one more block unit
  //     await utils.mineUntilBlockNumberEndsWith(web3, 3);

  //     await interestRateStorage.snapshotCurrentRate(etherToken.address, rate501);

  //     const [
  //       currentBlock,
  //       currentBlockUnit,
  //       blockThreeUnitsBeforeCurrent,
  //       laterBlockThreeUnitsBeforeCurrent,
  //       blockTwoUnitsBeforeCurrent,
  //       laterBlockTwoUnitsBeforeCurrent,
  //       blockOneUnitBeforeCurrent,
  //       laterBlockOneUnitBeforeCurrent,
  //       blockInCurrentBlockUnit,
  //       laterBlockInCurrentBlockUnit,
  //       blockInUpcomingBlockUnit
  //     ] = getBlocks(web3, assert);

  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockThreeUnitsBeforeCurrent, currentBlockUnit - 1, rate500, 10000002382990867);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockThreeUnitsBeforeCurrent, currentBlockUnit - 1, rate500, 10000002382990867);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockTwoUnitsBeforeCurrent, currentBlockUnit - 1, rate500, 10000002382990867);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockTwoUnitsBeforeCurrent, currentBlockUnit - 1, rate500, 10000002382990867);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockOneUnitBeforeCurrent, currentBlockUnit - 1, rate500, 10000002382990867);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockOneUnitBeforeCurrent, currentBlockUnit - 1, rate500, 10000002382990867);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInCurrentBlockUnit, currentBlockUnit, rate501, 10000000000000000);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockInCurrentBlockUnit, currentBlockUnit, rate501, 10000000000000000);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInUpcomingBlockUnit, currentBlockUnit, rate501, 10000000000000000);
  //   });


  //   // AP: Update this test to use proper rates as inputs for snapshotCurrentRate
  //   it('should correctly snapshot three block units', async () => {
  //     await utils.mineUntilBlockNumberEndsWith(web3, 3);

  //     var rate500 = utils.annualBPSToScaledPerGroupRate(500);
  //     var rate501 = utils.annualBPSToScaledPerGroupRate(501);
  //     var rate490 = utils.annualBPSToScaledPerGroupRate(490);

  //     await interestRateStorage.snapshotCurrentRate(etherToken.address, rate500);

  //     // Mine one more block unit
  //     await utils.mineUntilBlockNumberEndsWith(web3, 3);
  //     await interestRateStorage.snapshotCurrentRate(etherToken.address, rate501);

  //     // Mine yet another block unit
  //     await utils.mineUntilBlockNumberEndsWith(web3, 3);
  //     await interestRateStorage.snapshotCurrentRate(etherToken.address, rate490);

  //     const [
  //       currentBlock,
  //       currentBlockUnit,
  //       blockThreeUnitsBeforeCurrent,
  //       laterBlockThreeUnitsBeforeCurrent,
  //       blockTwoUnitsBeforeCurrent,
  //       laterBlockTwoUnitsBeforeCurrent,
  //       blockOneUnitBeforeCurrent,
  //       laterBlockOneUnitBeforeCurrent,
  //       blockInCurrentBlockUnit,
  //       laterBlockInCurrentBlockUnit,
  //       blockInUpcomingBlockUnit
  //     ] = getBlocks(web3, assert);

  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockThreeUnitsBeforeCurrent, currentBlockUnit - 2, rate500, 10000004713661132);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockThreeUnitsBeforeCurrent, currentBlockUnit - 2, rate500, 10000004713661132);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockTwoUnitsBeforeCurrent, currentBlockUnit - 2, rate500, 10000004713661132);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockTwoUnitsBeforeCurrent, currentBlockUnit - 2, rate500, 10000004713661132);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockOneUnitBeforeCurrent, currentBlockUnit - 1, rate501, 10000002330669710);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockOneUnitBeforeCurrent, currentBlockUnit - 1, rate501, 10000002330669710);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInCurrentBlockUnit, currentBlockUnit, rate490, 10000000000000000);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockInCurrentBlockUnit, currentBlockUnit, rate490, 10000000000000000);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInUpcomingBlockUnit, currentBlockUnit, rate490, 10000000000000000);
  //   });

  //   it('should correctly snapshot a fourth day', async () => {
  //     await utils.mineUntilBlockNumberEndsWith(web3, 7);
  //     await interestRateStorage.snapshotCurrentRate(etherToken.address, 500);

  //     // Mine one more block unit
  //     await utils.mineUntilBlockNumberEndsWith(web3, 6);
  //     await interestRateStorage.snapshotCurrentRate(etherToken.address, 501);

  //     // Mine one more block unit
  //     await utils.mineUntilBlockNumberEndsWith(web3, 5);
  //     await interestRateStorage.snapshotCurrentRate(etherToken.address, 490);

  //     // Mine one more block unit
  //     await utils.mineUntilBlockNumberEndsWith(web3, 1);
  //     await interestRateStorage.snapshotCurrentRate(etherToken.address, 490);

  //     const [
  //       currentBlock,
  //       currentBlockUnit,
  //       blockThreeUnitsBeforeCurrent,
  //       laterBlockThreeUnitsBeforeCurrent,
  //       blockTwoUnitsBeforeCurrent,
  //       laterBlockTwoUnitsBeforeCurrent,
  //       blockOneUnitBeforeCurrent,
  //       laterBlockOneUnitBeforeCurrent,
  //       blockInCurrentBlockUnit,
  //       laterBlockInCurrentBlockUnit,
  //       blockInUpcomingBlockUnit
  //     ] = getBlocks(web3, assert);


  //     // jkl wtf is the 500. 500E-16 per Geoff.
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockThreeUnitsBeforeCurrent, currentBlockUnit - 3, 500, 10000000000001481);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockThreeUnitsBeforeCurrent, currentBlockUnit - 3, 500, 10000000000001481);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockTwoUnitsBeforeCurrent, currentBlockUnit - 2, 501, 10000000000000980);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockTwoUnitsBeforeCurrent, currentBlockUnit - 2, 501, 10000000000000980);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockOneUnitBeforeCurrent, currentBlockUnit - 1, 490, 10000000000000490);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockOneUnitBeforeCurrent, currentBlockUnit - 1, 490, 10000000000000490);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInCurrentBlockUnit, currentBlockUnit, 490, 10000000000000000);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockInCurrentBlockUnit, currentBlockUnit, 490, 10000000000000000);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInUpcomingBlockUnit, currentBlockUnit, 490, 10000000000000000);
  //   });

  //   it('should correctly snapshot a fourth day missing a third day', async () => {
  //     await utils.mineUntilBlockNumberEndsWith(web3, 3);

  //     await interestRateStorage.snapshotCurrentRate(etherToken.address, 500);

  //     // Mine one more block unit
  //     await utils.mineUntilBlockNumberEndsWith(web3, 3);

  //     await interestRateStorage.snapshotCurrentRate(etherToken.address, 501);

  //     // Skip past a whole block unit!!
  //     await utils.mineUntilBlockNumberEndsWith(web3, 4);
  //     await utils.mineUntilBlockNumberEndsWith(web3, 3);

  //     await interestRateStorage.snapshotCurrentRate(etherToken.address, 490);

  //     const [
  //       currentBlock,
  //       currentBlockUnit,
  //       blockThreeUnitsBeforeCurrent,
  //       laterBlockThreeUnitsBeforeCurrent,
  //       blockTwoUnitsBeforeCurrent,
  //       laterBlockTwoUnitsBeforeCurrent,
  //       blockOneUnitBeforeCurrent,
  //       laterBlockOneUnitBeforeCurrent,
  //       blockInCurrentBlockUnit,
  //       laterBlockInCurrentBlockUnit,
  //       blockInUpcomingBlockUnit
  //     ] = getBlocks(web3, assert);

  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockThreeUnitsBeforeCurrent, currentBlockUnit - 3, 500, 10000000000001481);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockThreeUnitsBeforeCurrent, currentBlockUnit - 3, 500, 10000000000001481);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockTwoUnitsBeforeCurrent, currentBlockUnit - 2, 501, 10000000000000980);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockTwoUnitsBeforeCurrent, currentBlockUnit - 2, 501, 10000000000000980);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockOneUnitBeforeCurrent, currentBlockUnit - 1, 490, 10000000000000490);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockOneUnitBeforeCurrent, currentBlockUnit - 1, 490, 10000000000000490);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInCurrentBlockUnit, currentBlockUnit, 490, 10000000000000000);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockInCurrentBlockUnit, currentBlockUnit, 490, 10000000000000000);
  //     await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInUpcomingBlockUnit, currentBlockUnit, 490, 10000000000000000);
  //   });

  //   it('should be allowed only', async () => {
  //     await utils.mineBlocks(web3, 10);
  //     await utils.assertOnlyAllowed(interestRateStorage, interestRateStorage.snapshotCurrentRate.bind(null, etherToken.address, 200), web3, utils.mineBlocks.bind(null, web3, 10));
  //   });
  // });

  // describe('#getBlockUnit', async () => {
  //   it('should return correct units for given scale', async () => {
  //     assert.equal((await interestRateStorage.getBlockUnit.call(150)).valueOf(), 15);
  //     assert.equal((await interestRateStorage.getBlockUnit.call(255)).valueOf(), 25);
  //     assert.equal((await interestRateStorage.getBlockUnit.call(999999999)).valueOf(), 99999999);
  //     assert.equal((await interestRateStorage.getBlockUnit.call(998)).valueOf(), 99);
  //     assert.equal((await interestRateStorage.getBlockUnit.call(9)).valueOf(), 0);
  //     assert.equal((await interestRateStorage.getBlockUnit.call(20)).valueOf(), 2);
  //     assert.equal((await interestRateStorage.getBlockUnit.call(10)).valueOf(), 1);
  //     assert.equal((await interestRateStorage.getBlockUnit.call(11)).valueOf(), 1);
  //     assert.equal((await interestRateStorage.getBlockUnit.call(0)).valueOf(), 0);
  //   });
  // })
});
