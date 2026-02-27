import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("═══════════════════════════════════════════");
    console.log("  ChainVerify — CertificateRegistry Deploy");
    console.log("═══════════════════════════════════════════");
    console.log(`  Network : ${hre.network.name}`);
    console.log(`  Deployer: ${deployer.address}`);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`  Balance : ${hre.ethers.formatEther(balance)} ETH`);
    console.log("───────────────────────────────────────────");

    console.log("\n⏳ Deploying CertificateRegistry...");
    const Factory = await hre.ethers.getContractFactory("CertificateRegistry");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log(`\n✅ Deployed!`);
    console.log(`   Address: ${address}`);
    console.log(`   Tx hash: ${contract.deploymentTransaction().hash}`);

    // Auto-update artifacts/contractAddress.json
    const artifactsDir = path.join(__dirname, "..", "artifacts");
    fs.mkdirSync(artifactsDir, { recursive: true });

    fs.writeFileSync(
        path.join(artifactsDir, "contractAddress.json"),
        JSON.stringify({ address }, null, 2)
    );
    console.log(`\n📄 Updated artifacts/contractAddress.json`);

    // Auto-copy ABI
    const abiSrc = path.join(
        __dirname, "..", "artifacts", "contracts",
        "CertificateRegistry.sol", "CertificateRegistry.json"
    );
    if (fs.existsSync(abiSrc)) {
        const compiled = JSON.parse(fs.readFileSync(abiSrc, "utf8"));
        fs.writeFileSync(
            path.join(artifactsDir, "CertificateRegistry_ABI.json"),
            JSON.stringify(compiled.abi, null, 2)
        );
        console.log(`📄 Updated artifacts/CertificateRegistry_ABI.json`);
    }

    console.log("\n════════════════════════════════════════════");
    console.log("  ✏️  Now update frontend/.env with:");
    console.log(`  VITE_CONTRACT_ADDRESS=${address}`);
    console.log(`  VITE_SUPER_ADMIN_ADDRESS=${deployer.address}`);
    console.log("════════════════════════════════════════════\n");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
