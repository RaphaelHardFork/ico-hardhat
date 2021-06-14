# Mise en place d'une ICO

**ICO (initial coin offering):** (Pre)ventes de tokens automatiser dans un smart contrat.

## Création de l'ERC20

Pour cela on importe le contrat OpenZeppelin :

```
yarn add @openzeppelin/contracts
```

Et on crée un smart contract important le contrat ERC20 :

```js
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SuperbToken is ERC20 {
    constructor(uint256 totalSupply_, address owner_) ERC20("SuberbToken", "SBT") {
        _mint(owner_, totalSupply_);
    }
}
```

Le détenteur de la supply totale est désigné lors du déploiment du contract ERC20.

## Test du contrat ERC20

Etant donné qu'on se sert du contrat de OpenZeppelin nous avons juste à tester le déploiment :

```js
const { expect } = require("chai");

describe("SuperbToken", function () {
  let SuperbToken, superbtoken, dev, owner, contract;
  let TOTAL_SUPPLY = ethers.utils.parseEther("1001");
  let ZERO_ADDRESS = ethers.constants.AddressZero;
  beforeEach(async function () {
    [dev, owner, contract] = await ethers.getSigners();
    SuperbToken = await ethers.getContractFactory("SuperbToken");
    superbtoken = await SuperbToken.connect(dev).deploy(TOTAL_SUPPLY, owner.address);
    await superbtoken.deployed();
  });

  // Test n°1
  it("should emit a Transer event (ERC20 mint function)", async function () {
    expect(superbtoken.deployTransaction)
      .to.emit(superbtoken, "Transfer")
      .withArgs(ZERO_ADDRESS, owner.address, TOTAL_SUPPLY);
  });

  // Test n°2
  it("should transfer the total supply to owner", async function () {
    expect(await superbtoken.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY);
  });
});
```

**Test n°1 :** on se sert de l'event `Transfer` emit par le contrat ERC20 pour voir si la fonction `_mint()` a marchée (ce test n'est pas nécéssaire)  
**Test n°2 :** on regarde si la supply totale est bien à l'adresse mise dans le constructor.

## Création du contract ICO

### Imports et héritages

Le contrat ICO à besoin d'autres contrats pour gérer la vente des tokens :

```js
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./SuperbToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
```

**Héritage de Ownable :**

```js
import "@openzeppelin/contracts/access/Ownable.sol";

contract InitialCoinOffering is Ownable {...}
```

Ici notre smart contract `InitialCoinOffering` hérite des fonctions de [Ownable.sol](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol)  
On pourra donc utiliser les fonctions dans notre code :

```js
// Dans le constructor
constructor(..., address owner_) Ownable() {
  {...}
  transferOwnership(owner_);
  }

// Dans d'autres fonctions
function startSalePeriod(...) public onlyOwner {
  {...}
  emit SaleStarted(owner(), ...);
}
```

On se sert du `modifier` onlyOwner et du `getter` owner()
**Modification de types :**

```js
import "@openzeppelin/contracts/utils/Address.sol";

contract InitialCoinOffering is Ownable {
    using Address for address payable
    {...}
}
```

Ici on modifie le type `address payable`, on lui ajoute des fonctions / méthodes supplémentaires, notamment `.sendValue()` :

```js
function withdrawSaleProfit() public onlyOwner {
  {...}
  payable(msg.sender).sendValue(address(this).balance);
}
```

**Import de l'ERC20 :**

```js
import "./SuperbToken.sol";

contract InitialCoinOffering is Ownable {
    using Address for address payable

    SuperbToken private _token;
    {...}

    constructor(address superbTokenAddress, address owner_) Ownable() {
        _token = SuperbToken(superbTokenAddress);
        transferOwnership(owner_);
    }
}
```

On doit spécifier l'adresse du smart contract de l'ERC20 lors du déploiment de l'ICO. On peut ensuite utiliser les fonctions de ce contrat (et de ERC20 étant donner qu'il hérite de ERC20) :

```js
function claimToken() public {
  {...}
  _token.transfer(msg.sender, amount);
}
```

### Fonctionnalités de l'ICO

L'ICO démarre à la demande de l'owner, à ce moment une période de temps pour acheter des tokens commence.  
**Mise en place de la période de vente et des conditions :**

```js
function startSalePeriod(uint256 supplyInSale_, uint256 rate_) public onlyOwner {
  {... require()}
  _startTimeEpoch = block.timestamp;
  _supplyInSale = supplyInSale_;
  _rate = rate_;
  emit SaleStarted(owner(), address(this), supplyInSale_, rate_);
    }
```

Pour appeller cette fonction l'owner doit :

