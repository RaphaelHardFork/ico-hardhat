const { expect } = require('chai')

describe('InitialCoinOffering', function () {
  let SuperbToken, superbtoken, InitialCoinOffering, initialCoinOffering, dev, owner, buyerA, buyerB
  const TOTAL_SUPPLY = ethers.utils.parseEther('1000')
  const ONE_ETHER = ethers.utils.parseEther('1')
  const RATE = 5
  const ZERO_ADDRESS = ethers.constants.AddressZero
  beforeEach(async function () {
    ;[dev, owner, buyerA, buyerB] = await ethers.getSigners()
    // ERC20 deployment
    SuperbToken = await ethers.getContractFactory('SuperbToken')
    superbtoken = await SuperbToken.connect(dev).deploy(TOTAL_SUPPLY, owner.address)
    await superbtoken.deployed()

    // ICO deployment
    InitialCoinOffering = await ethers.getContractFactory('InitialCoinOffering')
    initialCoinOffering = await InitialCoinOffering.connect(dev).deploy(superbtoken.address, owner.address)
    await initialCoinOffering.deployed()
  })

  // DEPLOYMENT
  describe('Deployment', function () {
    it('should use the right address contracts', async function () {
      expect(await initialCoinOffering.tokenContract()).to.equal(superbtoken.address)
    })

    it('should set the owner of the ICO', async function () {
      expect(await initialCoinOffering.owner()).to.equal(owner.address)
    })
  })

  // startSalePeriod()
  describe('startSalePeriod() - verification', function () {
    let functionCall
    beforeEach(async function () {
      await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(2))
      functionCall = await initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(4), RATE)
    })

    it('should set the supply for the sale', async function () {
      expect(await initialCoinOffering.supplyInSale()).to.equal(TOTAL_SUPPLY.div(4))
    })

    it('should set the rate', async function () {
      expect(await initialCoinOffering.rate()).to.equal(RATE)
    })

    it('should start the count for the sale duration', async function () {
      expect(await initialCoinOffering.timeBeforeSaleEnd()).to.above(0)
    })

    it('check if allowances [contract => owner] is set', async function () {
      expect(await superbtoken.allowance(owner.address, initialCoinOffering.address)).to.equal(TOTAL_SUPPLY.div(2))
    })

    it('should emit a SaleStarted event', async function () {
      expect(functionCall)
        .to.emit(initialCoinOffering, 'SaleStarted')
        .withArgs(owner.address, initialCoinOffering.address, TOTAL_SUPPLY.div(4), RATE)
    })
  })

  // startSalePeriod() - misuse
  describe('startSalePeriod() - misuse cases', function () {
    it('should revert if the caller is not the owner', async function () {
      await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(2))
      await expect(initialCoinOffering.connect(buyerA).startSalePeriod(TOTAL_SUPPLY.div(4), RATE)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('should revert if the owner sell more than the total supply', async function () {
      await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(2))
      await expect(initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.mul(2), RATE)).to.be.revertedWith(
        'InitialCoinOffering: you cannot sell more than the total supply.'
      )
    })

    it('should revert if the owner did not allowed his funds to the smart contract', async function () {
      await expect(initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(4), RATE)).to.be.revertedWith(
        'InitialCoinOffering: you have not allowed the funds yet.'
      )
    })

    it('should revert if the sale is already started', async function () {
      await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(2))
      await initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(4), RATE)
      await expect(initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(4), RATE)).to.be.revertedWith(
        'InitialCoinOffering: the sale is already launched.'
      )
    })
  })

  // buyToken()
  describe('buyToken() - verification', function () {
    let transaction
    beforeEach(async function () {
      await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(2))
      await initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(2), RATE)
      transaction = await initialCoinOffering.connect(buyerA).buyToken({ value: ONE_ETHER.div(10) })
    })

    it('should decrease the supply in sale', async function () {
      expect(await initialCoinOffering.supplyInSale()).to.equal(TOTAL_SUPPLY.div(2).sub(ONE_ETHER.div(10).mul(RATE)))
    })

    it('should increase the total supply sold', async function () {
      expect(await initialCoinOffering.supplySold()).to.equal(ONE_ETHER.div(10).mul(RATE))
    })

    it('should update the token balance of buyer', async function () {
      expect(await initialCoinOffering.tokenBalanceOf(buyerA.address)).to.equal(ONE_ETHER.div(10).mul(RATE))
    })

    it('sould increase the ether balance of the contract', async function () {
      expect(await initialCoinOffering.contractBalance()).to.equal(ONE_ETHER.div(10))
    })

    it('should increase the token balance of the contract [ERC20 transferFrom]', async function () {
      expect(await superbtoken.balanceOf(initialCoinOffering.address)).to.equal(ONE_ETHER.div(10).mul(RATE))
    })

    it('should decrease the token balance of the owner [ERC20 transferFrom]', async function () {
      expect(await superbtoken.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY.sub(ONE_ETHER.div(10).mul(RATE)))
    })

    it('should emit a Transfer event [ERC20 Transfer event]', async function () {
      // bonne pratique ?
      expect(transaction)
        .to.emit(superbtoken, 'Transfer')
        .withArgs(owner.address, initialCoinOffering.address, ONE_ETHER.div(10).mul(RATE))
    })

    it('should emit TokenBought event', async function () {
      expect(transaction)
        .to.emit(initialCoinOffering, 'TokenBought')
        .withArgs(buyerA.address, ONE_ETHER.div(10).mul(RATE), ONE_ETHER.div(10).mul(RATE))
    })
  })

  // buyToken() - Misuse & Edge Case
  describe('buyToken() - misuse & edge cases', function () {
    it('should revert if the sale is not started yet (modifier)', async function () {
      await expect(initialCoinOffering.connect(buyerA).buyToken({ value: ONE_ETHER.div(10) })).to.be.revertedWith(
        'InitialCoinOffering: the sale is not started yet.'
      )
    })

    it('should revert if the sale period is over (modifier)', async function () {
      await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY)
      await initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(2), RATE)
      await ethers.provider.send('evm_increaseTime', [1210000]) // one week = 604800 second
      await ethers.provider.send('evm_mine')
      await expect(initialCoinOffering.connect(buyerA).buyToken({ value: ONE_ETHER.div(10) })).to.be.revertedWith(
        'InitialCoinOffering: The sale is over.'
      )
    })

    it('should revert if the supply in sale is equal to zero', async function () {
      await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(4))
      await initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(4), RATE)
      await initialCoinOffering.connect(buyerB).buyToken({ value: TOTAL_SUPPLY })
      await expect(initialCoinOffering.connect(buyerA).buyToken({ value: ONE_ETHER.div(10) })).to.be.revertedWith(
        'InitialCoinOffering: there is no more token in sale.'
      )
    })

    it('[EDGE CASE] should refund the buyer if insufficient supply in sale', async function () {
      await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(4))
      await initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(4), RATE)
      let transaction = await initialCoinOffering.connect(buyerA).buyToken({ value: TOTAL_SUPPLY.div(2).div(RATE) })
      expect(transaction).changeEtherBalance(buyerA, TOTAL_SUPPLY.div(4).div(RATE).sub(TOTAL_SUPPLY.div(2).div(RATE)))
      expect(await initialCoinOffering.supplyInSale()).to.equal(0)
    })
  })

  // claimToken()
  describe('Claim tokens', function () {
    let claimTokenCall
    beforeEach(async function () {
      await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(4))
      await initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(4), RATE)
      await initialCoinOffering.connect(buyerA).buyToken({ value: ONE_ETHER.div(10) })
      await ethers.provider.send('evm_increaseTime', [1210000]) // one week = 604800 second
      await ethers.provider.send('evm_mine')
      claimTokenCall = await initialCoinOffering.connect(buyerA).claimToken()
    })

    it('should set the buyer balance token at zero', async function () {
      expect(await initialCoinOffering.tokenBalanceOf(buyerA.address)).to.equal(0)
    })

    it('should increase the buyer token balance [ERC20 transfer]', async function () {
      expect(await superbtoken.balanceOf(buyerA.address)).to.equal(ONE_ETHER.div(10).mul(RATE))
    })

    it('should decrease the token balance of the contract [ERC20 transfer]', async function () {
      expect(await superbtoken.balanceOf(initialCoinOffering.address)).to.equal(0)
    })

    it('should transfer tokens from contract to buyer [ERC20 Transfer event]', async function () {
      // bonne pratique de se servir des event de ERC20 pour tester un transfer ??
      expect(claimTokenCall)
        .to.emit(superbtoken, 'Transfer')
        .withArgs(initialCoinOffering.address, buyerA.address, ONE_ETHER.div(10).mul(RATE))
      // ou bien du matcher changeTokenBalance (ne marche pas)
      //expect(claimTokenCall).to.changeTokenBalance(superbtoken, buyerA, TOTAL_SUPPLY.div(8))
    })

    it('should emit a TokenClaimed event', async function () {
      expect(claimTokenCall)
        .to.emit(initialCoinOffering, 'TokenClaimed')
        .withArgs(buyerA.address, ONE_ETHER.div(10).mul(RATE))
    })
  })

  // claimToken() - Misuse
  describe('Misuse of claimToken', function () {
    beforeEach(async function () {
      await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(4))
      await initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(4), RATE)
      await initialCoinOffering.connect(buyerA).buyToken({ value: ONE_ETHER.div(10) })
    })

    it('should revert if the sale period is not over', async function () {
      await expect(initialCoinOffering.connect(buyerA).claimToken()).to.be.revertedWith(
        'InitialCoinOffering: you cannot claim tokens before the sale ends.'
      )
    })

    it('should revert if token balance is null', async function () {
      await ethers.provider.send('evm_increaseTime', [1210000]) // one week = 604800 second
      await ethers.provider.send('evm_mine')
      await expect(initialCoinOffering.connect(buyerB).claimToken()).to.be.revertedWith(
        'InitialCoinOffering: You have nothing to claim.'
      )
    })
  })

  // withdrawSaleProfit()
  describe('Withdraw sale profits', function () {
    let withdrawCall
    beforeEach(async function () {
      await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(2))
      await initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(2), RATE)
      await initialCoinOffering.connect(buyerA).buyToken({ value: ONE_ETHER.div(10) })
      await initialCoinOffering.connect(buyerB).buyToken({ value: ONE_ETHER.div(20) })
      await ethers.provider.send('evm_increaseTime', [1210000]) // one week = 604800 second
      await ethers.provider.send('evm_mine')
      withdrawCall = await initialCoinOffering.connect(owner).withdrawSaleProfit()
    })

    it('should set the contract balance at zero', async function () {
      // recupérer la balance du contract ??
      //expect(await initialCoinOffering.address.getBalance()).to.equal(0)
      // Creation d'un getter pour récupérer cette information
      expect(await initialCoinOffering.contractBalance()).to.equal(0)
    })

    it('should increase ether balance of owner', async function () {
      expect(withdrawCall).to.changeEtherBalance(owner, ONE_ETHER.div(20).mul(3))
    })
  })

  // withdrawSaleProfit() - Misuse
  describe('Misuse of withdraw sale profit', function () {
    beforeEach(async function () {
      await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(2))
      await initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(2), RATE)
    })

    it('should revert if the caller is not the owner (Ownable)', async function () {
      await initialCoinOffering.connect(buyerA).buyToken({ value: ONE_ETHER.div(10) })
      await ethers.provider.send('evm_increaseTime', [1210000]) // one week = 604800 second
      await ethers.provider.send('evm_mine')
      await expect(initialCoinOffering.connect(buyerB).withdrawSaleProfit()).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('should revert if the sale is not over', async function () {
      await initialCoinOffering.connect(buyerA).buyToken({ value: ONE_ETHER.div(10) })
      await expect(initialCoinOffering.connect(owner).withdrawSaleProfit()).to.be.revertedWith(
        'InitialCoinOffering: you cannot withdraw ether before the sale ends.'
      )
    })

    it('should revert if the contract is empty', async function () {
      await ethers.provider.send('evm_increaseTime', [1210000]) // one week = 604800 second
      await ethers.provider.send('evm_mine')
      await expect(initialCoinOffering.connect(owner).withdrawSaleProfit()).to.be.revertedWith(
        'InitialCoinOffering: there is no ether to withdraw in the contract.'
      )
    })
  })

  describe('Buyers are protected if owner transfer all the supply elsewhere', function () {
    let ownerBalance
    beforeEach(async function () {
      // Owner set the sale => BuyerA get tokens => Owner send all his token funds elsewhere
      await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(4))
      await initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(4), RATE)
      await initialCoinOffering.connect(buyerA).buyToken({ value: ONE_ETHER.div(10) })
      ownerBalance = await superbtoken.balanceOf(owner.address)
      await superbtoken.connect(owner).transfer(dev.address, ownerBalance)
    })

    it('should enable to claim token after the sale period', async function () {
      await ethers.provider.send('evm_increaseTime', [1210000]) // one week = 604800 second
      await ethers.provider.send('evm_mine')
      await initialCoinOffering.connect(buyerA).claimToken()
      expect(await superbtoken.balanceOf(buyerA.address)).to.equal(ONE_ETHER.div(10).mul(RATE))
    })

    it('should revert if the buyer attempt to buy token (ERC20 - transferFrom)', async function () {
      await expect(initialCoinOffering.connect(buyerB).buyToken({ value: ONE_ETHER.div(10) })).to.be.revertedWith(
        'ERC20: transfer amount exceeds balance'
      )
    })
  })

  describe('Owner cannot start another sale period', function () {
    it('should revert if the owner attempt to start the sale twice', async function () {
      await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(2))
      await initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(4), RATE)
      await ethers.provider.send('evm_increaseTime', [1210000]) // one week = 604800 second
      await ethers.provider.send('evm_mine')
      await expect(initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(4), RATE)).to.be.revertedWith(
        'InitialCoinOffering: the sale is already launched.'
      )
    })
  })
})
