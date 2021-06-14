const { ethers } = require('hardhat')
const hre = require('hardhat')
const fs = require('fs')

const TOTAL_SUPPLY = ethers.utils.parseEther('1001')
const CONTRACT_NAME = 'SuperbToken'

const main = async () => {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contract with the account ' + deployer.address)

  const SuperbToken = await hre.ethers.getContractFactory(CONTRACT_NAME)
  const superbtoken = await SuperbToken.deploy(TOTAL_SUPPLY, deployer.address)

  await superbtoken.deployed()

  const deploymentInfo = {
    SuperbToken: {
      rinkeby: {
        contractAddress: `${superbtoken.address}`,
        contractDeployerAddress: `${deployer.address}`,
      },
    },
  }
  fs.writeFileSync('./artifacts/contract/SuperbToken-deployment.json', JSON.stringify(deploymentInfo))

  console.log('SuperbToken deployed at : ' + superbtoken.address)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e)
    process.exit(1)
  })
