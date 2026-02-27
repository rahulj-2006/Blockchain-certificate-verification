import { createRequire } from "module";
const require = createRequire(import.meta.url);

import * as dotenv from "dotenv";
dotenv.config();

import "@nomicfoundation/hardhat-toolbox";

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL;

/** @type import('hardhat/config').HardhatUserConfig */
export default {
    solidity: {
        version: "0.8.20",
        settings: { optimizer: { enabled: true, runs: 200 } },
    },
    networks: {
        hardhat: {},

        sepolia: {
            url: RPC_URL || "",
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            chainId: 11155111,
        },

        mainnet: {
            url: RPC_URL || "",
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            chainId: 1,
        },

        polygon: {
            url: RPC_URL || "",
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            chainId: 137,
        },
    },

    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY || "",
    },
};
