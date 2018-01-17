const BigNumber = require('bignumber.js');
const InterestRateStorage = artifacts.require("./storage/InterestRateStorage.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

const SECONDS_IN_A_DAY = ( 60 * 60 * 24 );

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
      [startingBlockNumber, startingBlockUnit] = await utils.buildSnapshots(web3, etherToken, interestRateStorage);

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
      [startingBlockNumber, startingBlockUnit] = await utils.buildSnapshots(web3, etherToken, interestRateStorage);

      async function getSnapshotBlockUnitInterestRate(blockNumber) {
        return (await (interestRateStorage.getSnapshotBlockUnitInterestRate.call(etherToken.address, blockNumber))).toNumber();
      }

      assert.equal(await getSnapshotBlockUnitInterestRate(startingBlockNumber - 10), 100);
      assert.equal(await getSnapshotBlockUnitInterestRate(startingBlockNumber), 100);
      assert.equal(await getSnapshotBlockUnitInterestRate(startingBlockNumber + 1), 100);
      assert.equal(await getSnapshotBlockUnitInterestRate(startingBlockNumber + 10), 200);
      assert.equal(await getSnapshotBlockUnitInterestRate(startingBlockNumber + 20), 300);
      assert.equal(await getSnapshotBlockUnitInterestRate(startingBlockNumber + 30), 400);
      assert.equal(await getSnapshotBlockUnitInterestRate(startingBlockNumber + 40), 400);
      assert.equal(await getSnapshotBlockUnitInterestRate(startingBlockNumber + 50), 400);
    });
  });

  describe('#getCompoundedInterestRate', () => {
    it('should get correct block unit interest rates', async () => {
      [startingBlockNumber, startingBlockUnit] = await utils.buildSnapshots(web3, etherToken, interestRateStorage);

      async function getCompoundedInterestRate(blockNumber) {
        return (await (interestRateStorage.getCompoundedInterestRate.call(etherToken.address, blockNumber))).toNumber();
      }

      assert.equal(await getCompoundedInterestRate(startingBlockNumber - 10), 10000000000000900);
      assert.equal(await getCompoundedInterestRate(startingBlockNumber), 10000000000000900);
      assert.equal(await getCompoundedInterestRate(startingBlockNumber + 1), 10000000000000900);
      assert.equal(await getCompoundedInterestRate(startingBlockNumber + 10), 10000000000000700);
      assert.equal(await getCompoundedInterestRate(startingBlockNumber + 20), 10000000000000400);
      assert.equal(await getCompoundedInterestRate(startingBlockNumber + 30), 10000000000000000);
      assert.equal(await getCompoundedInterestRate(startingBlockNumber + 40), 10000000000000000);
      assert.equal(await getCompoundedInterestRate(startingBlockNumber + 50), 10000000000000000);
    });
  });

  describe('#getCurrentBalance', async () => {
    it('should get correct block unit interest rates', async () => {
      [startingBlockNumber, startingBlockUnit] = await utils.buildSnapshots(web3, etherToken, interestRateStorage);

      async function getCurrentBalance(blockNumber) {
        return (await (interestRateStorage.getCurrentBalance.call(etherToken.address, blockNumber, 20000000000000000))).toNumber();
      }

      assert.equal(await getCurrentBalance(startingBlockNumber - 10), 20000000000001800);
      assert.equal(await getCurrentBalance(startingBlockNumber), 20000000000001800);
      assert.equal(await getCurrentBalance(startingBlockNumber + 1), 20000000000001800);
      assert.equal(await getCurrentBalance(startingBlockNumber + 10), 20000000000001400);
      assert.equal(await getCurrentBalance(startingBlockNumber + 20), 20000000000000800);
      assert.equal(await getCurrentBalance(startingBlockNumber + 30), 20000000000000000);
      assert.equal(await getCurrentBalance(startingBlockNumber + 40), 20000000000000000);
      assert.equal(await getCurrentBalance(startingBlockNumber + 50), 20000000000000000);
    });
  });

  describe('#snapshotCurrentRate', async () => {
    it('should snapshot the block unit', async () => {
      await utils.mineUntilBlockNumberEndsWith(web3, 3);

      await interestRateStorage.snapshotCurrentRate(etherToken.address, 500);

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

      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockThreeUnitsBeforeCurrent, currentBlockUnit, 500, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockThreeUnitsBeforeCurrent, currentBlockUnit, 500, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockTwoUnitsBeforeCurrent, currentBlockUnit, 500, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockTwoUnitsBeforeCurrent, currentBlockUnit, 500, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockOneUnitBeforeCurrent, currentBlockUnit, 500, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockOneUnitBeforeCurrent, currentBlockUnit, 500, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInCurrentBlockUnit, currentBlockUnit, 500, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockInCurrentBlockUnit, currentBlockUnit, 500, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInUpcomingBlockUnit, currentBlockUnit, 500, 10000000000000000);
    });

    it('should correctly snapshot two block units', async () => {
      await utils.mineUntilBlockNumberEndsWith(web3, 3);

      await interestRateStorage.snapshotCurrentRate(etherToken.address, 500);

      // Mine one more block unit
      await utils.mineUntilBlockNumberEndsWith(web3, 3);

      await interestRateStorage.snapshotCurrentRate(etherToken.address, 501);

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

      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockThreeUnitsBeforeCurrent, currentBlockUnit - 1, 500, 10000000000000501);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockThreeUnitsBeforeCurrent, currentBlockUnit - 1, 500, 10000000000000501);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockTwoUnitsBeforeCurrent, currentBlockUnit - 1, 500, 10000000000000501);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockTwoUnitsBeforeCurrent, currentBlockUnit - 1, 500, 10000000000000501);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockOneUnitBeforeCurrent, currentBlockUnit - 1, 500, 10000000000000501);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockOneUnitBeforeCurrent, currentBlockUnit - 1, 500, 10000000000000501);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInCurrentBlockUnit, currentBlockUnit, 501, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockInCurrentBlockUnit, currentBlockUnit, 501, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInUpcomingBlockUnit, currentBlockUnit, 501, 10000000000000000);
    });

    it('should correctly snapshot three block units', async () => {
      await utils.mineUntilBlockNumberEndsWith(web3, 3);

      await interestRateStorage.snapshotCurrentRate(etherToken.address, 500);

      // Mine one more block unit
      await utils.mineUntilBlockNumberEndsWith(web3, 3);
      await interestRateStorage.snapshotCurrentRate(etherToken.address, 501);

      // Mine yet another block unit
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

      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockThreeUnitsBeforeCurrent, currentBlockUnit - 2, 500, 10000000000000991);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockThreeUnitsBeforeCurrent, currentBlockUnit - 2, 500, 10000000000000991);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockTwoUnitsBeforeCurrent, currentBlockUnit - 2, 500, 10000000000000991);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockTwoUnitsBeforeCurrent, currentBlockUnit - 2, 500, 10000000000000991);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockOneUnitBeforeCurrent, currentBlockUnit - 1, 501, 10000000000000490);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockOneUnitBeforeCurrent, currentBlockUnit - 1, 501, 10000000000000490);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInCurrentBlockUnit, currentBlockUnit, 490, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, laterBlockInCurrentBlockUnit, currentBlockUnit, 490, 10000000000000000);
      await utils.assertInterestRate(assert, interestRateStorage, etherToken.address, blockInUpcomingBlockUnit, currentBlockUnit, 490, 10000000000000000);
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
