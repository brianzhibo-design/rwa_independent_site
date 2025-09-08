import { createWalletClient, http, parseAbi, getAddress, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import * as chains from 'viem/chains'

const ABI = parseAbi(['function mint(address to,uint256 id,uint256 amount,bytes data)'])

function chainFromId(id) {
  return Object.values(chains).find((c) => c.id === id)
}

function ensureEnv() {
  const rpc = process.env.CHAIN_RPC_URL
  const contract = process.env.RWA_ERC1155_ADDRESS
  const rawPk = (process.env.PRIVATE_KEY || '').replace(/^0x/, '')
  const chainId = Number.parseInt(process.env.CHAIN_ID || '', 10)

  if (!rpc || !/^https?:\/\//.test(rpc)) throw new Error('CHAIN_RPC_URL invalid')
  if (!contract) throw new Error('RWA_ERC1155_ADDRESS not set')
  if (!rawPk || rawPk.length !== 64 || !/^[0-9a-fA-F]+$/.test(rawPk)) throw new Error('PRIVATE_KEY invalid')
  if (!Number.isInteger(chainId)) throw new Error('CHAIN_ID invalid')
  const chain = chainFromId(chainId)
  if (!chain) throw new Error(`unsupported chain id ${chainId}`)

  return { rpc, contract: getAddress(contract), rawPk, chain }
}

let _wallet = null
let _account = null
let _contract = null

function getWallet() {
  if (_wallet) return { wallet: _wallet, account: _account, contract: _contract }
  const { rpc, contract, rawPk, chain } = ensureEnv()
  _account = privateKeyToAccount(`0x${rawPk}`)
  _wallet = createWalletClient({ account: _account, chain, transport: http(rpc) })
  _contract = contract
  return { wallet: _wallet, account: _account, contract: _contract }
}

export async function mint1155(to, tokenId, amount = 1) {
  if (!isAddress(to)) throw new Error('invalid wallet address')
  const { wallet, contract } = getWallet()
  try {
    const hash = await wallet.writeContract({
      address: contract,
      abi: ABI,
      functionName: 'mint',
      args: [getAddress(to), BigInt(tokenId), BigInt(amount), '0x'],
    })
    return hash
  } catch (e) {
    console.error('[Mint] failed', e)
    throw e
  }
}
