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

  describe('#setInterestRate', () => {
    it("should set interest rate", async () => {
      await interestRateStorage.setInterestRate(etherToken.address, 500, {from: web3.eth.accounts[0]});

      const rate = await interestRateStorage.getInterestRate.call(etherToken.address);
      assert.equal(rate, 500);
    });

    it("should emit event", async () => {
      await interestRateStorage.setInterestRate(etherToken.address, 500, {from: web3.eth.accounts[0]});

      await utils.assertEvents(interestRateStorage, [
      {
        event: "InterestRateChange",
        args: {
          asset: etherToken.address,
          dailyInterestRate: web3.toBigNumber('500')
        }
      }]);
    });

    it("should be owner only", async () => {
      await utils.assertOnlyOwner(interestRateStorage, interestRateStorage.setInterestRate.bind(null, etherToken.address, 500), web3);
    });
  });

  describe('#snapshotCurrentRate', async () => {
    it('should snapshot the block unit', async () => {
      await utils.mineUntilBlockNumberEndsWith(web3, 3);

      await interestRateStorage.setInterestRate(etherToken.address, 500);
      await interestRateStorage.snapshotCurrentRate(etherToken.address);

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

      await interestRateStorage.setInterestRate(etherToken.address, 500);
      await interestRateStorage.snapshotCurrentRate(etherToken.address);

      // Mine one more block unit
      await utils.mineUntilBlockNumberEndsWith(web3, 3);

      await interestRateStorage.setInterestRate(etherToken.address, 501);
      await interestRateStorage.snapshotCurrentRate(etherToken.address);

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

      await interestRateStorage.setInterestRate(etherToken.address, 500);
      await interestRateStorage.snapshotCurrentRate(etherToken.address);

      // Mine one more block unit
      await utils.mineUntilBlockNumberEndsWith(web3, 3);

      await interestRateStorage.setInterestRate(etherToken.address, 501);
      await interestRateStorage.snapshotCurrentRate(etherToken.address);

      // Mine yet another block unit
      await utils.mineUntilBlockNumberEndsWith(web3, 3);

      await interestRateStorage.setInterestRate(etherToken.address, 490);
      await interestRateStorage.snapshotCurrentRate(etherToken.address);

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
      await interestRateStorage.setInterestRate(etherToken.address, 500);
      await interestRateStorage.snapshotCurrentRate(etherToken.address);

      // Mine one more block unit
      await utils.mineUntilBlockNumberEndsWith(web3, 6);
      await interestRateStorage.setInterestRate(etherToken.address, 501);
      await interestRateStorage.snapshotCurrentRate(etherToken.address);

      // Mine one more block unit
      await utils.mineUntilBlockNumberEndsWith(web3, 5);
      await interestRateStorage.setInterestRate(etherToken.address, 490);
      await interestRateStorage.snapshotCurrentRate(etherToken.address);

      // Mine one more block unit
      await utils.mineUntilBlockNumberEndsWith(web3, 1);
      await interestRateStorage.snapshotCurrentRate(etherToken.address);

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

      await interestRateStorage.setInterestRate(etherToken.address, 500);
      await interestRateStorage.snapshotCurrentRate(etherToken.address);

      // Mine one more block unit
      await utils.mineUntilBlockNumberEndsWith(web3, 3);

      await interestRateStorage.setInterestRate(etherToken.address, 501);
      await interestRateStorage.snapshotCurrentRate(etherToken.address);

      // Skip past a whole block unit!!
      await utils.mineUntilBlockNumberEndsWith(web3, 4);
      await utils.mineUntilBlockNumberEndsWith(web3, 3);

      await interestRateStorage.setInterestRate(etherToken.address, 490);
      await interestRateStorage.snapshotCurrentRate(etherToken.address);

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
    it('should be allowed only');
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
