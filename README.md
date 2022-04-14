# Basic Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, a sample script that deploys that contract, and an example of a task implementation, which simply lists the available accounts.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```

## Set up local Cronos devnet
### Start a new network for the first time
The following command will start the network from scratch and also install and download the dependencies
```
make start-cronos-devnet
```
### Resume the network
If you don't want to remove the previous network but resume it, you can use the following command:
```
make resume-devnet
```

## Deploy the Smart Contract
The following command will deploy the smart contract "RPG" to the local Cronos devnet:
```
make deploy-rpg
```

## Testing RPG V2
```
npx hardhat test --grep V2
```