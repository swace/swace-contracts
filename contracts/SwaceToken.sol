pragma solidity ^0.4.24;


import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/PausableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/CappedToken.sol";


contract SwaceToken is DetailedERC20, PausableToken, CappedToken {
  event ChangeVestingAgent(address indexed oldVestingAgent, address indexed newVestingAgent);

  uint256 private constant TOKEN_UNIT = 10 ** uint256(18);
  uint256 public constant TOTAL_SUPPLY = 2.7e9 * TOKEN_UNIT;

  uint256 public constant VESTING_SUPPLY = 5.67e8 * TOKEN_UNIT;
  uint256 public constant IEO_SUPPLY = 1.35e8 * TOKEN_UNIT;

  address public ieoWallet;
  address public vestingAgent;

  modifier onlyVestingAgent() {
    require(msg.sender == vestingAgent, "Sender not authorized to be as vesting agent");
    _;
  }

  constructor(
    address _vestingWallet,
    address _ieoWallet
  )
    public
    DetailedERC20("Swace", "SWACE", 18)
    CappedToken(TOTAL_SUPPLY)
  {
    // solium-disable-next-line security/no-block-members
    require(_vestingWallet != address(0), "Vesting wallet can not be empty");
    require(_ieoWallet != address(0), "IEO wallet can not be empty");

    ieoWallet = _ieoWallet;

    //Team wallet is actually vesting agent contract
    changeVestingAgent(_vestingWallet);

    //Mint tokens to defined wallets
    mint(_vestingWallet, VESTING_SUPPLY);
    mint(_ieoWallet, IEO_SUPPLY);

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
    require((_value == 0) || (allowed[msg.sender][_spender] == 0), "Approval can not be granted");

    return super.approve(_spender, _value);
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
