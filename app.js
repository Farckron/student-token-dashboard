import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/dist/ethers.min.js";

// ---- Configuration: paste deployed contract addresses here ----
const TOKENS = [
  { key: "A", address: "0xF482674A7250dcF818cE8936946B5Bad30F0AFDD", label: "Study Credit" },
  { key: "B", address: "0x65BE388dC442AB1A6E64712dE1cE6Bb50c8dC323", label: "Coffee Token" },
];
const LECTURER = "0x5f3046bD5aA3c6d4575AF09B8198d584f130708E";
const SEPOLIA_HEX = "0xaa36a7"; // 11155111
const EXPLORER = "https://sepolia.etherscan.io";

// Minimal human-readable ABI (only what the page uses)
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

// ---- State ----
let provider = null; // ethers.BrowserProvider
let account = null;  // connected address (string) or null
let onSepolia = false;
let pending = false; // a transfer is in flight: keep Send disabled
let gen = 0;         // refresh generation: older refreshes must not overwrite newer ones
const info = {};     // per token key: { name, symbol, decimals }

const $ = (id) => document.getElementById(id);
const isConfigured = (t) => t.address !== ethers.ZeroAddress;

// ---- Status / feedback helpers ----
function setStatus(text, cls = "", link = null) {
  const el = $("status");
  el.className = cls;
  el.textContent = text;
  if (link) {
    el.append(" ");
    const a = document.createElement("a");
    a.href = link;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "View on Etherscan";
    el.append(a);
  }
}

function clearErrors() {
  for (const id of ["recipient", "amount"]) {
    $(`${id}Err`).textContent = "";
    $(id).removeAttribute("aria-invalid");
  }
}

function fieldError(id, text) {
  $(`${id}Err`).textContent = text;
  $(id).setAttribute("aria-invalid", "true");
}

// ---- Token cards ----
function renderCards() {
  const box = $("tokens");
  box.innerHTML = "";
  for (const t of TOKENS) {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <h2 id="name${t.key}">${t.label}</h2>
      <p class="muted">Token ${t.key}</p>
      <p>Balance: <span class="big" id="bal${t.key}">-</span> <span id="sym${t.key}"></span></p>
      <p class="muted">Total supply: <span id="sup${t.key}">-</span></p>
      <p class="muted">Decimals: <span id="dec${t.key}">-</span></p>
      <p class="muted" id="link${t.key}"></p>
      <p class="bad" id="err${t.key}"></p>`;
    box.append(card);

    const link = card.querySelector(`#link${t.key}`);
    if (isConfigured(t)) {
      link.innerHTML = `Contract: <a class="addr" target="_blank" rel="noopener"
        href="${EXPLORER}/address/${t.address}">${t.address}</a>`;
    } else {
      link.innerHTML = `<span class="warn">Contract address not configured.</span>`;
    }

    const opt = document.createElement("option");
    opt.value = t.key;
    opt.textContent = t.label;
    $("tokenSelect").append(opt);
  }
}

function contractFor(t, runner) {
  return new ethers.Contract(t.address, ERC20_ABI, runner);
}

// Read name, symbol, decimals, totalSupply and the account balance from chain.
// my/acct come from the refresh() that started this; skip DOM writes once a newer refresh exists.
async function loadToken(t, my, p, acct) {
  if (!isConfigured(t) || !onSepolia) return;
  const c = contractFor(t, p);
  try {
    const [name, symbol, dec, supply] = await Promise.all([
      c.name(), c.symbol(), c.decimals(), c.totalSupply(),
    ]);
    if (my !== gen) return;
    const decimals = Number(dec);
    $(`err${t.key}`).textContent = "";
    info[t.key] = { name, symbol, decimals };
    $(`name${t.key}`).textContent = name;
    $(`sym${t.key}`).textContent = symbol;
    $(`dec${t.key}`).textContent = decimals;
    $(`sup${t.key}`).textContent = `${ethers.formatUnits(supply, decimals)} ${symbol}`;
    const opt = $("tokenSelect").querySelector(`option[value="${t.key}"]`);
    opt.textContent = `${name} (${symbol})`;
    if (acct) {
      const bal = await c.balanceOf(acct);
      if (my !== gen) return;
      $(`bal${t.key}`).textContent = ethers.formatUnits(bal, decimals);
    }
  } catch (err) {
    console.error(err);
    if (my === gen) $(`err${t.key}`).textContent = "Could not read this contract on Sepolia.";
  }
}

