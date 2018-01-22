"use strict";

const BigNumber = require('bignumber.js');
const InterestRateStorage = artifacts.require("./storage/InterestRateStorage.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

function getBlockUnit(blockNumber) {
  return Math.floor(blockNumber / 10);
}

function getBlocks(web3, assert) {
  const currentBlock = web3.eth.blockNumber;
  const currentBlockUnit = getBlockUnit(currentBlock);

  const blockThreeUnitsBeforeCurrent = currentBlockUnit * 10 - 30;
  const laterBlockThreeUnitsBeforeCurrent = currentBlockUnit * 10 - 25;
  const blockTwoUnitsBeforeCurrent = currentBlockUnit * 10 - 20;
  const laterBlockTwoUnitsBeforeCurrent = currentBlockUnit * 10 - 15;
  const blockOneUnitBeforeCurrent = currentBlockUnit * 10 - 10;
  const laterBlockOneUnitBeforeCurrent = currentBlockUnit * 10 - 5;
  const blockInCurrentBlockUnit = currentBlockUnit * 10;
  const laterBlockInCurrentBlockUnit = currentBlockUnit * 10 + 1;
  const blockInUpcomingBlockUnit = currentBlockUnit * 10 + 10;

  assert(getBlockUnit(blockThreeUnitsBeforeCurrent), currentBlockUnit - 3);
  assert(getBlockUnit(laterBlockThreeUnitsBeforeCurrent), currentBlockUnit - 3);
  assert(getBlockUnit(blockTwoUnitsBeforeCurrent), currentBlockUnit - 2);
  assert(getBlockUnit(laterBlockTwoUnitsBeforeCurrent), currentBlockUnit - 2);
  assert(getBlockUnit(blockOneUnitBeforeCurrent), currentBlockUnit - 1);
  assert(getBlockUnit(laterBlockOneUnitBeforeCurrent), currentBlockUnit - 1);
  assert(getBlockUnit(blockInCurrentBlockUnit), currentBlockUnit);
  assert(getBlockUnit(laterBlockInCurrentBlockUnit), currentBlockUnit);
  assert(getBlockUnit(blockInUpcomingBlockUnit), currentBlockUnit + 1);

  return [
    currentBlock,
    currentBlockUnit,
    blockThreeUnitsBeforeCurrent,
    laterBlockThreeUnitsBeforeCurrent,
    blockTwoUnitsBeforeCurrent,
    laterBlockTwoUnitsBeforeCurrent,
    blockOneUnitBeforeCurrent,
    laterBlockOneUnitBeforeCurrent,
    blockInCurrentBlockUnit,
    laterBlockInCurrentBlockUnit,
    blockInUpcomingBlockUnit
  ];
}

contract('InterestRateStorage', function(accounts) {
  var interestRateStorage;
  var etherToken;

  beforeEach(async () => {
    [interestRateStorage, etherToken] = await Promise.all([InterestRateStorage.new(10), EtherToken.new()]);
    await interestRateStorage.allow(web3.eth.accounts[0]);
  });

  describe('#getSnapshotBlockUnit', async () => {
    it('should reference correct blocks', async() => {
      const [startingBlockNumber, startingBlockUnit] = await utils.buildSnapshots(web3, etherToken, interestRateStorage);

      async function getSnapshotBlockUnit(blockNumber) {
        return (await (interestRateStorage.getSnapshotBlockUnit.call(etherToken.address, blockNumber))).toNumber();
      }

      assert.equal(await getSnapshotBlockUnit(startingBlockNumber - 10), startingBlockUnit);
      assert.equal(await getSnapshotBlockUnit(startingBlockNumber), startingBlockUnit);
      assert.equal(await getSnapshotBlockUnit(startingBlockNumber + 1), startingBlockUnit);
      assert.equal(await getSnapshotBlockUnit(startingBlockNumber + 10), startingBlockUnit + 1);
      assert.equal(await getSnapshotBlockUnit(startingBlockNumber + 20), startingBlockUnit + 2);
      assert.equal(await getSnapshotBlockUnit(startingBlockNumber + 30), startingBlockUnit + 3);
      assert.equal(await getSnapshotBlockUnit(startingBlockNumber + 40), startingBlockUnit + 3);
      assert.equal(await getSnapshotBlockUnit(startingBlockNumber + 50), startingBlockUnit + 3);
    });
  });

  describe('#getSnapshotBlockUnitInterestRate', () => {
    it('should get correct block unit interest rates', async () => {
      const [startingBlockNumber, startingBlockUnit] = await utils.buildSnapshots(web3, etherToken, interestRateStorage);

      async function getSnapshotBlockUnitInterestRate(blockNumber) {
        return (await (interestRateStorage.getSnapshotBlockUnitInterestRate.call(etherToken.address, blockNumber))).toNumber();
      }

      assert.equal(await getSnapshotBlockUnitInterestRate(startingBlockNumber - 10), utils.annualBPSToScaledPerGroupRate(100));
      assert.equal(await getSnapshotBlockUnitInterestRate(startingBlockNumber), utils.annualBPSToScaledPerGroupRate(100));
      assert.equal(await getSnapshotBlockUnitInterestRate(startingBlockNumber + 1), utils.annualBPSToScaledPerGroupRate(100));
      assert.equal(await getSnapshotBlockUnitInterestRate(startingBlockNumber + 10), utils.annualBPSToScaledPerGroupRate(200));
      assert.equal(await getSnapshotBlockUnitInterestRate(startingBlockNumber + 20), utils.annualBPSToScaledPerGroupRate(300));
      assert.equal(await getSnapshotBlockUnitInterestRate(startingBlockNumber + 30), utils.annualBPSToScaledPerGroupRate(400));
      assert.equal(await getSnapshotBlockUnitInterestRate(startingBlockNumber + 40), utils.annualBPSToScaledPerGroupRate(400));
      assert.equal(await getSnapshotBlockUnitInterestRate(startingBlockNumber + 50), utils.annualBPSToScaledPerGroupRate(400));
    });
  });

  describe('#getCompoundedInterestRate', () => {
    it('should get correct block unit interest rates', async () => {
      const [startingBlockNumber, startingBlockUnit] = await utils.buildSnapshots(web3, etherToken, interestRateStorage);

      async function getCompoundedInterestRate(blockNumber) {
        return (await (interestRateStorage.getCompoundedInterestRate.call(etherToken.address, blockNumber))).toNumber();
      }

      // before 1st snapshot, so we use the value from the 1st snapshot,
      // which should have compounded values 100 * 200 * 300 * 400 bps (but converted out of annual bps to scaled storage value for num blocks)
      assert.equal(await getCompoundedInterestRate(startingBlockNumber - 10), 10000004280822504);

      // this matches the 1st snapshot group
      assert.equal(await getCompoundedInterestRate(startingBlockNumber), 10000004280822504);

      // still in the 1st snapshot group
      assert.equal(await getCompoundedInterestRate(startingBlockNumber + 1), 10000004280822504);

      // now in 2nd snapshot, which should have converted value of compounded 200 * 300 * 400 bps
      assert.equal(await getCompoundedInterestRate(startingBlockNumber + 10), 10000003329528429);

      // now in 3rd snapshot, which should have converted value of compounded 300 * 400 bps
      assert.equal(await getCompoundedInterestRate(startingBlockNumber + 20), 10000001902587519);

      // now in 4th snapshot, which should have no compounding yet, because no 5th snapshot rate exists to compound on it
      assert.equal(await getCompoundedInterestRate(startingBlockNumber + 30), 10000000000000000);

      // we've only made 4 snapshots, so return 4th instead of the non-existent 5th.
      assert.equal(await getCompoundedInterestRate(startingBlockNumber + 40), 10000000000000000);

        // we've only made 4 snapshots, so return 4th instead of the non-existent 6th.
      assert.equal(await getCompoundedInterestRate(startingBlockNumber + 50), 10000000000000000);
    });
  });

  describe('#getCurrentBalance', async () => {
    it('should get correct block unit interest rates', async () => {
      const [startingBlockNumber, startingBlockUnit] = await utils.buildSnapshots(web3, etherToken, interestRateStorage);

      async function getCurrentBalance(blockNumber) {
        return (await (interestRateStorage.getCurrentBalance.call(etherToken.address, blockNumber, 20000000000000000))).toNumber();
      }

      assert.equal(await getCurrentBalance(startingBlockNumber - 10), 20000008561645008);
      assert.equal(await getCurrentBalance(startingBlockNumber), 20000008561645008);
      assert.equal(await getCurrentBalance(startingBlockNumber + 1), 20000008561645008);
      assert.equal(await getCurrentBalance(startingBlockNumber + 10), 20000006659056858);
      assert.equal(await getCurrentBalance(startingBlockNumber + 20), 20000003805175038);
      assert.equal(await getCurrentBalance(startingBlockNumber + 30), 20000000000000000);
      assert.equal(await getCurrentBalance(startingBlockNumber + 40), 20000000000000000);
      assert.equal(await getCurrentBalance(startingBlockNumber + 50), 20000000000000000);
    });
  });

  describe('#snapshotCurrentRate', async () => {
    it('should snapshot the block unit', async () => {
      await utils.mineUntilBlockNumberEndsWith(web3, 3);

      var rate = utils.annualBPSToScaledPerGroupRate(500);

      await interestRateStorage.snapshotCurrentRate(etherToken.address, rate);

      const [
        currentBlock,
        currentBlockUnit,
        blockThreeUnitsBeforeCurrent,
        laterBlockThreeUnitsBeforeCurrent,
        blockTwoUnitsBeforeCurrent,
        laterBlockTwoUnitsBeforeCurrent,
        blockOneUnitBeforeCurrent,
        laterBlockOneUnitBeforeCurrent,
        blockInCurrentBlockUnit,
        laterBlockInCurrentBlockUnit,
        blockInUpcomingBlockUnit
      ] = getBlocks(web3, assert);

      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockThreeUnitsBeforeCurrent, currentBlockUnit, rate, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockThreeUnitsBeforeCurrent, currentBlockUnit, rate, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockTwoUnitsBeforeCurrent, currentBlockUnit, rate, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockTwoUnitsBeforeCurrent, currentBlockUnit, rate, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockOneUnitBeforeCurrent, currentBlockUnit, rate, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockOneUnitBeforeCurrent, currentBlockUnit, rate, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInCurrentBlockUnit, currentBlockUnit, rate, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockInCurrentBlockUnit, currentBlockUnit, rate, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInUpcomingBlockUnit, currentBlockUnit, rate, 10000000000000000);
    });

    it('should correctly snapshot two block units', async () => {
      await utils.mineUntilBlockNumberEndsWith(web3, 3);

      var rate500 = utils.annualBPSToScaledPerGroupRate(500);
      var rate501 = utils.annualBPSToScaledPerGroupRate(501);

      await interestRateStorage.snapshotCurrentRate(etherToken.address, rate500);

      // Mine one more block unit
      await utils.mineUntilBlockNumberEndsWith(web3, 3);

      await interestRateStorage.snapshotCurrentRate(etherToken.address, rate501);

      const [
        currentBlock,
        currentBlockUnit,
        blockThreeUnitsBeforeCurrent,
        laterBlockThreeUnitsBeforeCurrent,
        blockTwoUnitsBeforeCurrent,
        laterBlockTwoUnitsBeforeCurrent,
        blockOneUnitBeforeCurrent,
        laterBlockOneUnitBeforeCurrent,
        blockInCurrentBlockUnit,
        laterBlockInCurrentBlockUnit,
        blockInUpcomingBlockUnit
      ] = getBlocks(web3, assert);

      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockThreeUnitsBeforeCurrent, currentBlockUnit - 1, rate500, 10000002382990867);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockThreeUnitsBeforeCurrent, currentBlockUnit - 1, rate500, 10000002382990867);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockTwoUnitsBeforeCurrent, currentBlockUnit - 1, rate500, 10000002382990867);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockTwoUnitsBeforeCurrent, currentBlockUnit - 1, rate500, 10000002382990867);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockOneUnitBeforeCurrent, currentBlockUnit - 1, rate500, 10000002382990867);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockOneUnitBeforeCurrent, currentBlockUnit - 1, rate500, 10000002382990867);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInCurrentBlockUnit, currentBlockUnit, rate501, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockInCurrentBlockUnit, currentBlockUnit, rate501, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInUpcomingBlockUnit, currentBlockUnit, rate501, 10000000000000000);
    });


    // AP: Update this test to use proper rates as inputs for snapshotCurrentRate
    it('should correctly snapshot three block units', async () => {
      await utils.mineUntilBlockNumberEndsWith(web3, 3);

      var rate500 = utils.annualBPSToScaledPerGroupRate(500);
      var rate501 = utils.annualBPSToScaledPerGroupRate(501);
      var rate490 = utils.annualBPSToScaledPerGroupRate(490);

      await interestRateStorage.snapshotCurrentRate(etherToken.address, rate500);

      // Mine one more block unit
      await utils.mineUntilBlockNumberEndsWith(web3, 3);
      await interestRateStorage.snapshotCurrentRate(etherToken.address, rate501);

      // Mine yet another block unit
      await utils.mineUntilBlockNumberEndsWith(web3, 3);
      await interestRateStorage.snapshotCurrentRate(etherToken.address, rate490);

      const [
        currentBlock,
        currentBlockUnit,
        blockThreeUnitsBeforeCurrent,
        laterBlockThreeUnitsBeforeCurrent,
        blockTwoUnitsBeforeCurrent,
        laterBlockTwoUnitsBeforeCurrent,
        blockOneUnitBeforeCurrent,
        laterBlockOneUnitBeforeCurrent,
        blockInCurrentBlockUnit,
        laterBlockInCurrentBlockUnit,
        blockInUpcomingBlockUnit
      ] = getBlocks(web3, assert);

      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockThreeUnitsBeforeCurrent, currentBlockUnit - 2, rate500, 10000004713661132);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockThreeUnitsBeforeCurrent, currentBlockUnit - 2, rate500, 10000004713661132);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockTwoUnitsBeforeCurrent, currentBlockUnit - 2, rate500, 10000004713661132);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockTwoUnitsBeforeCurrent, currentBlockUnit - 2, rate500, 10000004713661132);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockOneUnitBeforeCurrent, currentBlockUnit - 1, rate501, 10000002330669710);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockOneUnitBeforeCurrent, currentBlockUnit - 1, rate501, 10000002330669710);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInCurrentBlockUnit, currentBlockUnit, rate490, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockInCurrentBlockUnit, currentBlockUnit, rate490, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInUpcomingBlockUnit, currentBlockUnit, rate490, 10000000000000000);
    });

    it('should correctly snapshot a fourth day', async () => {
      await utils.mineUntilBlockNumberEndsWith(web3, 7);
      await interestRateStorage.snapshotCurrentRate(etherToken.address, 500);

      // Mine one more block unit
      await utils.mineUntilBlockNumberEndsWith(web3, 6);
      await interestRateStorage.snapshotCurrentRate(etherToken.address, 501);

      // Mine one more block unit
      await utils.mineUntilBlockNumberEndsWith(web3, 5);
      await interestRateStorage.snapshotCurrentRate(etherToken.address, 490);

      // Mine one more block unit
      await utils.mineUntilBlockNumberEndsWith(web3, 1);
      await interestRateStorage.snapshotCurrentRate(etherToken.address, 490);

      const [
        currentBlock,
        currentBlockUnit,
        blockThreeUnitsBeforeCurrent,
        laterBlockThreeUnitsBeforeCurrent,
        blockTwoUnitsBeforeCurrent,
        laterBlockTwoUnitsBeforeCurrent,
        blockOneUnitBeforeCurrent,
        laterBlockOneUnitBeforeCurrent,
        blockInCurrentBlockUnit,
        laterBlockInCurrentBlockUnit,
        blockInUpcomingBlockUnit
      ] = getBlocks(web3, assert);


      // jkl wtf is the 500. 500E-16 per Geoff.
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockThreeUnitsBeforeCurrent, currentBlockUnit - 3, 500, 10000000000001481);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockThreeUnitsBeforeCurrent, currentBlockUnit - 3, 500, 10000000000001481);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockTwoUnitsBeforeCurrent, currentBlockUnit - 2, 501, 10000000000000980);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockTwoUnitsBeforeCurrent, currentBlockUnit - 2, 501, 10000000000000980);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockOneUnitBeforeCurrent, currentBlockUnit - 1, 490, 10000000000000490);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockOneUnitBeforeCurrent, currentBlockUnit - 1, 490, 10000000000000490);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInCurrentBlockUnit, currentBlockUnit, 490, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockInCurrentBlockUnit, currentBlockUnit, 490, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInUpcomingBlockUnit, currentBlockUnit, 490, 10000000000000000);
    });

    it('should correctly snapshot a fourth day missing a third day', async () => {
      await utils.mineUntilBlockNumberEndsWith(web3, 3);

      await interestRateStorage.snapshotCurrentRate(etherToken.address, 500);

      // Mine one more block unit
      await utils.mineUntilBlockNumberEndsWith(web3, 3);

      await interestRateStorage.snapshotCurrentRate(etherToken.address, 501);

      // Skip past a whole block unit!!
      await utils.mineUntilBlockNumberEndsWith(web3, 4);
      await utils.mineUntilBlockNumberEndsWith(web3, 3);

      await interestRateStorage.snapshotCurrentRate(etherToken.address, 490);

      const [
        currentBlock,
        currentBlockUnit,
        blockThreeUnitsBeforeCurrent,
        laterBlockThreeUnitsBeforeCurrent,
        blockTwoUnitsBeforeCurrent,
        laterBlockTwoUnitsBeforeCurrent,
        blockOneUnitBeforeCurrent,
        laterBlockOneUnitBeforeCurrent,
        blockInCurrentBlockUnit,
        laterBlockInCurrentBlockUnit,
        blockInUpcomingBlockUnit
      ] = getBlocks(web3, assert);

      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockThreeUnitsBeforeCurrent, currentBlockUnit - 3, 500, 10000000000001481);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockThreeUnitsBeforeCurrent, currentBlockUnit - 3, 500, 10000000000001481);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockTwoUnitsBeforeCurrent, currentBlockUnit - 2, 501, 10000000000000980);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockTwoUnitsBeforeCurrent, currentBlockUnit - 2, 501, 10000000000000980);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockOneUnitBeforeCurrent, currentBlockUnit - 1, 490, 10000000000000490);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockOneUnitBeforeCurrent, currentBlockUnit - 1, 490, 10000000000000490);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInCurrentBlockUnit, currentBlockUnit, 490, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockInCurrentBlockUnit, currentBlockUnit, 490, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInUpcomingBlockUnit, currentBlockUnit, 490, 10000000000000000);
    });

    it('should be allowed only', async () => {
      await utils.mineBlocks(web3, 10);
      await utils.assertOnlyAllowed(interestRateStorage, interestRateStorage.snapshotCurrentRate.bind(null, etherToken.address, 200), web3, utils.mineBlocks.bind(null, web3, 10));
    });
  });

  describe('#getBlockUnit', async () => {
    it('should return correct units for given scale', async () => {
      assert.equal((await interestRateStorage.getBlockUnit.call(150)).valueOf(), 15);
      assert.equal((await interestRateStorage.getBlockUnit.call(255)).valueOf(), 25);
      assert.equal((await interestRateStorage.getBlockUnit.call(999999999)).valueOf(), 99999999);
      assert.equal((await interestRateStorage.getBlockUnit.call(998)).valueOf(), 99);
      assert.equal((await interestRateStorage.getBlockUnit.call(9)).valueOf(), 0);
      assert.equal((await interestRateStorage.getBlockUnit.call(20)).valueOf(), 2);
      assert.equal((await interestRateStorage.getBlockUnit.call(10)).valueOf(), 1);
      assert.equal((await interestRateStorage.getBlockUnit.call(11)).valueOf(), 1);
      assert.equal((await interestRateStorage.getBlockUnit.call(0)).valueOf(), 0);
    });
  })
});
