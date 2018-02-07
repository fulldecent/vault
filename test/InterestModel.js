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
    it('should return correct rate with liquidity ratio of 25% (supply rate 25%)', async () => {
      const interestRateBPS = await interestModel.getScaledSupplyRatePerBlock(50, 150);

      utils.validateRate(assert, 750, interestRateBPS.toNumber(), 3567351000, "25%");
      //                                           exact value is 3567351598
    });

    it('should return correct rate with liquidity ratio of 0% (supply rate 10%)', async () => {
      const interestRateBPS = await interestModel.getScaledSupplyRatePerBlock(0, 150);

      utils.validateRate(assert, 1000, interestRateBPS.toNumber(), 4756468000, "10%");
      //                                            exact value is 4756468797
    });

    it('should return correct rate with liquidity ratio of 100% (supply rate 0%)', async () => {
      const interestRateBPS = await interestModel.getScaledSupplyRatePerBlock(50, 0);

      utils.validateRate(assert, 0, interestRateBPS.toNumber(), 0, "0%");
    });

    it('should return correct rate with liquidity ratio of 50% (supply rate 5%)', async () => {
      const interestRateBPS = await interestModel.getScaledSupplyRatePerBlock(100, 100);

      utils.validateRate(assert, 500, interestRateBPS.toNumber(), 2378234000, "5%");
      //                                           exact value is 2378234398
    });

    it('should return correct rate with liquidity ratio of 0.99% (supply rate 9.91%)', async () => {
      const interestRateBPS = await interestModel.getScaledSupplyRatePerBlock(100, 10000);

      utils.validateRateWithMaxRatio(assert, 991, interestRateBPS.toNumber(), 4708903320, 0.0011, "9.91%");
      //                                                       exact value is 4708904109
    });
  });

  describe('#getScaledBorrowRatePerBlock', async () => {
    it('should return correct balance with liquidity ratio of 25% (borrow rate 25%)', async () => {
      const interestRateBPS = (await interestModel.getScaledBorrowRatePerBlock.call(50, 150));
      (await interestModel.getScaledBorrowRatePerBlock(50, 150));

      utils.validateRate(assert, 2500, interestRateBPS.toNumber(), 11891170000, "25%");
    });


    it('should return correct balance with liquidity ratio of 0% (borrow rate 30%)', async () => {
      const interestRateBPS = await interestModel.getScaledBorrowRatePerBlock.call(0, 150);

    utils.validateRate(assert, 3000, interestRateBPS.toNumber(), 14269404000, "30%");
    });

    it('should return correct balance with liquidity ratio of 100% (borrow rate 10%)', async () => {
      const interestRateBPS = await interestModel.getScaledBorrowRatePerBlock.call(50, 0);

      utils.validateRate(assert, 1000, interestRateBPS.toNumber(), 4756468000, "10%");
    });

    it('should return correct balance with liquidity ratio of 50% (borrow rate 20%)', async () => {
      const interestRateBPS = await interestModel.getScaledBorrowRatePerBlock.call(100, 100);

      utils.validateRate(assert, 2000, interestRateBPS.toNumber(), 9512936000, "20%");
    });

    it('should return correct balance with liquidity ratio of 0.99% (borrow rate 29.82%)', async () => {
      const interestRateBPS = await interestModel.getScaledBorrowRatePerBlock.call(100, 10000);

      // For this one, the error ratio is 0.00067.
      utils.validateRateWithMaxRatio(assert, 2982, interestRateBPS.toNumber(), 14174274640, 0.00068, "29.82%");
    });

    it('should return correct balance with liquidity ratio of 0.559471% (borrow rate 18.8105726872247%)', async () => {
      const interestRateBPS = await interestModel.getScaledBorrowRatePerBlock.call(127, 100);

      // For this one, the error ratio is 0.00003061.
      utils.validateRateWithMaxRatio(assert, 1881.05726872247, interestRateBPS.toNumber(), 8946916308, 0.0000307, "18.8105726872247%");
      //                                                                      exact value  8947190205
    });
  });

});
