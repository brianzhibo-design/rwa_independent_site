import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const artifactPath = resolve(__dirname, '../artifacts/contracts/RWA1155.sol/RWA1155.json')
const artifact = JSON.parse(await readFile(artifactPath, 'utf8'))

const rpc = process.env.CHAIN_RPC_URL
const pk  = (process.env.PRIVATE_KEY || '').replace(/^0x/,'')
if (!rpc || !pk) {
  console.error('Missing CHAIN_RPC_URL or PRIVATE_KEY in .env')
  process.exit(1)
}

const account = privateKeyToAccount(`0x${pk}`)
const transport = http(rpc)
const publicClient = createPublicClient({ chain: sepolia, transport })
const walletClient = createWalletClient({ account, chain: sepolia, transport })

const main = async () => {
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: ['https://example.com/metadata/{id}.json']
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log('RWA1155 deployed to:', receipt.contractAddress)
  console.log('Deploy tx:', receipt.transactionHash)
}
main().catch(e => { console.error(e); process.exit(1) })
