pragma solidity ^0.4.18;

import "./Wallet.sol";

/**
  * @title The Compound Smart Wallet Factory
  * @author Compound
  * @notice Helps Compound users create a Compound Smart Wallet
  * 		after registration.
  */
contract WalletFactory {
    /*
     * Note: These state variables are immuatable.
     * We must create a new factory to change either address.
     */
    address bankAddress;
    address etherTokenAddress;

    event NewWallet(address owner, address newWalletAddress);

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
    function newWallet() public returns (Wallet) {
        Wallet wallet = new Wallet(msg.sender, bankAddress, etherTokenAddress);

        NewWallet(msg.sender, address(wallet));

        return wallet;
    }

}