const { ethers } = require("hardhat")

async function main() {
    const FundMeFactory = await ethers.getContractFactory("FundMe");
    console.log("Deploying contract...");
    const fundMe = await FundMeFactory.deploy("0x694AA1769357215DE4FAC081bf1f309aDC325306");
    await fundMe.deployed();
    console.log(`Deployed contract  at ${fundMe.address}`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })