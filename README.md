# Mise en place d'une ICO

L'owner du contrat ERC20 & ICO doit approver les acheteurs pour qu'ils puissent récupérer leurs tokens.  
Cependant c'est impossible pour l'owner d'approver chaque personne qui achete. Un moyen d'automatiser cela ?

- l'owner pourrait approver le SM ICO à dépenser ses tokens pour les allocations
  Mais appeler une fonction en tant que smart contract parrait impossible via .call() / .delegatecall() / ...
- si ce n'est le contrat qui envoie les sous ce sont les acheteurs directement (lors de l'achat des tokens ou au claim)
  Mais cela nécéssite que les acheteur peuvent modifier leur allowances au près de l'owner pour s'envoyer des fonds.
