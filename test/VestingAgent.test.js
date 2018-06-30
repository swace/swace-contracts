import advanceBlock from './helpers/advanceToBlock';
import expectEvent from './helpers/expectEvent';
import latestTime from './helpers/latestTime';
import EVMRevert from './helpers/EVMRevert';

let BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const VestingAgent = artifacts.require('./VestingAgent.sol');
const SwaceToken = artifacts.require('./SwaceToken.sol');

contract('VestingAgent', (accounts) => {
  const amount = 1000000;
  const vestingCliff = 432000; // 5 days
  const vestingDuration = 864000; // 10 days
  // const afterVestingDuration = vestingDuration + duration.seconds(1);
  const startTime = latestTime();

  const owner = accounts[0];
  const communityWallet = accounts[2];
  const advisorBountyWallet = accounts[3];

  const receiver = accounts[4];
  const other = accounts[4];

  let token;
  let agent;

  before(async () => {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async () => {
    agent = await (VestingAgent.new({ from: owner }));

    token = await SwaceToken.new(
      communityWallet,
      agent.address,
      advisorBountyWallet,
      { from: owner }
    );

    await agent.setSwaceToken(token.address, { from: owner });
  });

  describe('generic', () => {
    it('should not allow to set Swace token from other account', async function () {
      await agent.setSwaceToken(token.address, { from: other })
        .should.be.rejectedWith(EVMRevert);
    });
  });

  describe('vesting', () => {
    it('should not allow to grant from other account', async function () {
      await agent.grant(
        receiver, amount, startTime, vestingCliff, vestingDuration, true,
        { from: other }
      ).should.be.rejectedWith(EVMRevert);
    });

    it('should allow to grant from owner', async function () {
      await agent.grant(
        receiver, amount, startTime, vestingCliff, vestingDuration, true,
        { from: owner }
      );
    });

    it('should have correct amounts after granting', async function () {
      let spender = agent.address;

      let balanceSpenderStarting = await token.balanceOf(spender);

      let event = await expectEvent.inTransaction(
        await agent.grant(
          receiver, amount, startTime, vestingCliff, vestingDuration, true,
          { from: owner }
        ),
        'NewVesting'
      );

      event.args.from.should.be.equal(spender);
      event.args.to.should.be.equal(receiver);
      event.args.amount.should.be.bignumber.equal(amount);

      let balanceSpenderEnding = await token.balanceOf(spender);
      let balanceReceiverEnding = await token.balanceOf(receiver);

      let vesting = await agent.vesting(receiver);
      let vestingBalance = await token.balanceOf(vesting);

      balanceSpenderEnding.should.be.bignumber.equal(balanceSpenderStarting.minus(amount));
      balanceReceiverEnding.should.be.bignumber.equal(new BigNumber(0));
      vestingBalance.should.be.bignumber.equal(new BigNumber(amount));
    });
  });
});
