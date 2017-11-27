const BigNumber = require('bignumber.js');
const InterestHelper = artifacts.require("./base/InterestHelper.sol");
const utils = require('./utils');
const moment = require('moment');

const now = moment();

const tests = [
  {
    principal: new BigNumber(web3.toWei("5", "ether")),
    interestRate: new BigNumber(0.05), // Percent per year, compounded daily
    start: now.clone().add(0, 'years'),
    end: now.clone().add(10, 'years'),
  },
];

contract('InterestHelper', function(accounts) {
  var interestHelper;

  before(async () => {
    interestHelper = await InterestHelper.new();
  });

  tests.forEach((test) => {
    const duration = moment.duration(test.end.diff(test.start));

    it.only("should have correct interest for " + test.principal + " at " + test.interestRate + " daily compounding interest after " + duration.humanize(), async () => {
      const startTime = new BigNumber(test.start.unix());
      const endTime = new BigNumber(test.end.unix());
      console.log(endTime - startTime);
      const duration = ( endTime - startTime ) / ( 31557600 );

      console.log(["Test Duration Years", duration]);

      const expectedBalance = utils.compoundedInterest({
        principal: test.principal,
        interestRate: test.interestRate,
        payoutsPerTimePeriod: test.payoutsPerYear,
        duration,
      }).toFixed(6);

      const balance = await interestHelper.balanceWithInterest.call(
        test.principal,
        startTime,
        endTime,
        test.interestRate * 100,
      );

      assert.equal(balance.valueOf(), expectedBalance);
    });
  });
});
