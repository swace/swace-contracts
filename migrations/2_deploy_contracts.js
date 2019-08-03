const FileSystem = require('fs');
const SwaceToken = artifacts.require('./SwaceToken');
const VestingAgent = artifacts.require('./VestingAgent');

const Config = JSON.parse(FileSystem.readFileSync('../data/config-development.json'));

module.exports = (deployer, network, accounts) => {
  // if (network === 'development') {
  //   return;
  // }

  const ownerWallet = Config.owner || accounts[0];
  const vestingWallet = Config.vestingOwner || accounts[1];
  const ieoWallet = Config.ieo || accounts[2];

  if (!ownerWallet) {
    throw new Error('Owner wallet not set.');
  }

  if (!vestingWallet) {
    throw new Error('Vesting wallet not set.');
  }

  if (!ieoWallet) {
    throw new Error('IEO wallet not set.');
  }

  console.log('OW: ' + ownerWallet + '; VW: ' + vestingWallet);

  let tokenContract;
  let vestingAgentContract;

  return deployer
    .deploy(VestingAgent, { from: vestingWallet })
    .then(() => {
      return VestingAgent.deployed();
    }).then((instance) => {
      vestingAgentContract = instance;

      console.log('## VestingAgent 2 addr: ' + vestingAgentContract.address);
      console.log('## VestingAgent 2 abi:' + JSON.stringify(vestingAgentContract.abi));

      return deployer.deploy(
        SwaceToken,
        vestingAgentContract.address,
        ieoWallet,
        { from: ownerWallet }
      );
    }).then(() => {
      return SwaceToken.deployed();
    }).then(async (instance) => {
      tokenContract = instance;

      console.log('## SWA addr: ' + tokenContract.address);
      console.log('## SWA abi: ' + JSON.stringify(tokenContract.abi));

      await vestingAgentContract.setSwaceToken(tokenContract.address, { from: vestingWallet });

      if (Config.vesting.length > 0) {
        let startTime = web3.eth.getBlock('latest').timestamp + 60;

        console.log('Start time: ' + startTime);

        for (let vesting of Config.vesting) {
          if (vesting.beneficiary === '' || parseInt(vesting.amount) <= 0) {
            console.log('Skip vesting of ' +
             vesting.amount +
             ' for ' +
             (vesting.beneficiary ? vesting.beneficiary : '<empty wallet>')
            );
            continue;
          }

          await vestingAgentContract.grant(
            web3.toHex(vesting.beneficiary),
            vesting.amount,
            startTime, vesting.cliff, vesting.duration, vesting.revokable, { from: vestingWallet }
          );

          console.log(
            'Vested ' + vesting.amount + ' for ' + vesting.beneficiary +
            ', contract: ' + await vestingAgentContract.vesting(vesting.beneficiary)
          );
        }
      }
    });
};