- vendre autant ou moins que la supply totale
- avoir approuver le smart contract ICO pour au moins la supply qui sera mise en vente
- appeler cette fonction pour la première fois (l'owner ne peut pas relancer une vente)

```js
require(supplyInSale_ <= _token.totalSupply(), "InitialCoinOffering: you cannot sell more than the total supply.");
require(supplyInSale_ <=
  _token.allowance(owner(), address(this)), "InitialCoinOffering: you have not allowed the funds yet.");
require(_startTimeEpoch == 0, "InitialCoinOffering: the sale is already launched.");
```

L'owner appelle cette fonction en définissant :

- la supply qui est mis en vente
- le taux de convertion de son token ([1] => 1 token = 1 ether)

Lorsque que cette fonction est appelée le compte à rebours est lancé. Un `modifier` est crée pour s'assurer que les achats de tokens soit fait durant cette période de temps :

```js
modifier isSalePeriod() {
  require(_startTimeEpoch != 0, "InitialCoinOffering: the sale is not started yet.");
  if (_startTimeEpoch != 0) {
    require(block.timestamp < _startTimeEpoch + 2 weeks, "InitialCoinOffering: The sale is over.");
  }
  _;
}
```

**Acheter des tokens :**  
On peut acheter des tokens de deux façons :

- par la fonction _buyToken()_
- en envoyant directement des ethers dans le contrat (fonction _receive()_)

```js
receive() external payable {
  _buyToken(msg.sender, msg.value);
}

function buyToken() public payable {
  _buyToken(msg.sender, msg.value);
}
```

Ces deux fonctions appelle une fonction privée :

```js
function _buyToken(address sender, uint256 amount) private isSalePeriod {
  require(_supplyInSale != 0, "InitialCoinOffering: there is no more token in sale.");
  uint256 tokenAmount = amount * _rate;
  uint256 exceedTokenAmount;
  if (_supplyInSale < tokenAmount) {
    exceedTokenAmount = tokenAmount - _supplyInSale;
  }
  _supplyInSale -= tokenAmount - exceedTokenAmount;
  _tokenBalances[sender] += tokenAmount - exceedTokenAmount;
  _supplySold += tokenAmount - exceedTokenAmount;

  // fonction de l'ERC20
  _token.transferFrom(owner(), address(this), tokenAmount - exceedTokenAmount);

  payable(sender).sendValue(exceedTokenAmount / _rate);
  emit TokenBought(sender, tokenAmount - exceedTokenAmount, _supplySold);
}
```

Cette fonction utilise une fonction de l'ERC20 `transferFrom`. Elle permet d'envoyer les tokens depuis l'adresse de l'owner vers le contrat.  
(le `msg.sender` est le contrat sur cette fonction).

On peut voir que le contrat stocke les ethers issue de la vente et les tokens qui ont été acheté.

**Récupérer les tokens et les ethers :**  
Après que la période de vente soit terminée les acheteurs peuvent récupérer les tokens via la fonction `claimToken()`

```js
function claimToken() public {
  require(block.timestamp > _startTimeEpoch + 2 weeks,
  "InitialCoinOffering: you cannot claim tokens before the sale ends."
  );
  require(_tokenBalances[msg.sender] != 0, "InitialCoinOffering: You have nothing to claim.");
  uint256 amount = _tokenBalances[msg.sender];
  _tokenBalances[msg.sender] = 0;
  _token.transfer(msg.sender, amount);
  emit TokenClaimed(msg.sender, amount);
}
```

Pour appeller cette fonction il faut que la période de vente soit terminée et avoir acheter des tokens via la fonction `_buyTokens()`  
Ensuite c'est le smart contract qui envoie directement les tokens vers l'adresse qui appelle la fonction (fonction `transfer` de l'ERC20).

L'owner peut récupérer les ethers issus de la vente via la fonction `withdrawSaleProfit()`

```js
function withdrawSaleProfit() public onlyOwner {
  require(address(this).balance != 0, "InitialCoinOffering: there is no ether to withdraw in the contract.");
  require(block.timestamp > _startTimeEpoch + 2 weeks,
  "InitialCoinOffering: you cannot withdraw ether before the sale ends."
  );
  payable(msg.sender).sendValue(address(this).balance);
}
```

De même que pour les acheteurs, l'owner ne peut pas retirer les ethers avant que la vente soit terminée.

## Test du contrat ICO

_Seuls les tests atypiques et important seront présentés._  
**Mise en place des tests :**

```js
const { expect } = require('chai')

describe('InitialCoinOffering', function () {
  // variables utiles
  let SuperbToken, superbtoken, InitialCoinOffering, initialCoinOffering, dev, owner, buyerA, buyerB
  const TOTAL_SUPPLY = ethers.utils.parseEther('1000')
  const ONE_ETHER = ethers.utils.parseEther('1')
  const RATE = 5
  const ZERO_ADDRESS = ethers.constants.AddressZero

  // Déploiement des contrats
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

  {...}

})
```

Les codes présentés ci-dessous sont au niveau du `{...}`  
**Déploiement du contrat :**

```js
describe("Deployment", function () {
  // [1]
  it("should use the right address contracts", async function () {
    expect(await initialCoinOffering.tokenContract()).to.equal(superbtoken.address);
  });

  // [2]
  it("should set the owner of the ICO", async function () {
    expect(await initialCoinOffering.owner()).to.equal(owner.address);
  });
});
```

**[1] :** L'adresse de l'ERC20 est correct  
**[2] :** L'adresse de l'owner est correct

**Lancement de la vente :**  
Avant de lancer les tests on applique un scénario dans le `beforeEach`

```js
describe("startSalePeriod() - verification", function () {
  let functionCall;
  beforeEach(async function () {
    await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(2));
    functionCall = await initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(4), RATE);
  });

  // [1]
  it("should set the supply for the sale", async function () {
    expect(await initialCoinOffering.supplyInSale()).to.equal(TOTAL_SUPPLY.div(4));
  });

  // [2]
  it("should set the rate", async function () {
    expect(await initialCoinOffering.rate()).to.equal(RATE);
  });

  // [3]
  it("should start the count for the sale duration", async function () {
    expect(await initialCoinOffering.timeBeforeSaleEnd()).to.above(0);
  });

  // [4]
  it("check if allowances [contract => owner] is set", async function () {
    expect(await superbtoken.allowance(owner.address, initialCoinOffering.address)).to.equal(TOTAL_SUPPLY.div(2));
  });

  // [5]
  it("should emit a SaleStarted event", async function () {
    expect(functionCall)
      .to.emit(initialCoinOffering, "SaleStarted")
      .withArgs(owner.address, initialCoinOffering.address, TOTAL_SUPPLY.div(4), RATE);
  });
});
```

**[1] :** La supply mise en vente  
**[2] :** Le taux de conversion  
**[3] :** Le compteur est lancé  
**[4] :** L'allowances du contrat sur les fonds de l'owner est correct  
**[5] :** L'évènement `SaleStarted` est émit

On peut regarder ensuite les cas de mauvaises utilisations de cette fonction :

```js
describe("startSalePeriod() - misuse cases", function () {
  // [1]
  it("should revert if the caller is not the owner", async function () {
    await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(2));
    await expect(initialCoinOffering.connect(buyerA).startSalePeriod(TOTAL_SUPPLY.div(4), RATE)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  // [2]
  it("should revert if the owner sell more than the total supply", async function () {
    await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(2));
    await expect(initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.mul(2), RATE)).to.be.revertedWith(
      "InitialCoinOffering: you cannot sell more than the total supply."
    );
  });

  // [3]
  it("should revert if the owner did not allowed his funds to the smart contract", async function () {
    await expect(initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(4), RATE)).to.be.revertedWith(
      "InitialCoinOffering: you have not allowed the funds yet."
    );
  });

  // [4]
  it("should revert if the sale is already started", async function () {
    await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(2));
    await initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(4), RATE);
    await expect(initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(4), RATE)).to.be.revertedWith(
      "InitialCoinOffering: the sale is already launched."
    );
  });
});
```

Ici on regarde des cas d'utilisation spécifique, pour cela il n'y a pas de `beforeEach` pour mettre en place un seul scénario. On doit déclancher le bon _revert_ à chaque test.

On regarde si la transaction est bien renvoyée (revert) si :  
**[1] :** Ce n'est pas l'owner qui appelle cette fonction.  
**[2] :** Plus que la supply totale veut être mise en vente.  
**[3] :** L'owner n'a pas apprové le contrat  
**[4] :** La vente à déjà été démarré

**Autres tests intéressant :**  
Dans la fonction `withdrawSaleProfit()` on veut regarder si les balances du contrat et de l'owner ont changé :

```js
describe("Withdraw sale profits", function () {
  let withdrawCall;
  beforeEach(async function () {
    await superbtoken.connect(owner).approve(initialCoinOffering.address, TOTAL_SUPPLY.div(2));
    await initialCoinOffering.connect(owner).startSalePeriod(TOTAL_SUPPLY.div(2), RATE);
    await initialCoinOffering.connect(buyerA).buyToken({ value: ONE_ETHER.div(10) });
    await initialCoinOffering.connect(buyerB).buyToken({ value: ONE_ETHER.div(20) });
    await ethers.provider.send("evm_increaseTime", [1210000]); // one week = 604800 second
    await ethers.provider.send("evm_mine");
    withdrawCall = await initialCoinOffering.connect(owner).withdrawSaleProfit();
  });

  // [1]
  it("should set the contract balance at zero", async function () {
    // Creation d'un getter dans le smart contract pour récupérer cette information
    expect(await initialCoinOffering.contractBalance()).to.equal(0);
  });

  // [2]
  it("should increase ether balance of owner", async function () {
    expect(withdrawCall).to.changeEtherBalance(owner, ONE_ETHER.div(20).mul(3));
  });
});
```

On distingue deux lignes dans le `beforeEach`, leur rôle est de faire avancer le temps pour se placer à la fin de la vente des tokens :

```js
await ethers.provider.send("evm_increaseTime", [1210000]); // one week = 604800 second
await ethers.provider.send("evm_mine");
```

**[1] :** On regarde la balance du smart contract, pour cela nous avons du créer un `getter` dans le smart contract de l'ICO.  
**[2] :** On regarde si la balance de l'owner augmente. Pour regarder simplement si la balance en ether augmente ou diminue on peut utiliser la méthode `.changeEtherBalance()`

## Déploiment des contracts via Hardhat

Création d'un compte sur [Infura](https://infura.io/)
https://ropsten.infura.io/v3/API_KEY (endpoint de l'API)
(ID du projet)
