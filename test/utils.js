var _ = require("lodash");
var Promise = require("bluebird");
var BigNumber = require('bignumber.js');
var one = new BigNumber(1);

async function createAndApproveWeth(ledger, etherToken, amount, account, approvalAmount) {
  await etherToken.deposit({from: account, value: amount});
  await etherToken.approve(ledger.address, approvalAmount || amount, {from: account});
};

async function assertFailure(msg, execFn) {
  try {
    await execFn()
    assert.fail('should have thrown');
  } catch (error) {
    await assert.equal(error.message, msg);
  }
}

async function increaseTime(web3, seconds) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: "2.0",
      method: "evm_increaseTime",
      params: [seconds], // 86400 is num seconds in day
      id: new Date().getTime()
    }, (err, result) => {
      if(err){ return reject(err) }
      return resolve(result)
    });
  });
}

async function mineBlock(web3) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: "2.0",
      method: "evm_mine",
      params: [],
      id: new Date().getTime()
    }, (err, result) => {
      if(err){ return reject(err) }
      return resolve(result)
    });
  });
}

module.exports = {
  // https://ethereum.stackexchange.com/a/21661
  //
  assertEvents: function(contract, expectedEvents, args) {
    return new Promise((resolve, reject) => {
      var event = contract.allEvents(args);
      event.get((error, events) => {
        _.each(expectedEvents, (expectedEvent) => {
          if (!_.find(events, expectedEvent)) {
            throw new Error(expectedEvent.event + "(" + JSON.stringify(expectedEvent.args) + ") wasn't logged");
          }
        })
        resolve();
      });
      event.stopWatching();
    });
  },

  assertDifference: async function(assert, difference, checkFn, execFn) {
    const start = await checkFn();

    await execFn();

    const end = await checkFn();

    return assert.equal(end.minus(start), difference);
  },

  assertMatchingArray: function(firstArray, secondArray) {
    firstArray.forEach((value, index) =>
      assert.equal(value, secondArray[index])
    )
  },
  increaseTime: async function(web3, seconds) {
    await increaseTime(web3, seconds);
    await mineBlock(web3);
  },
  assertOnlyOwner: async function(f, web3) {
    await assertFailure("VM Exception while processing transaction: revert", async () => {
      await  f({from: web3.eth.accounts[1]});
    })
    await  f({from: web3.eth.accounts[0]});
  },

  createAndTransferWeth: async function(transferrable, etherToken, amount, account) {
    await etherToken.deposit({from: account, value: amount});
    await etherToken.transfer(transferrable, 100, {from: account});
  },

  depositEth: async function(savings, etherToken, amount, account) {
    await createAndApproveWeth(savings, etherToken, amount, account);
    await savings.customerDeposit(etherToken.address, amount, account);
  },

  ledgerAccountBalance: async (ledger, account, token) =>
    await ledger.getDepositBalance.call(account, token).valueOf()
  ,

  tokenBalance: async function(token, account) {
    return web3.toBigNumber((await token.balanceOf(account)).valueOf());
  },

  ethBalance: async function(account) {
    return web3.toBigNumber((await web3.eth.getBalance(account)).valueOf());
  },

  setAssetValue: async function(oracle, asset, amountInWei, web3) {
    return await oracle.setAssetValue(asset.address, amountInWei, {from: web3.eth.accounts[0]});
  },

  addLoanableAsset: async function(loaner, asset, web3) {
    return await loaner.addLoanableAsset(asset.address, {from: web3.eth.accounts[0]});
  },

// http://www.thecalculatorsite.com/articles/finance/compound-interest-formula.php
// A = P (1 + r/n) ^ (nt)
//
// Where:
//
// A = the future value of the investment/loan, including interest
// P = the principal investment amount (the initial deposit or loan amount)
// r = the annual interest rate (decimal)
// n = the number of times that interest is compounded per year
// t = the number of years the money is invested or borrowed for

  compoundedInterest: (
    {
      principal,
      interestRate,
      payoutsPerTimePeriod,
      duration,
    }
  ) =>
    principal.times(
      one.plus(interestRate.dividedBy(payoutsPerTimePeriod)).
        toPower(payoutsPerTimePeriod.times(duration)
      )
    ),
  tokenAddrs: {
    OMG: "0x0000000000000000000000000000000000000001",
    BAT: "0x0000000000000000000000000000000000000002"
  },
  assertFailure,
  createAndApproveWeth,
}
