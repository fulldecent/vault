pragma solidity ^0.4.18;

import "./base/Owned.sol";
import "./Wallet.sol";

/**
  * @title The Compound Smart Wallet Factory
  * @author Compound
  * @notice Helps Compound users create a Compound Smart Wallet
  * 		after registration.
  */
contract WalletFactory is Owned {
    /*
     * Note: These state variables are immuatable.
     * We must create a new factory to change either address.
     */
    address bankAddress;
    address etherTokenAddress;

    event NewWallet(address walletOwner, address newWalletAddress, address walletFactoryAddress);

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
      * @return wallet The new wallet which was created
      */
    function newWallet(address walletOwner) public onlyOwner returns (Wallet) {
        Wallet wallet = new Wallet(walletOwner, bankAddress, etherTokenAddress);

        NewWallet(walletOwner, address(wallet), address(this));

        return wallet;
    }

}
