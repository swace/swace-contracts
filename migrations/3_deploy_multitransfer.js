const FileSystem = require('fs');
const MultiTransferAgent = artifacts.require('./MultiTransferAgent');

const Config = JSON.parse(FileSystem.readFileSync('../data/config-development.json'));

module.exports = (deployer, network, accounts) => {
  if (network === 'development') {
    return;
  }

  const ownerWallet = Config.advisorBounty || accounts[2];
  const swaceContractAddress = Config.swaceContractAddress;

  if (!ownerWallet) {
    throw new Error('Owner wallet not set.');
  }

  if (!swaceContractAddress) {
    throw new Error('Swace contract address not set.');
  }

  console.log(ownerWallet);

  let multiTranferAgentContract;

  deployer.deploy(
    MultiTransferAgent,
    swaceContractAddress,
    { from: ownerWallet }
  ).then(() => {
    return MultiTransferAgent.deployed();
  }).then(async (instance) => {
    multiTranferAgentContract = instance;

    console.log('## MultiTranferAgent addr: ' + multiTranferAgentContract.address);
    console.log('## MultiTranferAgent abi:' + JSON.stringify(multiTranferAgentContract.abi));
  }).catch((exception) => {
    console.log(exception);
  });
};