function resetBalances() {
  for (const t of TOKENS) $(`bal${t.key}`).textContent = "-";
}

// ---- Wallet / chain ----
async function refresh() {
  const my = ++gen;
  const acct = account;
  // Re-create the provider: an old one can break after a chain switch.
  const p = new ethers.BrowserProvider(window.ethereum);
  provider = p;
  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (my !== gen) return;
    onSepolia = chainId.toLowerCase() === SEPOLIA_HEX;
  } catch (err) {
    console.error(err);
    if (my !== gen) return;
    onSepolia = false; // unknown chain: block sending
    $("sendBtn").disabled = true;
    $("chainMsg").className = "bad";
    $("chainMsg").textContent = `Could not read the network from the wallet: ${err.message}`;
    return;
  }

  $("account").textContent = account || "not connected";
  $("connectBtn").textContent = account ? "Connected" : "Connect Wallet";
  $("switchBtn").hidden = onSepolia;
  $("chainMsg").className = onSepolia ? "ok" : "warn";
  $("chainMsg").textContent = onSepolia
    ? "Network: Sepolia"
    : "Wrong network. Transfers are blocked until you switch to Sepolia.";
  $("sendBtn").disabled = pending || !(account && onSepolia);

  resetBalances();
  await Promise.all(TOKENS.map((t) => loadToken(t, my, p, acct)));
}

async function connect() {
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    account = accounts[0] || null;
    await refresh();
  } catch (err) {
    if (err.code === 4001) setStatus("Connection cancelled.", "warn");
    else setStatus(`Could not connect: ${err.message}`, "bad");
  }
}

async function switchToSepolia() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_HEX }],
    });
  } catch (err) {
    // MetaMask Mobile nests the code in data.originalError.
    const code = err.code ?? err.data?.originalError?.code;
    if (code === 4902) {
      // Sepolia is not known to this wallet yet: add it.
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: SEPOLIA_HEX,
            chainName: "Sepolia",
            nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
            blockExplorerUrls: [EXPLORER],
          }],
        });
      } catch (addErr) {
        setStatus(`Could not add Sepolia: ${addErr.message}`, "bad");
      }
    } else if (code === 4001) {
      setStatus("Network switch cancelled.", "warn");
    } else {
      setStatus(`Could not switch network: ${err.message}`, "bad");
    }
  }
  // chainChanged listener refreshes the page state.
}

// ---- Validation (pure, no wallet requests) ----
function validate(t, recipient, amountText) {
  clearErrors();
  let ok = true;

  // isAddress also accepts no-0x and ICAP forms, so require 0x and normalise once.
  let to = null;
  if (!/^0x[0-9a-fA-F]{40}$/.test(recipient) || !ethers.isAddress(recipient)) {
    fieldError("recipient", "Invalid address. It must be 0x followed by 40 hex characters.");
    ok = false;
  } else {
    to = ethers.getAddress(recipient);
    if (to === ethers.ZeroAddress) {
      fieldError("recipient", "The zero address is not allowed (tokens would be lost).");
      ok = false;
    }
  }

  let amount = null;
  const decimals = info[t.key]?.decimals;
  if (amountText === "") {
    fieldError("amount", "Enter an amount.");
    ok = false;
  } else if (!/^(\d+\.?\d*|\.\d+)$/.test(amountText)) {
    fieldError("amount", "Amount must be a positive number, for example 1 or 0.5.");
    ok = false;
  } else if (decimals === undefined) {
    fieldError("amount", "Token data not loaded yet.");
    ok = false;
  } else {
    try {
      amount = ethers.parseUnits(amountText, decimals);
      if (amount <= 0n) {
        fieldError("amount", "Amount must be greater than zero.");
        ok = false;
      }
    } catch (e) {
      fieldError("amount", e?.fault === "overflow"
        ? "Amount is too large."
        : `Too many decimal places (this token allows ${decimals}).`);
      ok = false;
    }
  }
  return ok ? { to, amount } : null;
}

