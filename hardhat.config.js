require("@nomiclabs/hardhat-waffle");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "cronos",
  networks: {
    cronos: {
      url: "http://localhost:8545",
      accounts: ["4F3C2F8983184868D97994548183586A55F936206B5E1748A373D1E0A371D5E6"]
    }
  },
  solidity: "0.8.4",
};
