// Compile both contracts with solc, resolving OpenZeppelin imports from node_modules.
const solc = require("solc");
const fs = require("fs");
const path = require("path");

const SRC = "/home/mxn/RTU/BA-sys/student-token-dashboard/contracts";
const files = ["StudyCredit.sol", "CoffeeToken.sol"];
const input = {
  language: "Solidity",
  sources: Object.fromEntries(files.map(f => [f, { content: fs.readFileSync(path.join(SRC, f), "utf8") }])),
  settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun", outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
};
const findImports = p => {
  try { return { contents: fs.readFileSync(require.resolve(p), "utf8") }; }
  catch { return { error: "not found: " + p }; }
};
const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const errors = (out.errors || []).filter(e => e.severity === "error");
if (errors.length) { console.error(errors.map(e => e.formattedMessage).join("\n")); process.exit(1); }
const artifacts = {};
for (const f of files) for (const [name, c] of Object.entries(out.contracts[f]))
  artifacts[name] = { abi: c.abi, bytecode: "0x" + c.evm.bytecode.object };
fs.writeFileSync("artifacts.json", JSON.stringify(artifacts, null, 2));
console.log("compiled:", Object.keys(artifacts).map(k => `${k} (${artifacts[k].bytecode.length / 2 - 1} bytes)`).join(", "));
