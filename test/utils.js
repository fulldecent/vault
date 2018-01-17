var _ = require("lodash");
var Promise = require("bluebird");
var BigNumber = require('bignumber.js');
var one = new BigNumber(1);
const toAssetValue = (value) => (value * 10 ** 9);

async function createAndApproveWeth(ledger, etherToken, amount, account, approvalAmount) {
  await etherToken.deposit({from: account, value: amount});
  await etherToken.approve(ledger.address, approvalAmount || amount, {from: account});
};

async function assertFailure(msg, execFn) {
  try {
    await execFn();
    assert.fail('should have thrown');
  } catch (error) {
    await assert.equal(error.message, msg);
  }
}

async function assertGracefulFailure(contract, failure, failureParamsOrExecFn, maybeExecFn) {
  var failureParams;
  var execFn;

  // Allow failureParams to be optional.
  if (maybeExecFn) {
    execFn = maybeExecFn;
    failureParams = failureParamsOrExecFn;
  } else {
    failureParams = null;
    execFn = failureParamsOrExecFn;
  }

  await execFn();

  return new Promise((resolve, reject) => {
    var event = contract.allEvents();
    event.get((error, events) => {
      var found = false;

      for (event of events) {
        if (event.event === 'GracefulFailure') {
          if (event.args.errorMessage === failure) {
            if (failureParams) {
              for (var i = 0; i < failureParams.length; i++) {
                var expected = failureParams[i];
                var actual = event.args.values[i];

                if (failureParams[i] && expected != actual) {
                  throw new Error(`GracefulFailure parameter mismatch #${i+1}, "${expected}" expected, got "${actual}"`);
                }
              }
            }

            found = true;
            resolve(event);
          } else {
            throw new Error(`GracefulFailure "${failure}" expected, got "${event.args.errorMessage}"`);
          }
        }
      }

      if (!found) {
        throw new Error(`GracefulFailure "${failure}" not detected`);
      }
    });

    event.stopWatching();
  });
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

async function mineBlocks(web3, blocksToMine) {
  var promises = [];

  for (var i = 0; i < blocksToMine; i++) {
    promises.push(await mineBlock(web3));
  }

  return await Promise.all(promises);
}

async function mineUntilBlockNumberEndsWith(web3, endsWith) {
  const blockNumber = web3.eth.blockNumber;

  const blocksToMine = 10 - ( blockNumber % 10 ) + endsWith;

  return await mineBlocks(web3, blocksToMine);
}

async function buildSnapshots(web3, etherToken, interestRateStorage) {
  await mineUntilBlockNumberEndsWith(web3, 7);
  const startingBlockNumber = web3.eth.blockNumber;
  const startingBlockUnit = (await interestRateStorage.getBlockUnit.call(startingBlockNumber)).toNumber()

  await interestRateStorage.snapshotCurrentRate(etherToken.address, 100);

  // Mine one more block unit
  await mineUntilBlockNumberEndsWith(web3, 6);
  await interestRateStorage.snapshotCurrentRate(etherToken.address, 200);

  // Mine one more block unit
  await mineUntilBlockNumberEndsWith(web3, 5);
  await interestRateStorage.snapshotCurrentRate(etherToken.address, 300);

  // Mine one more block unit
  await mineUntilBlockNumberEndsWith(web3, 1);
  await interestRateStorage.snapshotCurrentRate(etherToken.address, 400);

  return [startingBlockNumber, startingBlockUnit];
}

module.exports = {
  buildSnapshots: buildSnapshots,
  mineBlocks: mineBlocks,
  mineUntilBlockNumberEndsWith: mineUntilBlockNumberEndsWith,

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
  assertOnlyOwner: async function(contract, f, ownerAccountOrWeb3, nonOwnerAccountOrNull) {
    var ownerAccount, nonOwnerAccount;

    if (nonOwnerAccountOrNull) {
      ownerAccount = ownerAccountOrWeb3;
      nonOwnerAccount = nonOwnerAccountOrNull;
    } else {
      const web3 = ownerAccountOrWeb3;
      ownerAccount = web3.eth.accounts[0];
      nonOwnerAccount = web3.eth.accounts[1];
    }

    await f({from: ownerAccount});

    await assertGracefulFailure(contract, "Unauthorized", async () => {
      await f({from: nonOwnerAccount});
    });
  },

  assertOnlyAllowed: async function(contract, f, web3, afterEach) {
    const ownerAccount = web3.eth.accounts[0];
    const existingAllowedAccount = await contract.allowed.call();
    const allowedAccount = web3.eth.accounts[1];
    const nonAllowedAccount = web3.eth.accounts[2];

    await contract.allow(allowedAccount);

    await f({from: allowedAccount});

    if (afterEach) {
      await afterEach();
    }

    // Don't allow rando account
    await assertGracefulFailure(contract, "Allowed::NotAllowed", async () => {
      await f({from: nonAllowedAccount});
    });

    if (afterEach) {
      await afterEach();
    }

    // Not even owner
    await assertGracefulFailure(contract, "Allowed::NotAllowed", async () => {
      await f({from: ownerAccount});
    });

    await contract.allow(existingAllowedAccount);
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
    return await oracle.setAssetValue(asset.address, toAssetValue(amountInWei), {from: web3.eth.accounts[0]});
  },

  addLoanableAsset: async function(loaner, asset, web3) {
    return await loaner.addLoanableAsset(asset.address, {from: web3.eth.accounts[0]});
  },

  assertInterestRate: async function(assert, interestRateStorage, etherTokenAddress, blockNumber, expectedBlockUnit, expectedBlockUnitInterestRate, expectedCompoundInterestRate) {
    assert.equal((await interestRateStorage.getSnapshotBlockUnit(etherTokenAddress, blockNumber)).valueOf(), expectedBlockUnit);
    assert.equal((await interestRateStorage.getSnapshotBlockUnitInterestRate(etherTokenAddress, blockNumber)).valueOf(), expectedBlockUnitInterestRate);
    assert.equal((await interestRateStorage.getCompoundedInterestRate(etherTokenAddress, blockNumber)).valueOf(), expectedCompoundInterestRate);
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
  assertGracefulFailure,
  createAndApproveWeth,
}
