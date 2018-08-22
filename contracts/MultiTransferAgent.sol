pragma solidity ^0.4.22;


import "./SwaceToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


contract MultiTransferAgent is Ownable {
  using SafeMath for uint256;

  event MultiTranferedTokens(uint addressCount);

  SwaceToken public swa;

  constructor(SwaceToken _swa)
    public
  {
    setSwaceToken(_swa);
  }

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
   * @dev Send specified amount of tokens to a specified address.
   * @param _addresses address[] Array of addresses to send to.
   * @param _amounts uint[] Array of amounts to send.
   */
  function transfer(address[] _addresses, uint256[] _amounts)
    public
    onlyOwner
  {
    require(_addresses.length == _amounts.length);

    for (uint i = 0; i < _addresses.length; i += 1) {
      swa.transfer(address(_addresses[i]), _amounts[i]);
    }

    emit MultiTranferedTokens(_addresses.length);
  }
}
