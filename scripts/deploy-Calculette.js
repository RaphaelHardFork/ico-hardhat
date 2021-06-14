const { ethers } = require('hardhat')
const hre = require('hardhat')
const fs = require('fs')

const CONTRACT_NAME = 'Calculette'
const TOKEN_CONTRACT_ADDRESS = '0xd4d0c0Db36f5F650e664c6351383D567D00Dc85B'

const main = async () => {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying contract with the account ' + deployer.address)

  const Calculette = await hre.ethers.getContractFactory(CONTRACT_NAME)
  const calculette = await Calculette.deploy(TOKEN_CONTRACT_ADDRESS, deployer.address, 8)

  await calculette.deployed()

  const deploymentInfo = {
    Calculette: {
      rinkeby: {
        contractAddress: `${calculette.address}`,
        contractDeployerAddress: `${deployer.address}`,
      },
    },
  }
  fs.writeFileSync('./scripts/deployment/SuperbToken-deployment.json', JSON.stringify(deploymentInfo))

  console.log('Calculette deployed at : ' + calculette.address)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e)
    process.exit(1)
  })
