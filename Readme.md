
# Swace token ERC20 contract (SWA)
<p align="center">
  <img src="https://swace.io/images/swace-logo-color-white-type.svg">
</p>

## Requirements
  * NodeJS, version 10+
  * [Ganache](https://truffleframework.com/ganache) Personal Ethereum blockchain provider
  * [Truffle](http://truffleframework.com/) Ethereum developer framework
  * [Solidity Flattener](https://github.com/BlockCatIO/solidity-flattener) Combine all contracts to single \*.sol file

## Instructions
### Initialisation
```
npm install
```

### Compiling,  migrating & deploying
Access console with `truffle console`. In console type `compile` to compile the contracts. If you want to migrate the contracts make sure Ganache is up and running, then execute `migrate`. Before running `deploy` make sure that account addresses are set in `data/config-development.yml`, otherwise default Ganache accounts will be used.

### Testing
To run tests execute `test` while being in Truffle console.

### Other
Flatten the contract
```
solidity_flattener --solc-paths="openzeppelin-solidity/=$(pwd)/node_modules/openzeppelin-solidity/" --output=flattened/SwaceToken.sol  contracts/SwaceToken.sol
solidity_flattener --solc-paths="openzeppelin-solidity/=$(pwd)/node_modules/openzeppelin-solidity/" --output=flattened/VestingAgent.sol  contracts/VestingAgent.sol
```

### Etherscan
Swace Token (SWA) contract address: [0x7e6509ac567e7de3bc702e7caf3b56245b50d1a7](https://etherscan.io/token/0x7e6509ac567e7de3bc702e7caf3b56245b50d1a7)
