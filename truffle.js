require('dotenv').config();
require('babel-register');
require('babel-polyfill');

const WalletProvider = require('truffle-wallet-provider');
const Wallet = require('ethereumjs-wallet');

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    coverage: {
      host: 'localhost',
      network_id: '*', // eslint-disable-line camelcase
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*', // eslint-disable-line camelcase
      gas: 5e6,
    },
    ganache: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*', // eslint-disable-line camelcase
      gas: 5e6,
    },
    ropsten: {
      provider: function () {
        let ropstenPrivateKey = Buffer.from(String(process.env.ROPSTEN_PRIVATE_KEY), 'hex');
        let ropstenWallet = Wallet.fromPrivateKey(ropstenPrivateKey);
        return new WalletProvider(ropstenWallet, 'https://ropsten.infura.io/' + process.env.INFURA_API_KEY);
      },
      network_id: 3, // eslint-disable-line camelcase
      gas: 4612388,
    },
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};
