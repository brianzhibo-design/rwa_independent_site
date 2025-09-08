import '@nomicfoundation/hardhat-viem';
import dotenv from 'dotenv';
dotenv.config();

const { CHAIN_RPC_URL, PRIVATE_KEY } = process.env;

export default {
  solidity: '0.8.24',
  networks: {
    sepolia: {
      type: 'http',
      url: CHAIN_RPC_URL,
      accounts: PRIVATE_KEY ? [`0x${PRIVATE_KEY.replace(/^0x/, '')}`] : [],
    },
  },
};
