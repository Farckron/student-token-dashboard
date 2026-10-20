// 16.10 Click Challenge: call click() until points reach WIN_SCORE. Resumable via deployments.json.
const { JsonRpcProvider, Wallet, Contract } = require("ethers");
const fs = require("fs");
const keys = require("/home/mxn/RTU/BA-sys/sepolia-test-wallets.json");
const state = require("./deployments.json");
const GAME = "0x817dFBe0AbEC0882706830310CC3A851237993CD";

(async () => {
  const provider = new JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  if ((await provider.getNetwork()).chainId !== 11155111n) throw new Error("Not Sepolia");
  const signer = new Wallet(keys.walletA.privateKey, provider);
  const game = new Contract(GAME, ["function points(address) view returns (uint256)", "function WIN_SCORE() view returns (uint256)", "function click()"], signer);
  state.clicks ??= [];
  const win = await game.WIN_SCORE();
  while (state.clicks.length < Number(win)) {
    const tx = await game.click();
    state.clicks.push(tx.hash);
    fs.writeFileSync("deployments.json", JSON.stringify(state, null, 2));
    const r = await tx.wait();
    console.log(`click ${state.clicks.length}: ${tx.hash} status ${r.status}`);
  }
  console.log("points:", await game.points(signer.address), "/", win);
})().catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
