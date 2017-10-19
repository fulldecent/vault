var ETHSavingsAccount = artifacts.require("./ETHSavingsAccount.sol");

module.exports = function(deployer) {
  deployer.deploy(ETHSavingsAccount);
};
