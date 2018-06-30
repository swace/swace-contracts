const FileSystem = require('fs');
const SwaceToken = artifacts.require('./SwaceToken');
const VestingAgent = artifacts.require('./VestingAgent');

const Config = JSON.parse(FileSystem.readFileSync('../data/config-development.json'));

module.exports = (deployer, network, accounts) => {
  if (network === 'development') {
    return;
  }

  const ownerWallet = Config.owner || accounts[0];
  const communityWallet = Config.community || accounts[1];
  const advisorBountyWallet = Config.advisorBounty || accounts[2];

  if (!ownerWallet) {
    throw new Error('Owner wallet not set.');
  }

  if (!communityWallet) {
    throw new Error('Community wallet not set.');
  }

  if (!advisorBountyWallet) {
    throw new Error('Advisor & Bounty wallet not set.');
  }

  console.log(ownerWallet);

  const cliff = 15552000; // 6 months
  const duration = 62208000; // 24 months

  let tokenContract;
  let vestingAgentContract;

  web3.eth.getBlock('latest', (e, block) => {
    if (!e) {
      const startTime = block.timestamp + 60;

      return deployer
        .deploy(VestingAgent, { from: ownerWallet })
        .then(() => {
          return VestingAgent.deployed();
        }).then((instance) => {
          vestingAgentContract = instance;

          console.log('## VestingAgent addr: ' + vestingAgentContract.address);
          console.log('## VestingAgent abi:' + JSON.stringify(vestingAgentContract.abi));

          return deployer.deploy(
            SwaceToken,
            communityWallet,
            vestingAgentContract.address,
            advisorBountyWallet,
            { from: ownerWallet }
          );
        }).then(() => {
          return SwaceToken.deployed();
        }).then(async (instance) => {
          tokenContract = instance;

          console.log('## SWA addr: ' + tokenContract.address);
          console.log('## SWA abi: ' + JSON.stringify(tokenContract.abi));

          await vestingAgentContract.setSwaceToken(tokenContract.address, { from: ownerWallet });

          if (Config.team.length > 0) {
            for (let t of Config.team) {
              await vestingAgentContract.grant(
                web3.toHex(t.beneficiary),
                t.amount,
                startTime, cliff, duration, t.revokable, { from: ownerWallet }
              );

              console.log('Vested ' + t.amount + ' for ' + t.beneficiary);
            }
          }
        });
    }
  });
};
