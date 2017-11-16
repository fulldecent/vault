const BigNumber = require('bignumber.js');
const InterestHelper = artifacts.require("./base/InterestHelper.sol");
const utils = require('./utils');
const moment = require('moment');

const now = moment();

const tests = [
  {
    principal: new BigNumber(100000),
    interestRate: new BigNumber(0.02), // Percent per year, compounded daily
    start: now.clone().add(0, 'years'),
    end: now.clone().add(1, 'years'),
    payoutsPerYear: 365,
  },

  {
    principal: new BigNumber(100000),
    interestRate: new BigNumber(0.02), // Percent per year, compounded daily
    start: now.clone().add(0, 'days'),
    end: now.clone().add(2, 'days'),
    payoutsPerYear: 365,
  },

  {
    principal: new BigNumber(5000),
    interestRate: new BigNumber(0.05), // Percent per year, compounded monthly
    start: now.clone().add(0, 'years'),
    end: now.clone().add(10, 'years'),
    payoutsPerYear: 12,
  },

  {
    principal: new BigNumber(5000000),
    interestRate: new BigNumber(0.03), // Percent per year, compounded monthly
    start: now.clone().add(0, 'years'),
    end: now.clone().add(15, 'years'),
    payoutsPerYear: 365,
  }
];

contract('InterestHelper', function(accounts) {
  var interestHelper;

  before(async () => {
    interestHelper = await InterestHelper.new();
  });

  tests.forEach((test) => {
    const duration = moment.duration(test.end.diff(test.start));

    it("should have correct interest for " + test.principal + " at " + test.interestRate + " daily compounding interest after " + duration.humanize(), async () => {
      const precision = 10;
      const multiplyer = Math.pow(10, precision);

      const startTime = new BigNumber(test.start.unix());
      const endTime = new BigNumber(test.end.unix());
      const durationInYears = ( endTime - startTime ) / ( 365 * 24 * 60 * 60.0 );

      console.log(["Test Duration Years", durationInYears]);

      const expectedBalance = utils.compoundedInterest({
        principal: test.principal,
        interestRate: test.interestRate,
        payoutsPerTimePeriod: test.payoutsPerYear,
        duration: durationInYears,
      }).toFixed(6);

      const balance = await interestHelper.balanceWithInterest.call(
        test.principal.times(multiplyer),
        startTime,
        endTime,
        test.interestRate * 100 * 100,
        test.payoutsPerYear);

      const balanceAdjusted = (balance.valueOf()/multiplyer).toFixed(6)

      assert.equal(balanceAdjusted, expectedBalance);
    });
  });

  describe('#balanceWithInterest', () => {

    it('should have correct interest', async () => {
      const precision = 10;
      const multiplyer = Math.pow(10, precision);

      const durationInYears = 10;
      const principal = new BigNumber(5000);
      const startTime = new BigNumber(moment().add(0, 'years').unix());
      const endTime = new BigNumber(moment().add(durationInYears, 'years').unix());
      const interestRate = new BigNumber(0.05);
      const payoutsPerYear = new BigNumber(12);

      const expectedBalance = utils.compoundedInterest({
        principal: principal,
        interestRate: interestRate,
        payoutsPerTimePeriod: payoutsPerYear,
        duration: durationInYears,
      }).toFixed(6);

      var balance = await interestHelper.balanceWithInterest.call(
        principal.times(multiplyer),
        startTime,
        endTime,
        interestRate * 100 * 100,
        payoutsPerYear);

      balance = (balance.valueOf()/multiplyer).toFixed(6)

      assert.equal(balance, expectedBalance);
    });
  });
});
