const { expect } = require('chai')

describe('Calculette', function () {
  const TOTAL_SUPPLY = ethers.utils.parseEther('1000')
  const ONE_ETHER = ethers.utils.parseEther('1')
  const ZERO_ADDRESS = ethers.constants.AddressZero
  const RATE = 2
  let SuperbToken,
    superbtoken,
    InitialCoinOffering,
    initialCoinOffering,
    Calculette,
    calculette,
    dev,
    owner,
    buyerA,
    buyerB
  beforeEach(async function () {
    ;[dev, owner, buyerA, buyerB] = await ethers.getSigners()
    // ERC20 Deployment
    SuperbToken = await ethers.getContractFactory('SuperbToken')
    superbtoken = await SuperbToken.connect(dev).deploy(TOTAL_SUPPLY, owner.address)
    await superbtoken.deployed()

    // ICO Deployment
    InitialCoinOffering = await ethers.getContractFactory('InitialCoinOffering')
    initialCoinOffering = await InitialCoinOffering.connect(dev).deploy(superbtoken.address, owner.address)
    await initialCoinOffering.deployed()

    // Calculette Deployment
    Calculette = await ethers.getContractFactory('Calculette')
    calculette = await Calculette.connect(dev).deploy(superbtoken.address, owner.address, RATE)
    await calculette.deployed()
  })

  describe('Deployment', function () {
    it('should use the right address contracts', async function () {
      expect(await calculette.tokenContract()).to.equal(superbtoken.address)
    })

    it('should set the owner of the ICO', async function () {
      expect(await calculette.owner()).to.equal(owner.address)
    })

    it('should set the rate', async function () {
      expect(await calculette.rate()).to.equal(RATE)
    })
  })

  describe('buyCredits() - verification', function () {
    let buyCreditCall
    let buyersTokenBalance
    let ownerTokenBalance
    beforeEach(async function () {
      // buyerA buy token during the ICO and use it in Calculette
      await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(4))
      await initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(4), 1000)
      await initialCoinOffering.connect(buyerA).buyToken({ value: ONE_ETHER.div(10) })
      await ethers.provider.send('evm_increaseTime', [1210000]) // one week = 604800 second
      await ethers.provider.send('evm_mine')
      await initialCoinOffering.connect(buyerA).claimToken()
      buyersTokenBalance = await superbtoken.balanceOf(buyerA.address)
      ownerTokenBalance = await superbtoken.balanceOf(owner.address)
      await superbtoken.connect(buyerA).approve(calculette.address, 100)
      buyCreditCall = await calculette.connect(buyerA).buyCredits(10) // RATE = 2, must have 20 credits
    })

    it('should increase the amount of credits after a buy', async function () {
      expect(await calculette.creditsBalanceOf(buyerA.address)).to.equal(20)
    })

    it('should decrease the token balance of the buyer', async function () {
      expect(await superbtoken.balanceOf(buyerA.address)).to.equal(ONE_ETHER.div(10).mul(1000).sub(10))
    })

    it('should increase the token balance of the owner', async function () {
      expect(await superbtoken.balanceOf(owner.address)).to.equal(ownerTokenBalance.add(10))
    })

    it('should emit a CreditsBought event', async function () {
      expect(buyCreditCall).to.emit(calculette, 'CreditsBought').withArgs(buyerA.address, 20)
    })

    it('should revert if the buyer did not approve the contract', async function () {
      await expect(calculette.connect(buyerA).buyCredits(200)).to.be.revertedWith(
        'Calculette: you must approve the contract before use it.'
      )
    })

    it('should revert if the buyer have not enough token [ERC20 revert]', async function () {
      await superbtoken.connect(buyerA).approve(calculette.address, ONE_ETHER.div(10).mul(2000))
      await expect(calculette.connect(buyerA).buyCredits(ONE_ETHER.div(10).mul(1001))).to.be.revertedWith(
        'ERC20: transfer amount exceeds balance'
      )
    })
  })

  describe('Utilisation of arithmetic functions', function () {
    beforeEach(async function () {
      // buyerA buy token during the ICO and use it in Calculette
      await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(4))
      await initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(4), 1000)
      await initialCoinOffering.connect(buyerA).buyToken({ value: ONE_ETHER.div(10) })
      await ethers.provider.send('evm_increaseTime', [1210000]) // one week = 604800 second
      await ethers.provider.send('evm_mine')
      await initialCoinOffering.connect(buyerA).claimToken()
      await superbtoken.connect(buyerA).approve(calculette.address, 100)
      await calculette.connect(buyerA).buyCredits(10) // RATE = 2, must have 20 credits
    })

    it('should decrease the credits balances of the buyer (modifier)', async function () {
      await calculette.connect(buyerA).add(2, 5)
      await calculette.connect(buyerA).sub(2, 5)
      await calculette.connect(buyerA).mul(2, 5)
      await calculette.connect(buyerA).mod(2, 5)
      await calculette.connect(buyerA).div(2, 5)
      expect(await calculette.creditsBalanceOf(buyerA.address)).to.equal(15)
    })

    it('should return the right result [ADD]', async function () {
      expect(await calculette.connect(buyerA).add(3, 4))
        .to.emit(calculette, 'Add')
        .withArgs(7, 3, 4)
    })
    it('should return the right result [SUB]', async function () {
      expect(await calculette.connect(buyerA).sub(3, 4))
        .to.emit(calculette, 'Sub')
        .withArgs(-1, 3, 4)
    })
    it('should return the right result [MUL]', async function () {
      expect(await calculette.connect(buyerA).mul(3, 4))
        .to.emit(calculette, 'Mul')
        .withArgs(12, 3, 4)
    })
    it('should return the right result [MOD]', async function () {
      expect(await calculette.connect(buyerA).mod(3, 4))
        .to.emit(calculette, 'Mod')
        .withArgs(3, 3, 4)
    })
    it('should return the right result [DIV]', async function () {
      expect(await calculette.connect(buyerA).div(4, 4))
        .to.emit(calculette, 'Div')
        .withArgs(1, 4, 4)
    })

    it('should revert if div() is called with a zero at 2nd parameter', async function () {
      await expect(calculette.connect(buyerA).div(4, 0)).to.be.revertedWith('Calculette: you cannot divide by zero.')
    })

    it('should revert if the credits balance is at zero', async function () {
      await calculette.connect(buyerA).add(2, 5)
      await calculette.connect(buyerA).sub(2, 5)
      await calculette.connect(buyerA).mul(2, 5)
      await calculette.connect(buyerA).mod(2, 5)
      await calculette.connect(buyerA).div(2, 5)
      await calculette.connect(buyerA).add(2, 5)
      await calculette.connect(buyerA).sub(2, 5)
      await calculette.connect(buyerA).mul(2, 5)
      await calculette.connect(buyerA).mod(2, 5)
      await calculette.connect(buyerA).div(2, 5)
      await calculette.connect(buyerA).add(2, 5)
      await calculette.connect(buyerA).sub(2, 5)
      await calculette.connect(buyerA).mul(2, 5)
      await calculette.connect(buyerA).mod(2, 5)
      await calculette.connect(buyerA).div(2, 5)
      await calculette.connect(buyerA).add(2, 5)
      await calculette.connect(buyerA).sub(2, 5)
      await calculette.connect(buyerA).mul(2, 5)
      await calculette.connect(buyerA).mod(2, 5)
      await calculette.connect(buyerA).div(2, 5)
      await expect(calculette.connect(buyerA).add(2, 4)).to.be.revertedWith('Calculette: you have no more credits.')
    })
  })
})
