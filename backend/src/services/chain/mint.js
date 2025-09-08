import { createWalletClient, http, parseAbi, getAddress, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

const ABI = parseAbi(['function mint(address to,uint256 id,uint256 amount,bytes data)'])

function ensureEnv() {
  const rpc = process.env.CHAIN_RPC_URL
  const contract = process.env.RWA_ERC1155_ADDRESS
  const rawPk = (process.env.PRIVATE_KEY || '').replace(/^0x/, '')
  if (!rpc) throw new Error('CHAIN_RPC_URL not set')
  if (!contract) throw new Error('RWA_ERC1155_ADDRESS not set')
  if (!rawPk) throw new Error('PRIVATE_KEY not set')
  return { rpc, contract: getAddress(contract), rawPk }
}

let _wallet = null
let _account = null
let _contract = null

function getWallet() {
  if (_wallet) return { wallet: _wallet, account: _account, contract: _contract }
  const { rpc, contract, rawPk } = ensureEnv()
  _account = privateKeyToAccount(`0x${rawPk}`)
  _wallet = createWalletClient({ account: _account, chain: sepolia, transport: http(rpc) })
  _contract = contract
  return { wallet: _wallet, account: _account, contract: _contract }
}

export async function mint1155(to, tokenId, amount = 1) {
  if (!isAddress(to)) throw new Error('invalid wallet address')
  const { wallet, contract } = getWallet()
  const hash = await wallet.writeContract({
    address: contract,
    abi: ABI,
    functionName: 'mint',
    args: [getAddress(to), BigInt(tokenId), BigInt(amount), '0x'],
    // gas: 120000n, // 如需手动指定可解注
  })
  return hash
}
