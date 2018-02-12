"use strict";

const BigNumber = require('bignumber.js');
const InterestModel = artifacts.require("./InterestModel.sol");
const utils = require('./utils');

contract('InterestModel', function(accounts) {
  var interestModel;

  beforeEach(async () => {
    interestModel = await InterestModel.new();
  });

  describe('#getScaledSupplyRatePerBlock', async () => {
    it('should return correct rate with utilization ratio of 3/1', async () => {
      const interestRateBPS = await interestModel.getScaledSupplyRatePerBlock.call(50, 150);

      utils.validateRate(assert, 3000, interestRateBPS.toNumber(), 14269406392, "3/1");
      //                                            exact value is 14269406392
    });

    it('should return correct rate with utilization ratio of 150/1', async () => {
      const interestRateBPS = await interestModel.getScaledSupplyRatePerBlock.call(0, 150);

      utils.validateRate(assert, 150000, interestRateBPS.toNumber(), 713470319634, "150/1");
      //                                              exact value is 713470319634.7032
    });

    it('should return correct rate with utilization ratio of 0', async () => {
      const interestRateBPS = await interestModel.getScaledSupplyRatePerBlock.call(50, 0);

      utils.validateRate(assert, 0, interestRateBPS.toNumber(), 0, "0%");
    });

    it('should return correct rate with utilization ratio of 1/1', async () => {
      const interestRateBPS = await interestModel.getScaledSupplyRatePerBlock.call(100, 100);

      utils.validateRate(assert, 1000, interestRateBPS.toNumber(), 4756468797, "1/1");
      //                                            exact value is 4756468797.564688
    });

    it('should return correct rate with utilization ratio of 100/1', async () => {
      const interestRateBPS = await interestModel.getScaledSupplyRatePerBlock.call(100, 10000);

      utils.validateRateWithMaxRatio(assert, 100000, interestRateBPS.toNumber(), 475646879756, 0.0011, "100/1");
      //                                                          exact value is 475646879756.4688
    });

    it('should return correct rate with utilization ratio of 3/1 in large numbers', async () => {
      const interestRateBPS = await interestModel.getScaledSupplyRatePerBlock.call(500000000000000000000, 1500000000000000000000);

      utils.validateRate(assert, 3000, interestRateBPS.toNumber(), 14269406392, "3/1");
    });
  });

  describe('#getScaledBorrowRatePerBlock', async () => {
    it('should return correct balance with utilization ratio of 3/1', async () => {
      const interestRateBPS = (await interestModel.getScaledBorrowRatePerBlock.call(50, 150));
      (await interestModel.getScaledBorrowRatePerBlock(50, 150));

      utils.validateRate(assert, 7000, interestRateBPS.toNumber(), 33295281582, "3/1");
    });


    it('should return correct balance with utilization ratio of 150/1', async () => {
      const interestRateBPS = await interestModel.getScaledBorrowRatePerBlock.call(0, 150);

    utils.validateRate(assert, 301000, interestRateBPS.toNumber(), 1431697108066, "150/1");
    });

    it('should return correct balance with utilization ratio of 0', async () => {
      const interestRateBPS = await interestModel.getScaledBorrowRatePerBlock.call(50, 0);

      utils.validateRate(assert, 1000, interestRateBPS.toNumber(), 4756468797, "0");
    });

    it('should return correct balance with utilization ratio of 1/1', async () => {
      const interestRateBPS = await interestModel.getScaledBorrowRatePerBlock.call(100, 100);

      utils.validateRate(assert, 3000, interestRateBPS.toNumber(), 14269406392, "1/1");
    });

    it('should return correct balance with utilization ratio of 100/1', async () => {
      const interestRateBPS = await interestModel.getScaledBorrowRatePerBlock.call(100, 10000);

      utils.validateRate(assert, 201000, interestRateBPS.toNumber(), 956050228310, "100/1");
    });

    it('should return correct balance with utilization ratio of 100/127', async () => {
      const interestRateBPS = await interestModel.getScaledBorrowRatePerBlock.call(127, 100);

      // This has a pretty high error ratio?
      utils.validateRateWithMaxRatio(assert, 2574, interestRateBPS.toNumber(), 12246970840, 0.0004, "100/127");                                   
    });

    it('should return correct balance with utilization ratio of 100000000000000000000/127000000000000000000', async () => {
      const interestRateBPS = await interestModel.getScaledBorrowRatePerBlock.call(127000000000000000000, 100000000000000000000);

      // This has a pretty high error ratio?
      utils.validateRateWithMaxRatio(assert, 2574, interestRateBPS.toNumber(), 12246970840, 0.0004, "100/127");
    });
  });

});
