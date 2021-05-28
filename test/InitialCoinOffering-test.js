const { expect } = require('chai')

describe('InitialCoinOffering', function () {
  let SuperbToken, superbtoken, InitialCoinOffering, initialCoinOffering, dev, owner, custumer1, custumer2
  let TOTAL_SUPPLY = ethers.utils.parseEther('777')
  let ZERO_ADDRESS = ethers.constants.AddressZero
  beforeEach(async function () {
    ;[dev, owner, custumer1, custumer2] = await ethers.getSigners()
    // ERC20 deployment
    SuperbToken = await ethers.getContractFactory('SuperbToken')
    superbtoken = await SuperbToken.connect(dev).deploy(TOTAL_SUPPLY, owner.address)
    await superbtoken.deployed()

    // ICO deployment
    InitialCoinOffering = await ethers.getContractFactory('InitialCoinOffering')
    initialCoinOffering = await InitialCoinOffering.connect(dev).deploy(superbtoken.address, owner.address)
    await initialCoinOffering.deployed()
  })

  describe('Deployment', function () {
    it('should display the address of the token contract', async function () {
      expect(await initialCoinOffering.tokenContract()).to.equal(superbtoken.address)
    })

    it('should set the supply for the sale', async function () {
      expect(await initialCoinOffering.supplyInSale()).to.equal(TOTAL_SUPPLY)
    })

    it('should set the owner of the ICO', async function () {
      expect(await initialCoinOffering.owner()).to.equal(owner.address)
    })
  })

  describe('buyToken', function () {
    let transaction
    beforeEach(async function () {
      transaction = await initialCoinOffering.connect(custumer1).buyToken({ value: TOTAL_SUPPLY.div(10) })
    })
    it('should decrease the supply in sale', async function () {
      expect(await initialCoinOffering.supplyInSale()).to.equal(TOTAL_SUPPLY.sub(TOTAL_SUPPLY.div(10)))
    })

    it('should update the token balance of buyer', async function () {
      expect(await initialCoinOffering.tokenBalanceOf(custumer1.address)).to.equal(TOTAL_SUPPLY.div(10))
    })

    it('should emit Approval event (from ERC20)', async function () {
      expect(transaction).to.emit(superbtoken, 'Approval')
    })

    it('should emit TokenBought event', async function () {
      expect(transaction).to.emit(initialCoinOffering, 'TokenBought').withArgs(custumer1.address, TOTAL_SUPPLY.div(10))
    })
  })

  describe('Claim token', function () {
    let claimToken
    beforeEach(async function () {
      await initialCoinOffering.connect(custumer1).buyToken({ value: TOTAL_SUPPLY.div(10) })
      claimToken = await initialCoinOffering.connect(custumer1).claimToken()
    })
    it('should set token balance at zero', async function () {
      expect(await initialCoinOffering.tokenBalanceOf(custumer1.address)).to.equal(0)
    })
  })
})
