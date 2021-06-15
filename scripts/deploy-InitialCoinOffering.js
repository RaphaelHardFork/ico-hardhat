const { ethers } = require('hardhat')
const hre = require('hardhat')
const deployed = require('./deployed')

const CONTRACT_NAME = 'InitialCoinOffering'
const TOKEN_CONTRACT_ADDRESS = '0xd4d0c0Db36f5F650e664c6351383D567D00Dc85B'

const main = async () => {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contract with the account ' + deployer.address)

  const InitialCoinOfferring = await hre.ethers.getContractFactory(CONTRACT_NAME)
  const initialCoinOffering = await InitialCoinOfferring.deploy(TOKEN_CONTRACT_ADDRESS, deployer.address)

  await initialCoinOffering.deployed()

  deployed(CONTRACT_NAME, hre.network.name, initialCoinOffering.address)

  console.log('SuperbToken deployed at : ' + initialCoinOffering.address)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e)
    process.exit(1)
  })
