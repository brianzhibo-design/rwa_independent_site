import hre from 'hardhat';

async function main() {
  const [wallet] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const contract = await hre.viem.deployContract('RWA1155', ['https://example.com/metadata/{id}.json']);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: contract.deploymentTransaction().hash,
  });
  console.log('RWA1155 deployed to:', contract.address);
  console.log('Deploy tx:', receipt.transactionHash);
}

main().catch((e) => { console.error(e); process.exit(1); });
