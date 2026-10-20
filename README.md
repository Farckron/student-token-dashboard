# Student Token Dashboard

Group 3 assignment "Create & Transfer Your Tokens". Two fixed-supply ERC-20 tokens deployed on Ethereum Sepolia (chainId 11155111), plus a small static web page to check balances and send tokens with MetaMask.

Public dashboard: https://farckron.github.io/student-token-dashboard/

## Token specification

| | Token A | Token B |
|---|---|---|
| Name | Study Credit | Coffee Token |
| Symbol | STCR | CAFE |
| Decimals | 18 | 18 |
| Supply | 10,000 (fixed) | 100,000 (fixed) |
| Mint policy | Whole supply minted once to the deployer in the constructor. No mint function, so no further minting. | Same |
| Purpose | Rare academic achievements: top project grade, helping others, perfect attendance streak. | Everyday small rewards: showing up, answering in class, small favors. |

### Why two separate tokens

The two tokens reward different things. Study Credit has a small supply and is given out rarely, for real achievements. Coffee Token has ten times the supply and is given out often, for small everyday things. With a single token, someone who collected a lot of everyday rewards would look the same as someone with a top project grade. Two contracts give two separate supplies and two separate balances, and the dashboard shows both for each wallet.

## Contracts

| Token | Contract | Deploy transaction |
|---|---|---|
| Study Credit (STCR) | [0xF482674A7250dcF818cE8936946B5Bad30F0AFDD](https://sepolia.etherscan.io/address/0xF482674A7250dcF818cE8936946B5Bad30F0AFDD) | [0xcd44abec…8277](https://sepolia.etherscan.io/tx/0xcd44abec2cab24fa14e73a16dfb2f8d450ce74ec2e94099460cbc4f3d3038277) |
| Coffee Token (CAFE) | [0x65BE388dC442AB1A6E64712dE1cE6Bb50c8dC323](https://sepolia.etherscan.io/address/0x65BE388dC442AB1A6E64712dE1cE6Bb50c8dC323) | [0xedefb991…147c](https://sepolia.etherscan.io/tx/0xedefb991129bd62a02f1531b17978bc3fe65d494978bf2e546d6fa859891147c) |

Deployer wallet: [0x2E5fb463721ff810cF0CEAc0aD9d0B3b2e020515](https://sepolia.etherscan.io/address/0x2E5fb463721ff810cF0CEAc0aD9d0B3b2e020515)

Both contracts use OpenZeppelin `ERC20` 5.6.1. They were compiled with solc 0.8.30 (optimizer on, 200 runs) and deployed to Sepolia from the deployer wallet with an ethers.js v6 script.

### The two changes between the .sol files

`contracts/StudyCredit.sol` and `contracts/CoffeeToken.sol` are the same code (apart from the one-line header comment) except for:

1. Contract name and ERC20 name/symbol: `StudyCredit` with `ERC20("Study Credit", "STCR")` vs `CoffeeToken` with `ERC20("Coffee Token", "CAFE")`.
2. Initial supply: `10000 * 10 ** decimals()` vs `100000 * 10 ** decimals()`.

## Mandatory lecturer transfers

Recipient: `0x5f3046bD5aA3c6d4575AF09B8198d584f130708E`

| Token | Amount | Transaction |
|---|---|---|
| Study Credit (STCR) | 1.0 STCR | [0x3e7b7bde…4ddf](https://sepolia.etherscan.io/tx/0x3e7b7bde944ef4fc6d95c73dafbcf8800b674045154b01115ca31cb7cd974ddf) |
| Coffee Token (CAFE) | 1.0 CAFE | [0x29ccffb5…a2c5](https://sepolia.etherscan.io/tx/0x29ccffb5ecd6d09a703a3064bf4b1b043ad28cebe8c7986f1e218e336ebca2c5) |

## Other transfers

| Recipient | Wallet | Token | Amount | Transaction |
|---|---|---|---|---|
| Second test wallet (wallet B) | [0x7acf8A4f96417c8714E8564A45E34c0DA224EF16](https://sepolia.etherscan.io/address/0x7acf8A4f96417c8714E8564A45E34c0DA224EF16) | STCR | 100 | [0x1c21eec0…e70f](https://sepolia.etherscan.io/tx/0x1c21eec0efc109ea4e35603b322461f0da25b012574ceb89b15520dda997e70f) |
| Second test wallet (wallet B) | [0x7acf8A4f96417c8714E8564A45E34c0DA224EF16](https://sepolia.etherscan.io/address/0x7acf8A4f96417c8714E8564A45E34c0DA224EF16) | CAFE | 1,000 | [0x32c100c5…b428](https://sepolia.etherscan.io/tx/0x32c100c5ffb20fd6d8748fcab596e89733f32a513aa8c43f037927fdb907b428) |
| Classmate (Mary) | [0x49E3A4D5971C82BCc892ADb17c4129710c55cA77](https://sepolia.etherscan.io/address/0x49E3A4D5971C82BCc892ADb17c4129710c55cA77) | STCR | 10 | [0xaa2f4355…3968](https://sepolia.etherscan.io/tx/0xaa2f43553f4313d63b62b0aaacad8f1b86116814bf03b15cf49cc0a0ac023968) |
| Classmate (Amir) | [0x8898aaBCf31f5CD257d403453F5F16279562Ea70](https://sepolia.etherscan.io/address/0x8898aaBCf31f5CD257d403453F5F16279562Ea70) | STCR | 10 | [0x8946f296…da18](https://sepolia.etherscan.io/tx/0x8946f2963574053514b17a5e60c13e9a154d8bfded61b96a2453c506a517da18) |
| Classmate (Mary) | [0x49E3A4D5971C82BCc892ADb17c4129710c55cA77](https://sepolia.etherscan.io/address/0x49E3A4D5971C82BCc892ADb17c4129710c55cA77) | CAFE | 100 | [0xa190bcbd…4a66](https://sepolia.etherscan.io/tx/0xa190bcbd14b26bb8107542a14f994dfa409268e3c0045c849291098949594a66) |
| Classmate (Amir) | [0x8898aaBCf31f5CD257d403453F5F16279562Ea70](https://sepolia.etherscan.io/address/0x8898aaBCf31f5CD257d403453F5F16279562Ea70) | CAFE | 100 | [0xaa62a796…6679](https://sepolia.etherscan.io/tx/0xaa62a7964b0206d573be56db79d9d7879232e22006534deaf284a3d9157a6679) |

## Test results

| Test | What is checked | Result |
|---|---|---|
| Both deployments | Both contracts deployed on Sepolia and visible on Etherscan | Pass: two contract addresses above, both deploy transactions succeeded |
| Initial supply | totalSupply is 10,000 STCR and 100,000 CAFE, all held by the deployer after deploy | Pass: totalSupply() returned 10000.0 STCR and 100000.0 CAFE; deployer held the full supply before the first transfer |
| Transfers | Tokens sent to other wallets arrive and balances change on both sides | Pass: after all transfers above, totalSupply() is unchanged and sender/recipient balances add up |
| Lecturer transfer A | 1.0 STCR sent to the lecturer wallet | Pass: receipt status 1, Transfer event from the STCR contract to the lecturer, value 10^18 (1.0 STCR) |
| Lecturer transfer B | 1.0 CAFE sent to the lecturer wallet | Pass: receipt status 1, Transfer event from the CAFE contract to the lecturer, value 10^18 (1.0 CAFE) |
| UI balances | Dashboard shows correct balances for two different wallets | TODO |
| Wrong address | Invalid recipient is rejected before any wallet request | TODO |
| Excess/zero amount | Amount above balance, zero or empty is rejected with a clear message | TODO |
| Wrong chain | On another network the app blocks sending and offers to switch to Sepolia | TODO |
| MetaMask cancellation | Rejecting in MetaMask shows "Transaction cancelled", never success | TODO |
| Reload | After reload the balances still match the blockchain | TODO |

## How to get tokens

Post your Sepolia address in the group chat, or open an issue in this repository with your address. The deploying wallet will send you some STCR and CAFE.

## How to use the dashboard

1. Install MetaMask from https://metamask.io and create or open a wallet.
2. Switch MetaMask to the Sepolia test network. The dashboard shows a "Switch to Sepolia" button if you are on another network.
3. Open the dashboard and click "Connect Wallet". Your balances of both tokens are read from the chain.
4. To send: pick a token, enter the destination address and amount, click "Send", then confirm in MetaMask. The page shows the pending transaction with an Etherscan link and reports success only after the transaction is mined.
5. To see the tokens inside MetaMask itself: Import tokens, then paste the contract address. Symbol and decimals fill in automatically.

### Gas

Every transfer is an Ethereum transaction, and its fee is paid in SepoliaETH, not in STCR or CAFE. You need a small amount of SepoliaETH in the sending wallet. Free test ETH is available from a faucet, for example https://cloud.google.com/application/web3/faucet/ethereum/sepolia.

## How the dashboard works

- The page is plain HTML and JavaScript with no build step. `ethers` v6.13.4 is loaded as an ES module from jsDelivr.
- `name()`, `symbol()` and `decimals()` are read from each contract. Amounts are converted with `parseUnits` when sending and `formatUnits` when displaying, so nothing assumes 18 decimals.
- Input is validated before any MetaMask popup: address format, zero address, empty, non-numeric, zero, too many decimals; the balance is then re-read with a read-only call and an amount above it is rejected before the transfer is requested.
- The page listens for `accountsChanged` and `chainChanged` and reloads state when either changes. If the site was already authorised, it reconnects on load without a popup.
- Contract addresses are set at the top of `app.js` in the `TOKENS` list.

## Repository structure

```
contracts/StudyCredit.sol   Token A source
contracts/CoffeeToken.sol   Token B source
index.html                  Dashboard page and styles
app.js                      Dashboard logic (wallet, balances, transfers)
README.md                   This file
```

## Safety notes

- Sepolia testnet only. These tokens have no monetary value.
- The dashboard never asks for a private key or seed phrase. All signing happens inside MetaMask.
- Never share your seed phrase with anyone, and do not reuse a wallet that holds real funds for coursework.
