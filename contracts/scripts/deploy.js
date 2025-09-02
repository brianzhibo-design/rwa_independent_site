
const hre = require("hardhat");

async function main() {
  const RWA1155 = await hre.ethers.getContractFactory("RWA1155");
  const uri = "https://example.com/metadata/{id}.json"; // TODO: replace
  const rwa = await RWA1155.deploy(uri);
  await rwa.deployed();
  console.log("RWA1155 deployed to:", rwa.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
