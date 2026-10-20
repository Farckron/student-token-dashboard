// Deploy STCR + CAFE to Sepolia, verify supply, send lecturer + wallet B transfers.
// Resumable: every completed step is saved to deployments.json and skipped on rerun.
const { JsonRpcProvider, Wallet, ContractFactory, Contract, parseUnits, formatUnits, parseEther, getAddress } = require("ethers");
const fs = require("fs");

const RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const LECTURER = getAddress("0x5f3046bD5aA3c6d4575AF09B8198d584f130708E");
const STATE = "deployments.json";
const keys = JSON.parse(fs.readFileSync("/home/mxn/RTU/BA-sys/sepolia-test-wallets.json", "utf8"));
const art = JSON.parse(fs.readFileSync("artifacts.json", "utf8"));
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {};
const save = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 2));

const TOKENS = [
  { key: "A", contract: "StudyCredit", symbol: "STCR", supply: "10000", toB: "100" },
  { key: "B", contract: "CoffeeToken", symbol: "CAFE", supply: "100000", toB: "1000" },
];

async function step(name, fn) {
  if (state[name]) return console.log(`skip ${name}: ${state[name]}`);
  const tx = await fn();
  console.log(`${name}: sent ${tx.hash}`);
  state[name] = tx.hash; save(); // save hash before waiting, so a rerun never resends
  const r = await tx.wait();
  if (r.status !== 1) throw new Error(`${name} failed: ${tx.hash}`);
  console.log(`${name}: confirmed in block ${r.blockNumber}`);
  return r;
}

(async () => {
  const provider = new JsonRpcProvider(RPC);
  if ((await provider.getNetwork()).chainId !== 11155111n) throw new Error("Not Sepolia");
  const signer = new Wallet(keys.walletA.privateKey, provider);
  const walletB = keys.walletB.address;
  state.deployer = signer.address; save();

  for (const t of TOKENS) {
    const { abi, bytecode } = art[t.contract];
    if (!state[`deploy${t.key}`]) {
      const c = await new ContractFactory(abi, bytecode, signer).deploy();
      state[`token${t.key}`] = await c.getAddress(); save();
      await step(`deploy${t.key}`, async () => c.deploymentTransaction());
    } else console.log(`skip deploy${t.key}: ${state[`token${t.key}`]}`);

    const erc20 = new Contract(state[`token${t.key}`], abi, signer);
    const [sym, dec, supply] = await Promise.all([erc20.symbol(), erc20.decimals(), erc20.totalSupply()]);
    if (sym !== t.symbol || dec !== 18n || supply !== parseUnits(t.supply, dec)) throw new Error(`${t.key} check failed`);
    console.log(`${sym}: decimals ${dec}, totalSupply ${formatUnits(supply, dec)}`);

    await step(`lecturer${t.key}`, () => erc20.transfer(LECTURER, parseUnits("1", dec)));
    await step(`walletB${t.key}`, () => erc20.transfer(walletB, parseUnits(t.toB, dec)));

    const [lb, bb, ab, s2] = await Promise.all([erc20.balanceOf(LECTURER), erc20.balanceOf(walletB), erc20.balanceOf(signer.address), erc20.totalSupply()]);
    console.log(`${sym} balances: lecturer ${formatUnits(lb, dec)}, walletB ${formatUnits(bb, dec)}, deployer ${formatUnits(ab, dec)}, supply ${formatUnits(s2, dec)}`);
  }
  // Classmate (Amir Asake): deployer wallets of both tokens he posted in the group chat.
  const AMIR = ["0x49E3A4D5971C82BCc892ADb17c4129710c55cA77", "0x8898aaBCf31f5CD257d403453F5F16279562Ea70"];
  for (const t of TOKENS) {
    const erc20 = new Contract(state[`token${t.key}`], art[t.contract].abi, signer);
    for (const [i, to] of AMIR.entries())
      await step(`amir${i + 1}${t.key}`, () => erc20.transfer(to, parseUnits(t.key === "A" ? "10" : "100", 18)));
  }
  // Small gas money so wallet B can also make a transfer in the demo.
  await step("gasToB", () => signer.sendTransaction({ to: walletB, value: parseEther("0.005") }));
  console.log("deployer ETH left:", formatUnits(await provider.getBalance(signer.address), 18));
})().catch(e => { console.error(e.shortMessage || e.message); process.exit(1); });
