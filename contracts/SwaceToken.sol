pragma solidity ^0.4.22;


import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/PausableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/CappedToken.sol";
import "openzeppelin-solidity/contracts/ownership/HasNoEther.sol";
import "openzeppelin-solidity/contracts/ownership/HasNoTokens.sol";


contract SwaceToken is DetailedERC20, PausableToken, CappedToken, HasNoTokens, HasNoEther {
  event Finalize(uint256 value);
  event ChangeVestingAgent(address indexed oldVestingAgent, address indexed newVestingAgent);

  uint256 private constant TOKEN_UNIT = 10 ** uint256(18);
  uint256 public constant TOTAL_SUPPLY = 2700e6 * TOKEN_UNIT;

  uint256 public constant COMMUNITY_SUPPLY = 621e6 * TOKEN_UNIT;
  uint256 public constant TEAM_SUPPLY = 324e6 * TOKEN_UNIT;
  uint256 public constant ADV_BTY_SUPPLY = 270e6 * TOKEN_UNIT;

  address public advBtyWallet;
  address public communityWallet;
  address public vestingAgent;

  bool public finalized = false;

  modifier onlyVestingAgent() {
    require(msg.sender == vestingAgent);
    _;
  }

  modifier whenNotFinalized() {
    require(!finalized);
    _;
  }

  constructor(
    address _communityWallet,
    address _teamWallet,
    address _advBtyWallet
  )
    public
    DetailedERC20("Swace", "SWA", 18)
    CappedToken(TOTAL_SUPPLY)
  {
    // solium-disable-next-line security/no-block-members
    require(_communityWallet != address(0));
    require(_teamWallet != address(0));
    require(_advBtyWallet != address(0));

    communityWallet = _communityWallet;
    advBtyWallet = _advBtyWallet;
    //Team wallet is actually vesting agent contract
    changeVestingAgent(_teamWallet);

    //Mint tokens to defined wallets
    mint(_communityWallet, COMMUNITY_SUPPLY);
    mint(_teamWallet, TEAM_SUPPLY);
    mint(_advBtyWallet, ADV_BTY_SUPPLY);

    //Mint owner with the rest of tokens
    mint(owner, TOTAL_SUPPLY.sub(totalSupply_));

    //Finish minting because we minted everything already
    finishMinting();
  }

  /**
   * @dev Original ERC20 approve with additional security mesure.
   * @param _spender The address which will spend the funds.
   * @param _value The amount of tokens to be spent.
   * @return A boolean that indicates if the operation was successful.
   */
  function approve(address _spender, uint256 _value)
    public
    returns (bool)
  {
    //https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
    require((_value == 0) || (allowed[msg.sender][_spender] == 0));
    return super.approve(_spender, _value);
  }

  /**
   * @dev Do finalization.
   * @return A boolean that indicates if the operation was successful.
   */
  function finalize()
    public
    onlyOwner
    whenNotFinalized
    returns (bool)
  {
    uint256 ownerBalance = balanceOf(owner);
    //Transfer what is left in owner to community wallet
    if (ownerBalance > 0) {
      transfer(communityWallet, ownerBalance);
    }

    uint256 advBtyBalance = balanceOf(advBtyWallet);
    //Transfer what is left in advisor & bounty wallet to community wallet
    //TODO: does not work probably because there is no approval
    if (advBtyBalance > 0) {
      transferFrom(advBtyWallet, communityWallet, advBtyBalance);
    }

    finalized = true;
    emit Finalize(ownerBalance.add(advBtyBalance));

    return true;
  }

  /**
   * TODO: add check if _vestingAgent is contract address
   * @dev Allow to change vesting agent.
   * @param _vestingAgent The address of new vesting agent.
   */
  function changeVestingAgent(address _vestingAgent)
    public
    onlyOwner
  {
    address oldVestingAgent = vestingAgent;
    vestingAgent = _vestingAgent;

    emit ChangeVestingAgent(oldVestingAgent, _vestingAgent);
  }
}
