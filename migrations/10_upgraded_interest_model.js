var MoneyMarket = artifacts.require("MoneyMarket.sol");
var InterestModel = artifacts.require("InterestModel.sol");

module.exports = function(deployer, network) {
  return deployer.deploy(InterestModel).then(() => {
    return InterestModel.deployed().then(interestModel => {
      return MoneyMarket.deployed().then(moneyMarket => {
        return moneyMarket.setInterestModel(interestModel.address).then(() => {
          console.log("Deployed upgraded interest model v10.");

          return true;
        });
      });
    });
  });
};