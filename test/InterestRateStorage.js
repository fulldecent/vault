const BigNumber = require('bignumber.js');
const InterestRateStorage = artifacts.require("./storage/InterestRateStorage.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

const SECONDS_IN_A_DAY = ( 60 * 60 * 24 );

contract('InterestRateStorage', function(accounts) {
  var interestRateStorage;
  var etherToken;

  beforeEach(async () => {
    [interestRateStorage, etherToken] = await Promise.all([InterestRateStorage.new(), EtherToken.new()]);
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
    it('should snapshot the first day', async () => {
      const now = moment().unix() + SECONDS_IN_A_DAY; // since we've moved the EVM forward one day
      const midnightTonight = now - Math.floor( now / SECONDS_IN_A_DAY ) + 60 * 60 * 24;
      const secondsUntilMidnight = midnightTonight - now;

      const yesterday = now - SECONDS_IN_A_DAY;
      const laterYesterday = yesterday + secondsUntilMidnight / 2;
      const today = now;
      const laterToday = today + secondsUntilMidnight / 2;
      const tomorrow = today + SECONDS_IN_A_DAY;
      const laterTomorrow = tomorrow + secondsUntilMidnight / 2;
      const theDayAfterTomorrow = tomorrow + SECONDS_IN_A_DAY;

      await interestRateStorage.setInterestRate(etherToken.address, 500);
      await interestRateStorage.snapshotCurrentRate(etherToken.address, laterToday);

      assert.equal((await interestRateStorage.getSnapshotTimestamp(etherToken.address, yesterday)).valueOf(), laterToday);
      assert.equal((await interestRateStorage.getSnapshotDailyInterestRate(etherToken.address, yesterday)).valueOf(), 500);
      assert.equal((await interestRateStorage.getCompoundedInterestRate(etherToken.address, yesterday)).valueOf(), 10000000000000000);

      assert.equal((await interestRateStorage.getSnapshotTimestamp(etherToken.address, laterYesterday)).valueOf(), laterToday);
      assert.equal((await interestRateStorage.getSnapshotDailyInterestRate(etherToken.address, laterYesterday)).valueOf(), 500);
      assert.equal((await interestRateStorage.getCompoundedInterestRate(etherToken.address, laterYesterday)).valueOf(), 10000000000000000);

      assert.equal((await interestRateStorage.getSnapshotTimestamp(etherToken.address, today)).valueOf(), laterToday);
      assert.equal((await interestRateStorage.getSnapshotDailyInterestRate(etherToken.address, today)).valueOf(), 500);
      assert.equal((await interestRateStorage.getCompoundedInterestRate(etherToken.address, today)).valueOf(), 10000000000000000);

      assert.equal((await interestRateStorage.getSnapshotTimestamp(etherToken.address, laterToday)).valueOf(), laterToday);
      assert.equal((await interestRateStorage.getSnapshotDailyInterestRate(etherToken.address, laterToday)).valueOf(), 500);
      assert.equal((await interestRateStorage.getCompoundedInterestRate(etherToken.address, laterToday)).valueOf(), 10000000000000000);

      assert.equal((await interestRateStorage.getSnapshotTimestamp(etherToken.address, tomorrow)).valueOf(), laterToday);
      assert.equal((await interestRateStorage.getSnapshotDailyInterestRate(etherToken.address, tomorrow)).valueOf(), 500);
      assert.equal((await interestRateStorage.getCompoundedInterestRate(etherToken.address, tomorrow)).valueOf(), 10000000000000000);
    });

    it('should correctly snapshot a second day', async () => {
      const now = moment().unix() + SECONDS_IN_A_DAY; // since we've moved the EVM forward one day
      const midnightTonight = now - Math.floor( now / SECONDS_IN_A_DAY ) + 60 * 60 * 24;
      const secondsUntilMidnight = midnightTonight - now;

      const yesterday = now - SECONDS_IN_A_DAY;
      const laterYesterday = yesterday + secondsUntilMidnight / 2;
      const today = now;
      const laterToday = today + secondsUntilMidnight / 2;
      const tomorrow = today + SECONDS_IN_A_DAY;

      await interestRateStorage.setInterestRate(etherToken.address, 500);
      await interestRateStorage.snapshotCurrentRate(etherToken.address, laterYesterday);

      await interestRateStorage.setInterestRate(etherToken.address, 501);
      await interestRateStorage.snapshotCurrentRate(etherToken.address, laterToday);

      assert.equal((await interestRateStorage.getSnapshotTimestamp(etherToken.address, yesterday)).valueOf(), laterYesterday);
      assert.equal((await interestRateStorage.getSnapshotDailyInterestRate(etherToken.address, yesterday)).valueOf(), 500);
      assert.equal((await interestRateStorage.getCompoundedInterestRate(etherToken.address, yesterday)).valueOf(), 10000000000000501);

      assert.equal((await interestRateStorage.getSnapshotTimestamp(etherToken.address, laterYesterday)).valueOf(), laterYesterday);
      assert.equal((await interestRateStorage.getSnapshotDailyInterestRate(etherToken.address, laterYesterday)).valueOf(), 500);
      assert.equal((await interestRateStorage.getCompoundedInterestRate(etherToken.address, laterYesterday)).valueOf(), 10000000000000501);

      assert.equal((await interestRateStorage.getSnapshotTimestamp(etherToken.address, today)).valueOf(), laterToday);
      assert.equal((await interestRateStorage.getSnapshotDailyInterestRate(etherToken.address, today)).valueOf(), 501);
      assert.equal((await interestRateStorage.getCompoundedInterestRate(etherToken.address, today)).valueOf(), 10000000000000000);

      assert.equal((await interestRateStorage.getSnapshotTimestamp(etherToken.address, laterToday)).valueOf(), laterToday);
      assert.equal((await interestRateStorage.getSnapshotDailyInterestRate(etherToken.address, laterToday)).valueOf(), 501);
      assert.equal((await interestRateStorage.getCompoundedInterestRate(etherToken.address, laterToday)).valueOf(), 10000000000000000);

      assert.equal((await interestRateStorage.getSnapshotTimestamp(etherToken.address, tomorrow)).valueOf(), laterToday);
      assert.equal((await interestRateStorage.getSnapshotDailyInterestRate(etherToken.address, tomorrow)).valueOf(), 501);
      assert.equal((await interestRateStorage.getCompoundedInterestRate(etherToken.address, tomorrow)).valueOf(), 10000000000000000);
    });

    it('should correctly snapshot a third day', async () => {
      const now = moment().unix() + SECONDS_IN_A_DAY; // since we've moved the EVM forward one day
      const midnightTonight = now - Math.floor( now / SECONDS_IN_A_DAY ) + 60 * 60 * 24;
      const secondsUntilMidnight = midnightTonight - now;

      const yesterday = now - SECONDS_IN_A_DAY;
      const laterYesterday = yesterday + secondsUntilMidnight / 2;
      const today = now;
      const laterToday = today + secondsUntilMidnight / 2;
      const tomorrow = today + SECONDS_IN_A_DAY;
      const laterTomorrow = tomorrow + secondsUntilMidnight / 2;
      const theDayAfterTomorrow = tomorrow + SECONDS_IN_A_DAY;

      await interestRateStorage.setInterestRate(etherToken.address, 500);
      await interestRateStorage.snapshotCurrentRate(etherToken.address, laterYesterday);

      await interestRateStorage.setInterestRate(etherToken.address, 501);
      await interestRateStorage.snapshotCurrentRate(etherToken.address, laterToday);

      await interestRateStorage.setInterestRate(etherToken.address, 490);
      await interestRateStorage.snapshotCurrentRate(etherToken.address, laterTomorrow);

      assert.equal((await interestRateStorage.getSnapshotTimestamp(etherToken.address, yesterday)).valueOf(), laterYesterday);
      assert.equal((await interestRateStorage.getSnapshotDailyInterestRate(etherToken.address, yesterday)).valueOf(), 500);
      assert.equal((await interestRateStorage.getCompoundedInterestRate(etherToken.address, yesterday)).valueOf(), 10000000000000991);

      assert.equal((await interestRateStorage.getSnapshotTimestamp(etherToken.address, laterYesterday)).valueOf(), laterYesterday);
      assert.equal((await interestRateStorage.getSnapshotDailyInterestRate(etherToken.address, laterYesterday)).valueOf(), 500);
      assert.equal((await interestRateStorage.getCompoundedInterestRate(etherToken.address, laterYesterday)).valueOf(), 10000000000000991);

      assert.equal((await interestRateStorage.getSnapshotTimestamp(etherToken.address, today)).valueOf(), laterToday);
      assert.equal((await interestRateStorage.getSnapshotDailyInterestRate(etherToken.address, today)).valueOf(), 501);
      assert.equal((await interestRateStorage.getCompoundedInterestRate(etherToken.address, today)).valueOf(), 10000000000000490);

      assert.equal((await interestRateStorage.getSnapshotTimestamp(etherToken.address, laterToday)).valueOf(), laterToday);
      assert.equal((await interestRateStorage.getSnapshotDailyInterestRate(etherToken.address, laterToday)).valueOf(), 501);
      assert.equal((await interestRateStorage.getCompoundedInterestRate(etherToken.address, laterToday)).valueOf(), 10000000000000490);

      assert.equal((await interestRateStorage.getSnapshotTimestamp(etherToken.address, tomorrow)).valueOf(), laterTomorrow);
      assert.equal((await interestRateStorage.getSnapshotDailyInterestRate(etherToken.address, tomorrow)).valueOf(), 490);
      assert.equal((await interestRateStorage.getCompoundedInterestRate(etherToken.address, tomorrow)).valueOf(), 10000000000000000);

      assert.equal((await interestRateStorage.getSnapshotTimestamp(etherToken.address, laterTomorrow)).valueOf(), laterTomorrow);
      assert.equal((await interestRateStorage.getSnapshotDailyInterestRate(etherToken.address, laterTomorrow)).valueOf(), 490);
      assert.equal((await interestRateStorage.getCompoundedInterestRate(etherToken.address, laterTomorrow)).valueOf(), 10000000000000000);

      assert.equal((await interestRateStorage.getSnapshotTimestamp(etherToken.address, theDayAfterTomorrow)).valueOf(), laterTomorrow);
      assert.equal((await interestRateStorage.getSnapshotDailyInterestRate(etherToken.address, theDayAfterTomorrow)).valueOf(), 490);
      assert.equal((await interestRateStorage.getCompoundedInterestRate(etherToken.address, theDayAfterTomorrow)).valueOf(), 10000000000000000);
    });

    it('should correctly snapshot a fourth day missing a third day');
    it('should be allowed only');
  });

  describe('#getDay', async () => {
    it('should return 0 for Jan 1, 1970', async () => {
      var timestamp = moment("01-01-1970", "MM-DD-YYYY").unix();

      assert.equal((await interestRateStorage.getDay.call(timestamp)).valueOf(), 0);
    });
    it('should return 1 for Jan 2, 1970', async () => {
      var timestamp = moment("01-02-1970", "MM-DD-YYYY").unix();

      assert.equal((await interestRateStorage.getDay.call(timestamp)).valueOf(), 1);
    });
    it('should return correctly for July 1, 2073', async () => {
      var timestamp = moment("07-01-2073", "MM-DD-YYYY").unix();

      assert.equal((await interestRateStorage.getDay.call(timestamp)).valueOf(), 37802);
    });
  })
});