// ---- Send ----
async function send(e) {
  e.preventDefault();
  const t = TOKENS.find((x) => x.key === $("tokenSelect").value);
  const recipient = $("recipient").value.trim();
  const amountText = $("amount").value.trim();

  if (!isConfigured(t)) return setStatus("Contract address not configured for this token.", "bad");
  if (!account) return setStatus("Connect your wallet first.", "bad");
  if (!onSepolia) return setStatus("Switch to Sepolia before sending.", "bad");

  const v = validate(t, recipient, amountText);
  if (v === null) return setStatus("Fix the errors above.", "bad");
  const { to, amount } = v;

  const { symbol, decimals } = info[t.key];
  const p = provider; // refresh() may replace the global during the awaits below
  const from = account;
  $("sendBtn").disabled = true;
  pending = true;
  let tx = null;
  try {
    // Re-read the balance right before sending (read-only call, no popup).
    const bal = await contractFor(t, p).balanceOf(from);
    if (amount > bal) {
      fieldError("amount", `Amount exceeds your balance (${ethers.formatUnits(bal, decimals)} ${symbol}).`);
      return setStatus("Fix the errors above.", "bad");
    }
    if (to === ethers.getAddress(from)) {
      $("recipientErr").textContent = "Warning: you are sending to your own address.";
    }

    // Fresh chain and account check: the cached state may be stale by now.
    const cid = await window.ethereum.request({ method: "eth_chainId" });
    if (cid.toLowerCase() !== SEPOLIA_HEX) return setStatus("Switch to Sepolia before sending.", "bad");
    const signer = await p.getSigner();
    if (signer.address.toLowerCase() !== from.toLowerCase()) {
      return setStatus("Account changed, try again.", "bad");
    }

    setStatus("Waiting for MetaMask confirmation...");
    tx = await contractFor(t, signer).transfer(to, amount);
    setStatus(`Pending: ${tx.hash}`, "", `${EXPLORER}/tx/${tx.hash}`);

    // ethers v6: wait() throws CALL_EXCEPTION on revert and TRANSACTION_REPLACED on speed up/cancel.
    const receipt = await tx.wait();
    if (receipt.status === 1) {
      setStatus(`Success: sent ${amountText} ${symbol}.`, "ok", `${EXPLORER}/tx/${tx.hash}`);
    }
  } catch (err) {
    if (err.code === "ACTION_REJECTED" || err.code === 4001 || err.info?.error?.code === 4001) {
      setStatus("Transaction cancelled.", "warn");
    } else if (err.code === "TRANSACTION_REPLACED" && !err.cancelled) {
      // Sped up in MetaMask: same transfer, new hash.
      const link = `${EXPLORER}/tx/${err.hash}`;
      if (err.receipt?.status === 1) setStatus(`Success: sent ${amountText} ${symbol}.`, "ok", link);
      else setStatus("Transaction failed on chain.", "bad", link);
    } else if (err.code === "TRANSACTION_REPLACED") {
      setStatus("Transaction was cancelled or replaced in MetaMask.", "warn", `${EXPLORER}/tx/${err.hash}`);
    } else {
      console.error(err);
      setStatus(`Transaction failed: ${err.shortMessage || err.message}`, "bad",
        tx ? `${EXPLORER}/tx/${tx.hash}` : null);
    }
  } finally {
    pending = false;
    await refresh();
  }
}

// ---- Start ----
async function init() {
  renderCards();
  $("lecturerAddr").textContent = LECTURER;
  $("lecturerBtn").addEventListener("click", () => {
    $("recipient").value = LECTURER;
    clearErrors();
  });

  if (!window.ethereum) {
    $("walletMsg").innerHTML = `<span class="warn">MetaMask not detected.</span>
      Install it from <a href="https://metamask.io" target="_blank" rel="noopener">metamask.io</a>
      to connect and send tokens.`;
    $("connectBtn").disabled = true;
    return;
  }

  $("connectBtn").addEventListener("click", connect);
  $("switchBtn").addEventListener("click", switchToSepolia);
  $("sendForm").addEventListener("submit", send);

  window.ethereum.on("accountsChanged", (accounts) => {
    account = accounts[0] || null;
    if (!pending) setStatus(account ? "Account changed." : "Wallet disconnected.");
    refresh();
  });
  window.ethereum.on("chainChanged", () => {
    if (!pending) setStatus("Network changed.");
    refresh();
  });

  // Silent reconnect if this site was already authorised (no popup).
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  account = accounts[0] || null;
  await refresh();
}

init();
