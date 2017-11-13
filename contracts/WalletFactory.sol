pragma solidity ^0.4.18;

import "./Wallet.sol";

/**
  * @title The Compound Smart Wallet Factory
  * @author Compound
  * @notice Helps Compound users create a Compound Smart Wallet
  * 		after registration.
  */
contract WalletFactory {
    // Note: These variables are immuatable. Create a new factory to change them.
    address bankAddress;
    address etherTokenAddress;

	/**
      * @notice Creates a new Wallet Factory.
      * @param bankAddress_ Address of Compound Bank contract
      * @param etherTokenAddress_ Address of Compound EtherToken contract
      */
    function WalletFactory(address bankAddress_, address etherTokenAddress_) public {
        bankAddress = bankAddress_;
        etherTokenAddress = etherTokenAddress_;
    }

    /**
      * @notice Creates a new Compound Smart Wallet with given owner
      * @param owner Address of owner of new Compound Smart Wallet
      */
    function newWallet(address owner) public returns (Wallet) {
        return new Wallet(owner, bankAddress, etherTokenAddress);
    }

}