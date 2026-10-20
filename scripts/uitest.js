// UI tests against the live GitHub Pages dashboard with a scripted EIP-1193 wallet
// (stand-in for MetaMask; test keys stay in this local headless browser).
const { chromium } = require("playwright-core");
const { JsonRpcProvider, Contract, formatUnits } = require("ethers");
const keys = require("/home/mxn/RTU/BA-sys/sepolia-test-wallets.json");
const s = require("./deployments.json");

const URL = "https://farckron.github.io/student-token-dashboard/";
const RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const OUT = "/home/mxn/RTU/BA-sys/student-token-dashboard/screenshots";
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`); };

function fakeWallet({ pk, chainHex, rpc }) {
  let chain = chainHex, wallet;
  const listeners = {};
  window.__log = []; window.__reject = false;
  const getW = async () => {
    if (!wallet) {
      const { ethers } = await import("https://cdn.jsdelivr.net/npm/ethers@6.13.4/dist/ethers.min.js");
      wallet = new ethers.Wallet(pk, new ethers.JsonRpcProvider(rpc));
    }
    return wallet;
  };
  const emit = (e, v) => (listeners[e] || []).forEach((f) => f(v));
  window.ethereum = {
    isMetaMask: true,
    on(e, f) { (listeners[e] ??= []).push(f); },
    removeListener(e, f) { listeners[e] = (listeners[e] || []).filter((x) => x !== f); },
    async request({ method, params }) {
      window.__log.push(method);
      const w = await getW();
      switch (method) {
        case "eth_requestAccounts": case "eth_accounts": return [w.address];
        case "eth_chainId": return chain;
        case "wallet_switchEthereumChain": chain = params[0].chainId; emit("chainChanged", chain); return null;
        case "eth_sendTransaction": {
          if (window.__reject) { const e = new Error("User rejected the request."); e.code = 4001; throw e; }
          const t = params[0];
          return (await w.sendTransaction({ to: t.to, data: t.data })).hash;
        }
      }
      const res = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params || [] }) }).then((r) => r.json());
      if (res.error) { const e = new Error(res.error.message); e.code = res.error.code; e.data = res.error.data; throw e; }
      return res.result;
    },
  };
}

async function openAs(browser, pk, chainHex = "0xaa36a7") {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 1000 } });
  await ctx.addInitScript(fakeWallet, { pk, chainHex, rpc: RPC });
  const page = await ctx.newPage();
  await page.goto(URL + "?t=" + process.pid);
  return page;
}
const connect = async (page) => {
  await page.click("#connectBtn");
  await page.waitForFunction(() => /\d/.test(document.querySelector("#balA")?.textContent) && /\d/.test(document.querySelector("#balB")?.textContent), null, { timeout: 30000 });
};
const text = (page, sel) => page.locator(sel).innerText();
const sends = (page) => page.evaluate(() => window.__log.filter((m) => m === "eth_sendTransaction").length);
async function trySend(page, token, to, amount) {
  await page.selectOption("#tokenSelect", token);
  await page.fill("#recipient", to);
  await page.fill("#amount", amount);
  await page.click("#sendBtn");
  await page.waitForTimeout(2500);
  return { status: await text(page, "#status"), rErr: await text(page, "#recipientErr"), aErr: await text(page, "#amountErr") };
}
async function chainBalances(addr) {
  const p = new JsonRpcProvider(RPC);
  const abi = ["function balanceOf(address) view returns (uint256)"];
  return Promise.all(["tokenA", "tokenB"].map(async (k) => formatUnits(await new Contract(s[k], abi, p).balanceOf(addr), 18)));
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const A = keys.walletA.address, B = keys.walletB.address;

  // Wallet A on Sepolia: balances
  const pa = await openAs(browser, keys.walletA.privateKey);
  await connect(pa);
  let [ca, cb] = await chainBalances(A);
  let ua = [await text(pa, "#balA"), await text(pa, "#balB")];
  check("UI balances wallet A", ua[0] === ca && ua[1] === cb, `UI ${ua.join(" / ")} vs chain ${ca} / ${cb}`);
  await pa.screenshot({ path: `${OUT}/01-wallet-a-balances.png`, fullPage: true });

  // Validation: no eth_sendTransaction may happen
  let before = await sends(pa);
  let r = await trySend(pa, "A", "0x123", "1");
  check("Wrong address", (await sends(pa)) === before && r.rErr !== "", `recipientErr="${r.rErr}"`);
  await pa.screenshot({ path: `${OUT}/02-invalid-address.png`, fullPage: true });
  r = await trySend(pa, "A", B, "0");
  check("Zero amount", (await sends(pa)) === before && r.aErr !== "", `amountErr="${r.aErr}"`);
  r = await trySend(pa, "A", B, "1000000");
  check("Excess amount", (await sends(pa)) === before && r.aErr !== "", `amountErr="${r.aErr}"`);
  await pa.screenshot({ path: `${OUT}/03-insufficient-balance.png`, fullPage: true });

  // MetaMask cancellation
  await pa.evaluate(() => { window.__reject = true; });
  r = await trySend(pa, "A", B, "1");
  check("MetaMask cancellation", /cancel/i.test(r.status) && !/success/i.test(r.status), `status="${r.status}"`);
  await pa.screenshot({ path: `${OUT}/04-cancelled.png`, fullPage: true });

  // Real transfer: 1 STCR A -> B
  await pa.evaluate(() => { window.__reject = false; });
  await pa.selectOption("#tokenSelect", "A");
  await pa.fill("#recipient", B);
  await pa.fill("#amount", "1");
  await pa.click("#sendBtn");
  await pa.waitForFunction(() => /Success|failed/i.test(document.querySelector("#status").textContent), null, { timeout: 180000 });
  const st = await text(pa, "#status");
  const link = await pa.locator("#status a").getAttribute("href").catch(() => null);
  check("UI transfer 1 STCR A->B", /Success/.test(st), `status="${st}" ${link}`);
  await pa.waitForTimeout(4000);
  await pa.screenshot({ path: `${OUT}/05-transfer-success.png`, fullPage: true });

  // Reload: balances still match chain
  await pa.reload();
  await pa.waitForFunction(() => /\d/.test(document.querySelector("#balA")?.textContent), null, { timeout: 30000 });
  await pa.waitForTimeout(3000);
  [ca, cb] = await chainBalances(A);
  ua = [await text(pa, "#balA"), await text(pa, "#balB")];
  check("Reload", ua[0] === ca && ua[1] === cb, `UI ${ua.join(" / ")} vs chain ${ca} / ${cb} (auto-reconnect, no popup)`);

  // Wallet B: balances
  const pb = await openAs(browser, keys.walletB.privateKey);
  await connect(pb);
  [ca, cb] = await chainBalances(B);
  ua = [await text(pb, "#balA"), await text(pb, "#balB")];
  check("UI balances wallet B", ua[0] === ca && ua[1] === cb, `UI ${ua.join(" / ")} vs chain ${ca} / ${cb}`);
  await pb.screenshot({ path: `${OUT}/06-wallet-b-balances.png`, fullPage: true });

  // Wrong chain: Ethereum mainnet id
  const pw = await openAs(browser, keys.walletA.privateKey, "0x1");
  await pw.click("#connectBtn");
  await pw.waitForTimeout(3000);
  const disabled = await pw.locator("#sendBtn").isDisabled();
  const switchVisible = await pw.locator("#switchBtn").isVisible();
  before = await sends(pw);
  check("Wrong chain", disabled && switchVisible && (await sends(pw)) === before, `sendBtn disabled=${disabled}, switch button visible=${switchVisible}, chainMsg="${await text(pw, "#chainMsg")}"`);
  await pw.screenshot({ path: `${OUT}/07-wrong-network.png`, fullPage: true });
  await pw.click("#switchBtn");
  await pw.waitForTimeout(3000);
  check("Switch to Sepolia", !(await pw.locator("#sendBtn").isDisabled()), `after switch sendBtn enabled`);

  await browser.close();
  require("fs").writeFileSync("uitest-results.json", JSON.stringify(results, null, 2));
  process.exit(results.every((x) => x.ok) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
