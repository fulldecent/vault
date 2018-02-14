var MoneyMarket = artifacts.require("MoneyMarket.sol");
var EtherToken = artifacts.require("EtherToken.sol");
var WalletFactory = artifacts.require("WalletFactory.sol");
var InterestRateStorage = artifacts.require("InterestRateStorage.sol");
var InterestModel = artifacts.require("InterestModel.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");
var BorrowStorage = artifacts.require("BorrowStorage.sol");
var PriceOracle = artifacts.require("PriceOracle.sol");
var TokenStore = artifacts.require("TokenStore.sol");

var FaucetTokenBAT = artifacts.require("FaucetTokenBAT.sol");
var FaucetTokenDRGN = artifacts.require("FaucetTokenDRGN.sol");
var FaucetTokenOMG = artifacts.require("FaucetTokenOMG.sol");
var FaucetTokenZRX = artifacts.require("FaucetTokenZRX.sol");
var TokenFactory = artifacts.require("TokenFactory.sol");

const MINIMUM_COLLATERAL_RATIO = 2;

function deployContracts(deployer) {
    return deployer.deploy(MoneyMarket).then(() => {
        return deployer.deploy(EtherToken).then(() => {
            return deployer.deploy(InterestModel).then(() => {
                return EtherToken.deployed().then(etherToken => {
                    return InterestModel.deployed().then(interestModel => {
                        return InterestRateStorage.deployed().then(interestRateStorage => {
                            return LedgerStorage.deployed().then(ledgerStorage => {
                                return BorrowStorage.deployed().then(borrowStorage => {
                                    return PriceOracle.deployed().then(priceOracle => {
                                        return TokenStore.deployed().then(tokenStore => {
                                            return MoneyMarket.deployed().then(moneyMarket => {
                                                return deployer.deploy(WalletFactory, moneyMarket.address, etherToken.address).then(() => {

                                                    return Promise.all([
                                                        borrowStorage.setMinimumCollateralRatio(MINIMUM_COLLATERAL_RATIO),
                                                        interestRateStorage.allow(moneyMarket.address),
                                                        ledgerStorage.allow(moneyMarket.address),
                                                        borrowStorage.allow(moneyMarket.address),
                                                        priceOracle.allow(moneyMarket.address),
                                                        tokenStore.allow(moneyMarket.address),
                                                        moneyMarket.setInterestRateStorage(interestRateStorage.address),
                                                        moneyMarket.setLedgerStorage(ledgerStorage.address),
                                                        moneyMarket.setBorrowStorage(borrowStorage.address),
                                                        moneyMarket.setPriceOracle(priceOracle.address),
                                                        moneyMarket.setTokenStore(tokenStore.address),
                                                        moneyMarket.setInterestModel(interestModel.address),
                                                    ]);
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

function deployTestTokens(deployer) {

    const contracts = [];
    contracts.push(FaucetTokenBAT);
    contracts.push(FaucetTokenDRGN);
    contracts.push(FaucetTokenOMG);
    contracts.push(FaucetTokenZRX);
    contracts.push(TokenFactory);

    return deployer.deploy(contracts).then(() => {

        return FaucetTokenBAT.deployed().then(faucetTokenBAT => {
            return FaucetTokenDRGN.deployed().then(faucetTokenDRGN => {
                return FaucetTokenOMG.deployed().then(faucetTokenOMG => {
                    return FaucetTokenZRX.deployed().then(faucetTokenZRX => {
                        return TokenFactory.deployed().then(tokenFactory => {
                            return Promise.all([
                                // BAT (decimals 10) 2500, DRGN (decimals 10) 500, OMG (decimals 18) 75, ZRX (decimals 18) 500
                                faucetTokenBAT.setPerRequestTokenAmount(2500e10),
                                faucetTokenDRGN.setPerRequestTokenAmount(500e10),
                                faucetTokenOMG.setPerRequestTokenAmount(75e18),
                                faucetTokenZRX.setPerRequestTokenAmount(500e18),
                                ]
                            );
                        });
                    });
                });
            });
        });
    });
}

module.exports = function(deployer, network) {

    const deployTokens = (network == "development" || network == "mission" || network == "rinkeby");
    var deployTokensPromise;

    if (deployTokens) {
        deployTokensPromise = deployTestTokens(deployer);
    }
    else {
        deployTokensPromise =  new Promise(function(resolve, reject) {
            resolve();
        });
    }

    return Promise.all([
        deployContracts(deployer),
        deployTokensPromise,
    ]);
};
