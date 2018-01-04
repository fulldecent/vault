var LedgerStorage = artifacts.require("LedgerStorage.sol");

module.exports = function(deployer, network) {
  return deployer.deploy(LedgerStorage);
};
