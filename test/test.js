const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", function () {
        let fundMe
        let mockV3Aggregator
        let deployer
        const sendValue = ethers.utils.parseEther("15")
        beforeEach(async () => {
            // const accounts = await ethers.getSigners()
            // deployer = accounts[0]
            deployer = (await getNamedAccounts()).deployer
            await deployments.fixture(["all"])
            fundMe = await ethers.getContract("FundMe", deployer)
            mockV3Aggregator = await ethers.getContract(
                "MockV3Aggregator",
                deployer
            )
        })

        describe("constructor", function () {
            it("sets the aggregator addresses correctly", async () => {
                const response = await fundMe.getPriceFeed()
                assert.equal(response, mockV3Aggregator.address)
            })


        })

        describe("fund", function () {
            // https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
            // could also do assert.fail
            //   it("",async()=>{

            //   })
            it("Fails if you don't send enough ETH", async () => {
                await expect(fundMe.fund()).to.be.revertedWith(
                    "You need to spend more ETH!"
                )
            })
            it("Fails if you don't send enough ETH", async () => {
                await expect(fundMe.fund({ value: "5000000000000000" })).to.be.revertedWith(
                    "You need to spend more ETH!"
                )
            })
            it("Fails if founder was different from deployer", async () => {
                await fundMe.fund({ value: sendValue });
                let founder = await fundMe.getFunder(0);
                assert.equal(founder, deployer)
            })
            it("Fails if owner wasnt deployer", async () => {
                let owner = await fundMe.getOwner();
                assert.equal(owner, deployer)
            })
            // it("Fails if founder was different from deployer", async () => {
            //     await fundMe.fund({value:sendValue});
            //     let priceFeed = await fundMe.getPriceFeed();
            //     assert.equal(priceFeed, "0x5FbDB2315678afecb367f032d93F642f64180aa3")
            //     // await expect(await fundMe.getFunder(0)).to.be.equal(deployer )
            // })
            // we could be even more precise here by making sure exactly $50 works
            // but this is good enough for now
            it("Updates the amount funded data structure", async () => {
                await fundMe.fund({ value: sendValue })
                const response = await fundMe.getAddressToAmountFunded(
                    deployer
                )
                assert.equal(response.toString(), sendValue.toString())
            })
            it("Adds funder to array of funders", async () => {
                await fundMe.fund({ value: sendValue })
                const response = await fundMe.getFunder(0)
                assert.equal(response, deployer)
            })
        })
        describe("withdraw", function () {
            beforeEach(async () => {
                await fundMe.fund({ value: sendValue })
            })
            it("withdraws ETH from a single funder", async () => {
                // Arrange
                const startingFundMeBalance =
                    await fundMe.provider.getBalance(fundMe.address)
                const startingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                // Act

                const transactionResponse = await fundMe.withdraw()
                const transactionReceipt = await transactionResponse.wait()
                const { gasUsed, effectiveGasPrice } = transactionReceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const endingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                // Assert
                // Maybe clean up to understand the testing
                assert.equal(endingFundMeBalance, 0)

                expect(Number(endingDeployerBalance)).to.be.greaterThan(Number(startingDeployerBalance));
                // assert.equal(
                //     startingFundMeBalance
                //         .add(startingDeployerBalance)
                //         .toString(),
                //     endingDeployerBalance.add(gasCost).toString()
                // )
            })
            it("withdraws to maximum", async () => {
                // Arrange

                const accounts = await ethers.getSigners()
                await fundMe.connect(accounts[3]).fund({ value: ethers.utils.parseEther("20") })
                const startingAccount3Balance =
                    await fundMe.provider.getBalance(accounts[3].address)
                expect(await fundMe.maximumFunder()).to.be.equal(accounts[3].address);
                expect(await fundMe.maximumFund()).to.be.equal(ethers.utils.parseEther("20"))
                const startingFundMeBalance =
                    await fundMe.provider.getBalance(fundMe.address)
                await fundMe.withdraw()
                const endingAccount3Balance = await fundMe.provider.getBalance(
                    accounts[3].address
                )
                 expect(Number(endingAccount3Balance)).to.be.greaterThan(Number(startingFundMeBalance));
                // Assert
                // Maybe clean up to understand the testing
                // assert.equal(endingFundMeBalance, 0)

                // assert.equal(
                //     startingFundMeBalance
                //         .add(startingDeployerBalance)
                //         .toString(),
                //     endingDeployerBalance.add(gasCost).toString()
                // )
            })
            // this test is overloaded. Ideally we'd split it into multiple tests
            // but for simplicity we left it as one
            it("is allows us to withdraw with multiple funders", async () => {
                // Arrange
                const accounts = await ethers.getSigners()
                for (i = 1; i < 6; i++) {
                    const fundMeConnectedContract = await fundMe.connect(
                        accounts[i]
                    )
                    await fundMeConnectedContract.fund({ value: sendValue })
                }
                const startingFundMeBalance =
                    await fundMe.provider.getBalance(fundMe.address)
                const startingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                // Act
                const transactionResponse = await fundMe.cheaperWithdraw()
                // Let's comapre gas costs :)
                // const transactionResponse = await fundMe.withdraw()
                const transactionReceipt = await transactionResponse.wait()
                const { gasUsed, effectiveGasPrice } = transactionReceipt
                const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
                console.log(`GasCost: ${withdrawGasCost}`)
                console.log(`GasUsed: ${gasUsed}`)
                console.log(`GasPrice: ${effectiveGasPrice}`)
                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const endingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)
                // Assert
                assert.equal(
                    startingFundMeBalance
                        .add(startingDeployerBalance)
                        .toString(),
                    endingDeployerBalance.add(withdrawGasCost).toString()
                )
                // Make a getter for storage variables
                await expect(fundMe.getFunder(0)).to.be.reverted

                for (i = 1; i < 6; i++) {
                    assert.equal(
                        await fundMe.getAddressToAmountFunded(
                            accounts[i].address
                        ),
                        0
                    )
                }
            })
            it("Only allows the owner to withdraw", async function () {
                const accounts = await ethers.getSigners()
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[1]
                )
                await expect(
                    fundMeConnectedContract.withdraw()
                ).to.be.revertedWith("FundMe__NotOwner")
            })
        })
    })