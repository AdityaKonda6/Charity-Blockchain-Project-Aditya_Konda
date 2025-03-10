module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",   // Ganache RPC Server
      port: 8545,          // Ganache Port
      network_id: "1337",  // Network ID in Ganache
      gas: 6721975,        // Maximum Gas Limit
      gasPrice: 20000000000 // Gas Price (in wei)
    }
  },
  compilers: {
    solc: {
      version: "0.8.21",  // Use the exact version of Solidity Compiler
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  mocha: {
    timeout: 100000
  }
};
