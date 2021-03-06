const { ethers } = require('hardhat')
const hre = require('hardhat')
const deployed = require('./deployed')

const TOTAL_SUPPLY = ethers.utils.parseEther('1001')
const CONTRACT_NAME = 'SuperbToken'

const main = async () => {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contract with the account ' + deployer.address)

  const SuperbToken = await hre.ethers.getContractFactory(CONTRACT_NAME)
  const superbtoken = await SuperbToken.deploy(TOTAL_SUPPLY, deployer.address)

  await superbtoken.deployed()

  deployed(CONTRACT_NAME, hre.network.name, superbtoken.address)

  console.log('SuperbToken deployed at : ' + superbtoken.address)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e)
    process.exit(1)
  })
