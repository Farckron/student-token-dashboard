// Extra request: send 100 STCR and 100 CAFE to the lecturer. Resumable via deployments.json.
const { JsonRpcProvider, Wallet, Contract, parseUnits, formatUnits, getAddress } = require("ethers");
const fs = require("fs");
const keys = require("/home/mxn/RTU/BA-sys/sepolia-test-wallets.json");
const state = require("./deployments.json");
const LECTURER = getAddress("0x5f3046bD5aA3c6d4575AF09B8198d584f130708E");
const abi = ["function transfer(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)", "function symbol() view returns (string)"];

(async () => {
  const provider = new JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  if ((await provider.getNetwork()).chainId !== 11155111n) throw new Error("Not Sepolia");
  const signer = new Wallet(keys.walletA.privateKey, provider);
  for (const k of ["A", "B"]) {
    const c = new Contract(state[`token${k}`], abi, signer);
    const name = `lecturer100${k}`;
    if (!state[name]) {
      const tx = await c.transfer(LECTURER, parseUnits("100", 18));
      state[name] = tx.hash;
      fs.writeFileSync("deployments.json", JSON.stringify(state, null, 2));
      const r = await tx.wait();
      if (r.status !== 1) throw new Error(`${name} failed ${tx.hash}`);
      console.log(`${name}: ${tx.hash} confirmed`);
    } else console.log(`skip ${name}: ${state[name]}`);
    console.log(`${await c.symbol()} lecturer balance: ${formatUnits(await c.balanceOf(LECTURER), 18)}`);
  }
})().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
