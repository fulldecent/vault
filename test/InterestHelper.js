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
      const durationInYears = 10;
      const principal = web3.toWei("5", "ether");
      const startTime = moment().add(0, 'years').unix();
      const endTime = moment().add(durationInYears, 'years').unix();
      const interestRateBPS = 500;
      const oneYear = moment(0).add(1, 'years');
      const exponent = (endTime-startTime) * 50 / oneYear;
      const expectedBalance = principal*(Math.E ** (exponent))

      const balance = await interestHelper.balanceWithInterest.call(
        principal,
        startTime,
        endTime,
        interestRateBPS);


      assert.closeTo(balance.toNumber(), expectedBalance, parseInt(web3.toWei(0.001, "ether")));
    });
  });
});
