import advanceBlock from './helpers/advanceToBlock';
import expectEvent from './helpers/expectEvent';
// import { increaseTimeTo, duration } from './helpers/increaseTime';
// import latestTime from './helpers/latestTime';
import EVMRevert from './helpers/EVMRevert';

let BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const SwaceToken = artifacts.require('./SwaceToken.sol');

contract('SwaceToken', (accounts) => {
  const zeroWallet = '0x0000000000000000000000000000000000000000';
  const cap = new BigNumber(2700e6 * 10 ** 18);

  const owner = accounts[0];
  const teamWallet = accounts[1];
  const communityWallet = accounts[2];
  const advisorBountyWallet = accounts[3];

  const receiver = accounts[4];
  const other = accounts[4];
  const newVA = accounts[4];

  let token;

  before(async () => {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async () => {
    token = await SwaceToken.new(
      communityWallet,
      teamWallet,
      advisorBountyWallet,
      { from: owner }
    );
  });

  describe('initialize', () => {
    it('community wallet should not be the zero address', async function () {
      await SwaceToken.new(
        zeroWallet,
        teamWallet,
        advisorBountyWallet
      ).should.be.rejectedWith(EVMRevert);
    });

    it('team wallet should not be the zero address', async () => {
      await SwaceToken.new(
        communityWallet,
        zeroWallet,
        advisorBountyWallet
      ).should.be.rejectedWith(EVMRevert);
    });

    it('adivsor & bounty wallet should not be the zero address', async () => {
      await SwaceToken.new(
        communityWallet,
        teamWallet,
        zeroWallet
      ).should.be.rejectedWith(EVMRevert);
    });

    it('should have set community wallet', async () => {
      (await token.communityWallet()).should.be.equal(communityWallet);
    });

    it('should have set vesting agent', async () => {
      (await token.vestingAgent()).should.be.equal(teamWallet);
    });
  });

  describe('details', function () {
    it('should have a name', async () => {
      (await token.name()).should.be.equal('Swace');
    });

    it('should have a symbol', async () => {
      (await token.symbol()).should.be.equal('SWA');
    });

    it('should have 18 decimals', async () => {
      (await token.decimals()).should.be.bignumber.equal(18);
    });

    it('should have correct cap', async () => {
      (await token.cap()).should.be.bignumber.equal(cap);
    });

    it('should be not paused', async () => {
      (await token.paused()).should.be.equal(false);
    });
  });

  describe('reserved supplies', () => {
    let _supply = new BigNumber(0);
    it('should have correct team supply', async () => {
      let supply = await token.TEAM_SUPPLY();
      _supply = _supply.plus(supply);
      let balance = await token.balanceOf(teamWallet);
      balance.should.be.bignumber.equal(supply);
    });

    it('should have correct community supply', async () => {
      let supply = await token.COMMUNITY_SUPPLY();
      _supply = _supply.plus(supply);
      let balance = await token.balanceOf(communityWallet);
      balance.should.be.bignumber.equal(supply);
    });

    it('should have correct advisor & bounty supply', async () => {
      let supply = await token.ADV_BTY_SUPPLY();
      _supply = _supply.plus(supply);
      let balance = await token.balanceOf(advisorBountyWallet);
      balance.should.be.bignumber.equal(supply);
    });

    it('should have correct owner supply', async () => {
      let balance = await token.balanceOf(owner);
      balance.should.be.bignumber.equal(cap.minus(_supply));
    });
  });

  describe('transfers', function () {
    it('should send tokens correctly', async () => {
      let amount = 1000000;
      let spender = owner;

      let balanceSpenderStarting = await token.balanceOf(spender);
      let balanceReceiverStarting = await token.balanceOf(receiver);

      await token.transfer(receiver, amount, { from: owner });

      let balanceSpenderEnding = await token.balanceOf(spender);
      let balanceReceiverEnding = await token.balanceOf(receiver);

      balanceSpenderEnding.should.be.bignumber.equal(balanceSpenderStarting.minus(amount));
      balanceReceiverEnding.should.be.bignumber.equal(balanceReceiverStarting.plus(amount));
    });
  });

  describe('vesting agent', () => {
    it('should not allow to change vesting agent for others', async () => {
      await token.changeVestingAgent(newVA, { from: other }).should.be.rejectedWith(EVMRevert);
    });

    it('should change vesting agent', async () => {
      let oldVA = await token.vestingAgent();

      let event = await expectEvent.inTransaction(
        await token.changeVestingAgent(newVA, { from: owner }),
        'ChangeVestingAgent'
      );

      event.args.oldVestingAgent.should.be.equal(oldVA);
      event.args.newVestingAgent.should.be.equal(newVA);

      (await token.vestingAgent()).should.be.equal(newVA);
    });
  });

  describe('finalization', () => {
    it('should only allow to finalize for owner', async () => {
      await token.finalize({ from: other }).should.be.rejectedWith(EVMRevert);
    });

    it('should finalize', async () => {
      let amount = 1000000;

      let balanceOwnerStarting = await token.balanceOf(owner);
      let balanceAdvBtyStarting = await token.balanceOf(advisorBountyWallet);
      let balanceCommunityStarting = await token.balanceOf(communityWallet);

      await token.approve(owner, balanceAdvBtyStarting, { from: advisorBountyWallet });

      // Some transfers
      await token.transfer(receiver, amount, { from: owner });

      // The amount that left after last transfer will be passed to event
      let balanceOwnerEvent = await token.balanceOf(owner);
      balanceOwnerEvent = balanceOwnerEvent.plus(balanceAdvBtyStarting);

      let event = await expectEvent.inTransaction(token.finalize({ from: owner }), 'Finalize');
      event.args.value.should.bignumber.equal(balanceOwnerEvent);

      let balanceOwnerEnding = await token.balanceOf(owner);
      let balanceCommunityEnding = await token.balanceOf(communityWallet);

      (await token.finalized()).should.be.equal(true);

      balanceOwnerEnding.should.be.bignumber.equal(new BigNumber(0));
      let balanceExpected = balanceCommunityStarting.plus(balanceOwnerStarting.minus(amount));
      balanceExpected = balanceExpected.plus(balanceAdvBtyStarting);
      balanceCommunityEnding.should.be.bignumber.equal(balanceExpected);

      (await token.mintingFinished()).should.be.equal(true);
    });

    it('should finalize once', async () => {
      let balanceAdvBtyStarting = await token.balanceOf(advisorBountyWallet);
      await token.approve(owner, balanceAdvBtyStarting, { from: advisorBountyWallet });
      await token.finalize({ from: owner });
      await token.finalize({ from: owner }).should.be.rejectedWith(EVMRevert);
    });
  });
});
