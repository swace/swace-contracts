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
  const vestingWallet = accounts[1];
  const ieoWallet = accounts[2];

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
      vestingWallet,
      ieoWallet,
      { from: owner }
    );
  });

  describe('initialize', () => {
    it('vesting wallet should not be the zero address', async function () {
      await SwaceToken.new(
        zeroWallet,
        ieoWallet
      ).should.be.rejectedWith(EVMRevert);
    });

    it('IEO wallet should not be the zero address', async () => {
      await SwaceToken.new(
        vestingWallet,
        zeroWallet
      ).should.be.rejectedWith(EVMRevert);
    });

    it('should have set IEO wallet', async () => {
      (await token.ieoWallet()).should.be.equal(ieoWallet);
    });

    it('should have set vesting agent', async () => {
      (await token.vestingAgent()).should.be.equal(vestingWallet);
    });
  });

  describe('details', function () {
    it('should have Swace as a name', async () => {
      (await token.name()).should.be.equal('Swace');
    });

    it('should have SWACE as a symbol', async () => {
      (await token.symbol()).should.be.equal('SWACE');
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
    it('should have correct IEO supply', async () => {
      let supply = await token.IEO_SUPPLY();
      _supply = _supply.plus(supply);
      let balance = await token.balanceOf(ieoWallet);
      balance.should.be.bignumber.equal(supply);
    });

    it('should have correct vesting supply', async () => {
      let supply = await token.VESTING_SUPPLY();
      _supply = _supply.plus(supply);
      let balance = await token.balanceOf(vestingWallet);
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
});
