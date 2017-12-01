const BigNumber = require('bignumber.js');
const InterestHelper = artifacts.require("./base/InterestHelper.sol");
const utils = require('./utils');
const moment = require('moment');

contract('InterestHelper', function(accounts) {
  var interestHelper;

  beforeEach(async () => {
    interestHelper = await InterestHelper.new();
  });

  describe('#balanceWithInterest', () => {
    it('should have correct interest', async () => {
      const precision = 10;
      const multiplyer = Math.pow(10, precision);

      const durationInYears = 10;
      const principal = new BigNumber(5000);
      const startTime = new BigNumber(moment().add(0, 'years').unix());
      const endTime = new BigNumber(moment().add(durationInYears, 'years').unix());
      const interestRateBPS = new BigNumber(500);
      const payoutsPerYear = new BigNumber(12);

      const expectedBalance = utils.compoundedInterest({
        principal: principal,
        interestRate: interestRateBPS.dividedBy(10000),
        payoutsPerTimePeriod: payoutsPerYear,
        duration: durationInYears,
      }).toFixed(6);

      var balance = await interestHelper.balanceWithInterest.call(
        principal.times(multiplyer),
        startTime,
        endTime,
        interestRateBPS);

      balance = (balance.valueOf()/multiplyer).toFixed(6)

      assert.equal(balance, expectedBalance);
    });
  });
});
