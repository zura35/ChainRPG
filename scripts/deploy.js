const hre = require("hardhat");

async function main() {
  // We get the contract to deploy
  const GprToken = await hre.ethers.getContractFactory("GprToken");
  const gprToken = await GprToken.deploy();

  await gprToken.deployed();
  console.log("GprToken deployed to:", gprToken.address);

  const Rpg = await hre.ethers.getContractFactory("Rpg");
  const rpg = await Rpg.deploy(gprToken.address);

  await rpg.deployed();

  saveFrontendFiles(rpg, "Rpg");
  console.log("Rpg deployed to:", rpg.address);

  // Transfer initial funds to V1
  await gprToken.transfer(rpg.address, 100000000);
  await new Promise(resolve => setTimeout(resolve, 10000));
  let initialBalance = await gprToken.balanceOf(rpg.address);
  console.log("initial balance of the Rpg: ", initialBalance);

  const RpgV2 = await hre.ethers.getContractFactory("RpgV2");
  const rpgV2 = await RpgV2.deploy(gprToken.address);
  await rpgV2.deployed();

  saveFrontendFiles(rpgV2, "RpgV2")
  console.log("RpgV2 deployed to:", rpgV2.address);

  // Transfer initial funds to V2
  await gprToken.transfer(rpgV2.address, 100000000);
  await new Promise(resolve => setTimeout(resolve, 10000));
  initialBalance = await gprToken.balanceOf(rpgV2.address);
  console.log("initial balance of the RpgV2: ", initialBalance);
}

function saveFrontendFiles(app, prefix) {
  const fs = require("fs");
  const contractsDir = __dirname + "/../rpg-ui/src/contracts/" + prefix;

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({ Address: app.address }, undefined, 2)
  );

  const RpgArtifact = artifacts.readArtifactSync(prefix);

  fs.writeFileSync(
    contractsDir + "/" + prefix + ".json",
    JSON.stringify(RpgArtifact, null, 2)
  );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
});
