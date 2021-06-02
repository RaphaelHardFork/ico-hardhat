const { expect } = require('chai')

describe('SuperbToken', function () {
  let SuperbToken, superbtoken, dev, owner, contract
  let TOTAL_SUPPLY = ethers.utils.parseEther('1001')
  let ZERO_ADDRESS = ethers.constants.AddressZero
  beforeEach(async function () {
    ;[dev, owner, contract] = await ethers.getSigners()
    SuperbToken = await ethers.getContractFactory('SuperbToken')
    superbtoken = await SuperbToken.connect(dev).deploy(TOTAL_SUPPLY, owner.address)
    await superbtoken.deployed()
  })

  it('should emit a Transer event (ERC20 mint function)', async function () {
    expect(superbtoken.deployTransaction)
      .to.emit(superbtoken, 'Transfer')
      .withArgs(ZERO_ADDRESS, owner.address, TOTAL_SUPPLY)
  })

  it('should transfer the total supply to owner', async function () {
    expect(await superbtoken.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY)
  })

  it('should set the owner', async function () {
    expect(await superbtoken.owner()).to.equal(owner.address)
  })
})
