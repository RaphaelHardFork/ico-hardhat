const fs = require('fs')

const deployed = async (contractName, networkName, contractAddress) => {
  const FILE_PATH = './scripts/deployments-informations.json'
  let jsonString = ''
  let obj = {}

  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify({}))
  } else {
    jsonString = await fs.readFileSync(FILE_PATH, 'utf-8')
    obj = JSON.parse(jsonString)
  }

  // push des objets de deploiment
  const address = {}
  address.address = contractAddress
  const chainId = {}
  chainId[networkName] = address
  let network = {}
  network = { ...obj[contractName], ...chainId }
  obj[contractName] = network

  // ecriture
  fs.writeFileSync(FILE_PATH, JSON.stringify(obj))
}

exports.deployed = deployed
