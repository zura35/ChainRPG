const { expect } = require("chai");
const { ethers } = require("hardhat");

// describe("Greeter", function () {
//   it("Should return the new greeting once it's changed", async function () {
//     const Greeter = await ethers.getContractFactory("Greeter");
//     const greeter = await Greeter.deploy("Hello, world!");
//     await greeter.deployed();

//     expect(await greeter.greet()).to.equal("Hello, world!");

//     const setGreetingTx = await greeter.setGreeting("Hola, mundo!");

//     // wait until the transaction is mined
//     await setGreetingTx.wait();

//     expect(await greeter.greet()).to.equal("Hola, mundo!");
//   });
// });

describe("RPG", function() {
  it("Should register user to players and get current boss", async function() {
    const [owner1] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("GprToken");
    const token = await Token.deploy();
    await token.deployed();

    const Rpg = await ethers.getContractFactory("Rpg");
    const rpg = await Rpg.deploy(token.address);
    await rpg.deployed;

    let tx = await rpg.joinGame();
    await tx.wait();
    
    var arr = await rpg.getPlayer();
    expect(arr).to.be.an("array");
    expect(arr[0]).to.equal("Random");
    expect(arr[1]).to.equal(100);

    arr = await rpg.getCurrentBoss();
    expect(arr).to.be.an("array");
    expect(arr[0]).to.equal("Slime");
    expect(arr[1]).to.equal(1000);
    expect(arr[2]).to.equal(1);

    
    let actions = [];
    for (let i = 0; i < 25; i++) {
      actions.push("run");
    }
    tx = await rpg.applyActions(actions);
    await tx.wait();

    var arr = await rpg.getPlayer();
    console.log(arr);

    if (arr[1] == 0) {
      console.log("rejoining...");

      tx = await rpg.joinGame();
      await tx.wait();

      arr = await rpg.getPlayer();
      expect(arr[0]).to.equal("Random");
    }

    // arr = await rpg.listPlayerAddresses();
    // expect(arr[0]).to.equal(owner1.address);
  
    // let random = ethers.Wallet.createRandom();
    // let swap = await rpg.swapPlayer(random.address);
    // await swap.wait();
    // arr = await rpg.listPlayerAddresses();
    // expect(arr[0]).to.equal(random.address);

    // tx = await rpg.joinGame();
    // await tx.wait();
    // arr = await rpg.listPlayerAddresses();
    // expect(arr.length).to.equal(2);
  });
});

describe("RPG_V2", function() {
  it("works", async function() {
    const [owner1] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("GprToken");
    const token = await Token.deploy();
    await token.deployed();

    const Rpg = await ethers.getContractFactory("RpgV2");
    const rpg = await Rpg.deploy(token.address);
    await rpg.deployed;

    // let action = await rpg.actions(1);
    // console.log(action);

    let tx = await rpg.joinGame("Stephy");
    await tx.wait();

    let res = await rpg.getEventAndActions();
    console.log("first event ", res);

    let options = res[1].split(":");
    let selectedOption = options[0].split("_")[0];

    tx = await rpg.applyEventAction(selectedOption);
    await tx.wait();

    res = await rpg.getEventAndActions();
    console.log("second event ", res);

    // mark public to test this function
    // tx = await rpg.assessKarma(-3);
    // await tx.wait();

    res = await rpg.listPlayerAddresses();
    console.log("list: ", res);

    res = await rpg.players(owner1.address);
    console.log("player: ", res);

    // console.log("Getting events actions...");
    // let res = await rpg.getEventActionDescriptions(1);
    // console.log(res);
  });
});