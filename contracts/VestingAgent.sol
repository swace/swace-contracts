pragma solidity ^0.4.24;


import "./SwaceToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/TokenVesting.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";


contract VestingAgent is Ownable {
  using SafeMath for uint256;
  using SafeERC20 for ERC20Basic;

  event NewVesting(address indexed from, address indexed to, uint256 amount);

  mapping (address => TokenVesting) public vests;

  SwaceToken public swa;

  uint256 public totalVesting;

  /**
   * @dev Set SwaceToken.
   * @param _swa SwaceToken The address of swace token
   */
  function setSwaceToken(SwaceToken _swa)
    public
    onlyOwner
  {
    require(_swa != address(0));
    swa = _swa;
  }

  /**
   * @dev Grant tokens to a specified address.
   * @param _to address The address to grant tokens to.
   * @param _value uint256 The amount of tokens to be granted.
   * TODO: remove start or set it to the default value (contact deployment date)
   * @param _start uint256 The beginning of the vesting period.
   * @param _cliff uint256 Duration of the cliff period.
   * @param _duration uint256 The end of the vesting period.
   * @param _revokable bool Whether the grant is revokable or not.
   * @return A boolean that indicates if the operation was successful.
   */
  function grant(
    address _to,
    uint256 _value,
    uint256 _start,
    uint256 _cliff,
    uint256 _duration,
    bool _revokable
  )
    public
    onlyOwner
    returns (bool)
  {
    require(_value > 0);

    // Make sure that a single address can be granted tokens only once.
    require(vests[_to] == address(0));

    // Check that this grant doesn't exceed the total amount of tokens currently available for vesting.
    require(_value <= swa.balanceOf(address(this)));

    vests[_to] = new TokenVesting(_to, _start, _cliff, _duration, _revokable);
    swa.transfer(address(vests[_to]), _value);

    // Tokens vested, reduce the total amount available for vesting.
    totalVesting = totalVesting.add(_value);

    emit NewVesting(address(this), _to, _value);

    return true;
  }

  /**
   * @dev Get vesting contract address for beneficiary.
   * @param _to address The address of beneficiary.
   * @return Vesting contract.
   */
  function vesting(address _to)
    public
    view
    returns (TokenVesting)
  {
    return vests[_to];
  }

  /**
   * @dev Check the amount that has already been vested to given address.
   * @param _to address The address of beneficiary.
   * @return Vested amount of tokens for given address.
   */
  function vestedAmount(address _to)
    public
    view
    returns (uint256)
  {
    return vests[_to].vestedAmount(swa);
  }

  /**
   * @dev Check the amount that is available for release to given adress.
   * @param _to address The address of beneficiary.
   * @return Realeasable amount for given address.
   */
  function releasableAmount(address _to)
    public
    view
    returns (uint256)
  {
    return vests[_to].releasableAmount(swa);
  }

  /**
   * @dev Check the amount that is available to vest.
   * @return Amount available for vesting for this contract.
   */
  function vestingAmountAvailable()
    public
    view
    returns (uint256)
  {
    return swa.balanceOf(address(this)).sub(totalVesting);
  }

  /**
   * @dev Reclaim all ERC20Basic compatible tokens
   * @param _token ERC20Basic The address of the token contract
   */
  function reclaimToken(ERC20Basic _token)
    public
    onlyOwner
  {
    uint256 balance = _token.balanceOf(this);
    _token.safeTransfer(owner, balance);
  }
}
