const BigNumber = require('bignumber.js');
const Loaner = artifacts.require("./Loaner.sol");
const utils = require('./utils');
const moment = require('moment');

const tokenTypes = {
  ETH: 0,
}

contract('Loaner', function(accounts) {
  var loaner;

  beforeEach(function() {
    return Loaner.new().then((instance) => {
      loaner = instance;
    });
  });

  describe('#newLoan', () => {
    describe('when the loan is valid', () => {
      it("pays out the amount requested", async () => {
        // fund the loaner
        await loaner.sendTransaction({value: web3.toWei(1, "ether")})

        const amountLoaned = await loaner.newLoan.call(web3.toWei(1, "ether"), tokenTypes.ETH);
        assert.equal(amountLoaned.valueOf(), web3.toWei(1, "ether"));
      });
    });
  });
});
