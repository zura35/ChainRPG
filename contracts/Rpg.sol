//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./GprToken.sol";

contract Rpg {
    struct Character {
        string name;
        uint healthPoint;
        uint luckyPoint;
        uint levelPoint;
    }

    struct Boss {
        string name;
        uint healthPoint;
        uint level;
    }

    mapping (address => Character) players;
    address [] playerAddressList;
    uint noOfPlayers = 0;
    uint constant maxCharacters = 5;

    Boss[] bosses;
    uint noOfBosses = 3;
    uint hitBar = 0;

    mapping (string => string) actionDecisions;

    GprToken gprTokenContract;

    modifier isValidPlayer {
        // Character starts from levelPoint 50
        require(players[msg.sender].levelPoint > 0);
        _;
    }

    modifier hasRemainingBoss {
        require(noOfBosses > 0 );
        _;
    }

    modifier shouldNewGame {
        if (noOfBosses > 0 && bosses[noOfBosses - 1].healthPoint <= hitBar) {
            hitBar = 0;
            noOfBosses -= 1;
            _rewardContributor();
        } else {
            _;
        }
    }

    constructor(GprToken _gprToken) {
        Boss memory slime = Boss({name: "OOM", healthPoint: 1000, level: 1});
        Boss memory medusa = Boss({name: "MemoryLeak", healthPoint: 5000, level: 2});
        Boss memory lucifer = Boss({name: "ServiceOutage", healthPoint: 10000, level: 3});
        bosses.push(lucifer);
        bosses.push(medusa);
        bosses.push(slime);

        actionDecisions["fight"] = "random";
        actionDecisions["run"] = "luck";
        actionDecisions["heal"] = "abs";

        gprTokenContract = _gprToken;
    }

    function getCurrentBoss() public view returns (string memory, int, uint, uint) {
        if (noOfBosses == 0) {
            return ("", 0, 0, 0);
        }
        Boss memory b = bosses[noOfBosses - 1];
        return (b.name, int(b.healthPoint) - int(hitBar), b.level, noOfBosses);
    }

    function getPlayer() public view returns (string memory, uint, uint, uint) {
        Character memory c = players[msg.sender];
        return (c.name, c.healthPoint, c.luckyPoint, c.levelPoint);
    }

    function listPlayerAddresses() public view returns (address[] memory) {
        address[] memory _list = new address[](noOfPlayers);

        if (noOfPlayers == 0) {
            return _list;
        }

        uint counter = 0;
        for (uint i = 0; i < playerAddressList.length; i++) {
            address _a = playerAddressList[i];
            if (_a == address(this)) {
                continue;
            }
            _list[counter] = _a;
            counter++;
        }

        return _list;
    }

    function getPlayerBalance() public view returns (uint256) {
        return gprTokenContract.balanceOf(msg.sender);
    }

    function joinGame() public {
        require(noOfPlayers < maxCharacters, "no capacity");
        addPlayer();
    }

    // Player Configuration
    function addPlayer() private {
        // not existing player
        require(players[msg.sender].levelPoint == 0, "existing player");

        Character memory c = Character({
            name: "Random",
            healthPoint: 100,
            luckyPoint: 100,
            levelPoint: 50
        });

        players[msg.sender] = c;
        playerAddressList.push(msg.sender);
        noOfPlayers++;
    }

    // for selling character to others
    function swapPlayer(address descendant) public isValidPlayer {
        Character memory c = players[msg.sender];
        players[descendant] = c;
        _killPlayer(descendant);
    }

    function checkPlayerHealthPoint(uint hp) private isValidPlayer returns (bool) {
        if (hp <= 0) {
            killPlayer();
            return false;
        }
        return true;
    }

    function killPlayer() private {
        _killPlayer(address(this));
    }

    function _killPlayer(address a) private {
        delete players[msg.sender];

        // replace player's address with own contract address
        for (uint i = 0; i < playerAddressList.length; i++) {
            if (playerAddressList[i] != msg.sender) {
                continue;
            }
            playerAddressList[i] = a;
        }

        if (a == address(this)) {
            noOfPlayers--;
        }
    }

    // Game Behaviours
    function applyActions(string[] memory actions) public isValidPlayer hasRemainingBoss shouldNewGame{
        // [TODO]: check if current boss is already defeated
        uint _hitBar = hitBar;
        Character memory c = players[msg.sender];
        uint j = actions.length;
        for (uint i = 0; i < j; i++) {
            if (!checkPlayerHealthPoint(c.healthPoint)) { return; }

            string memory a = actions[i];
            (uint _hb, uint _hp, uint _lp, uint _lv) = applyAction(c, a, actionDecisions[a], _hitBar);
            _hitBar = _hb;
            c.healthPoint = _hp;
            c.luckyPoint = _lp;
            c.levelPoint = _lv;

            if (!checkPlayerHealthPoint(c.healthPoint)) { return; }
        }

        hitBar = _hitBar;
        players[msg.sender] = c;
    }

    // action enum [fight, run, heal]
    // [TODO] replace string of action/decideBy/effect to uint?
    function applyAction(Character memory c, string memory action, string memory decideBy, uint _hitBar) private view isValidPlayer returns (uint, uint, uint, uint) {
        bool isSuccessful = applyDecision(decideBy);
        string memory effect = "";

        if (compareString(action, "fight")) {
            if (isSuccessful) {
                effect = "hit";
            } else {
                effect = "damage";
            }
        }

        if (compareString(action, "run")) {
            if (isSuccessful) {
                effect = "escape";
            } else {
                effect = "damage";
            }
        }

        if (compareString(action, "heal")) {
            // decision not evaluated
            effect = "heal";
        }

        require(!compareString(effect, ""));
        return computeEffect(c, effect, _hitBar);
    }

    // decision enum [abs, luck, level, random] random is not used yet, may remove later
    function applyDecision(string memory decideBy) view private isValidPlayer returns (bool) {
        Character memory c = players[msg.sender];

        // [TODO] replace decision logic; the line below is only for demonstration purpose
        if (compareString(decideBy, "abs")) {
            return true;
        }

        if (compareString(decideBy, "luck")) {
            uint random = uint(uint256(keccak256(abi.encodePacked(block.timestamp,block.difficulty,msg.sender)))%100);
            return random > c.luckyPoint;
        }

        if (compareString(decideBy, "random")) {
            uint random = uint(uint256(keccak256(abi.encodePacked(block.timestamp,block.difficulty,msg.sender)))%100);
            return random > 40;
        }
        return false;
    }

    function computeEffect(Character memory c, string memory effect, uint _hitBar) view private returns (uint, uint, uint, uint) {
        Boss memory b = bosses[noOfBosses - 1];

        // [TODO]: adjust the figures here
        if (compareString(effect, "hit")) {
            _hitBar += c.levelPoint;
            c.levelPoint += b.level * 123;
        }

        if (compareString(effect, "damage")) {
            c.healthPoint -= Math.min(b.level * 5, c.healthPoint);
            c.luckyPoint += b.level * 10;
            c.luckyPoint = uint(Math.min(100, c.luckyPoint));
        }

        if (compareString(effect, "escape")) {
            c.levelPoint -= Math.min(b.level * 3, c.levelPoint);
            c.luckyPoint -= Math.min(b.level * 20, c.luckyPoint);
            _hitBar -= Math.min(_hitBar, 1000);
        }

        if (compareString(effect, "heal")) {
            c.healthPoint += 50;
            _hitBar -= Math.min(_hitBar, 50);
        }

        return (_hitBar, c.healthPoint, c.luckyPoint, c.levelPoint);
    }

    function _rewardContributor() private {
        for (uint i=0; i<playerAddressList.length; i++) {
            if (playerAddressList[i] == address(this)) {
                continue;
            }
            gprTokenContract.transfer(playerAddressList[i], 100);
        }
    }
}

function compareString(string memory a, string memory b) pure returns (bool) {
    return keccak256(bytes(a)) == keccak256(bytes(b));
}