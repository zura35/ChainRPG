//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./GprToken.sol";

contract RpgV2 {
    GprToken gprTokenContract;

    struct Character { 
        string name;
        uint contribution;
        uint luckiness;
        uint checkpoint; // eventId
    }

    // global counter for all players
    int public karma = 0;

    mapping (address => Character) public players;
    address[] public playerAddressList;
    uint constant maxPlayers = 5;

    struct ActionResult {
        uint resultEventId;
        string effect;
        int affectedValue;
    }

    struct Action {
        uint id;
        string description;
        uint probability; // probability/100
        ActionResult onSuccess;
        ActionResult onFailure;
    }

    struct _Event {
        string d;
        uint8[3] a;
    }

    struct Event {
        uint id;
        string description;
        uint8[] actions; // list of actionIds
    }

    mapping (uint => Event) public events;
    mapping (uint => Action) public actions;
    string[][] private _actions;
    _Event[] private _events;

    constructor(GprToken _gprToken) {
        gprTokenContract = _gprToken;

        // [TODO]: revamp, can use in-memory string[]
        // actions: description, probability, onSuccessEventId, onSuccessEffect, onSuccessAffectedValue, onFalureEventId, onFailureEffect, onFailureAffectedValue
        _actions.push(["ask your lead", "100", "2", "", "", "2", "", ""]);
        _actions.push(["ask your teammate", "100", "3", "", "", "3", "", ""]);
        _actions.push(["start working", "100", "4", "contribution", "1", "4", "", ""]);
        _actions.push(["take a break", "50", "5", "luckiness", "1", "5", "luckiness", "-1"]);
        _actions.push(["help teammate", "100", "6", "contribution", "1", "6", "", ""]);
        _actions.push(["reject teammate", "100", "5", "", "", "5", "", ""]);
        _actions.push(["ask the author", "100", "3", "", "", "3", "", ""]);
        _actions.push(["fix the bug", "70", "6", "contribution", "2", "5", "contribution", "-1"]);
        _actions.push(["ignore the bug", "30", "5", "luckiness", "2", "5", "contribution", "-2"]);
        _actions.push(["next", "100", "1", "", "", "1", "", ""]);

        // [TODO]: revamp, can use in-memory string[]
        // events: description, ...actions
        _events.push(_Event({d: "This is your first day at Gamma Soft, working as an engineer. You are assigned a task where you have no idea, you decide to", a: [1, 2, 0]}));
        _events.push(_Event({d: "Your lead has explained to you the task details, you decide to", a: [3, 4, 0]}));
        _events.push(_Event({d: "Your teammate Stephy asked if you can help with her current task too, you decide to", a: [5, 6, 0]}));
        _events.push(_Event({d: "You found a bug from the source codes, you decide to", a: [7, 8, 9]}));
        _events.push(_Event({d: "You have ended your first working day!", a: [10, 0, 0]}));
        _events.push(_Event({d: "You have fixed a bug from the source codes!", a: [10, 0, 0]}));

        buildAllEvents();
    }

    function buildAllEvents() private {
        // build all actions
        for (uint i = 0; i < _actions.length; i++) {
            string[] memory _a = _actions[i];
            ActionResult memory onSuccess = ActionResult({resultEventId: bToUi(_a[2]), effect: _a[3], affectedValue: bToI(_a[4])});
            ActionResult memory onFailure = ActionResult({resultEventId: bToUi(_a[5]), effect: _a[6], affectedValue: bToI(_a[7])});
            Action memory a = Action({id: i + 1, description: _a[0], probability: bToUi(_a[1]), onSuccess: onSuccess, onFailure: onFailure});
            actions[i + 1] = a;
        }

        // build all events and push actions to each event
        for (uint j = 0; j < _events.length; j++) {
            Event storage e = events[j + 1];
            e.id = j + 1;
            e.description = _events[j].d;

            uint8[3] memory _ea = _events[j].a;
            for (uint k = 0; k < _ea.length; k++) {
                uint8 _a = _ea[k];
                if (_a == 0) { continue; }
                e.actions.push(_a);
            }
        }
    }

    modifier isValidPlayer {
        require(players[msg.sender].checkpoint != 0);
        _;
    }

    // public functions

    function getPlayerBalance() public view returns (uint256) {
        return gprTokenContract.balanceOf(msg.sender);
    }

    function listPlayerAddresses() public view returns (address[] memory) {
        address[] memory _list = new address[](maxPlayers);

        uint counter = 0;
        for (uint i = 0; i < playerAddressList.length; i++) {
            address _a = playerAddressList[i];
            if (_a == address(0)) {
                continue;
            }
            _list[counter] = _a;
            counter++;
        }

        return _list;
    }

    // returns character
    function joinGame(string memory name) public returns (string memory, uint, uint, uint) {
        require(players[msg.sender].checkpoint == 0);
        require(bytes(name).length > 0);

        Character memory c = Character({
            name: name,
            contribution: 0,
            luckiness: 0,
            checkpoint: 1 // [TODO] set random event
        });

        players[msg.sender] = c;
        playerAddressList.push(msg.sender);
        return (c.name, c.contribution, c.luckiness, c.checkpoint);
    }

    function getEventAndActions() public view isValidPlayer returns (string memory, string memory) {
        Character memory c = players[msg.sender];
        Event memory e = events[c.checkpoint];

        // in a format of 1_(a1 description):2_(a2 description)
        string memory allActionStr;
        string memory actionStr;
        Action memory _a;
        for (uint i = 0; i < e.actions.length; i++) {
            _a = actions[e.actions[i]];
            actionStr = string(abi.encodePacked(Strings.toString(_a.id), "_", _a.description));
            if (i > 0) {
                actionStr = string(abi.encodePacked(":", actionStr));
            }

            allActionStr = string(abi.encodePacked(allActionStr, actionStr));
        }

        return (e.description, allActionStr);
    }
    
    // returns character
    function applyEventAction(uint actionId) public isValidPlayer returns (int, string memory, uint, uint, uint) {
        Character memory c = players[msg.sender];
        Event memory checkpoint = events[c.checkpoint];

        if (!isValidAction(checkpoint, actionId)) {
            revert("invalid action");
        }

        Action memory a = actions[actionId];
        bool isSuccessful = computeEventDecision(a);
        int _karma = karma;
        (_karma, c.name, c.contribution, c.luckiness, c.checkpoint) = computeEffects(c, a, isSuccessful);

        // write states
        karma = assessKarma(_karma);
        players[msg.sender] = c;
        return (karma, c.name, c.contribution, c.luckiness, c.checkpoint);
    }

    // private or internal functions

    function computeEventDecision(Action memory a) internal view returns (bool) {
        uint random = generateRandomUint();
        return random < a.probability;
    }

    function computeEffects(Character memory c, Action memory a, bool isSuccessful) internal view returns (int, string memory, uint, uint, uint) {
        int _karma = karma;
        ActionResult memory ar;

        if (isSuccessful) {
            ar = a.onSuccess;
        } else {
            ar = a.onFailure;
        }

        c.checkpoint = ar.resultEventId;
        (_karma, c.contribution, c.luckiness) = _computeEffects(c, ar);

        return (_karma, c.name, c.contribution, c.luckiness, c.checkpoint);
    }

    function _computeEffects(Character memory c, ActionResult memory ar) internal view returns (int, uint, uint) {
        int _karma = karma;
        if (compareString(ar.effect, "contribution")) {
            if (ar.affectedValue > 0) {
                c.contribution += uint(ar.affectedValue);
            } else {
                c.contribution -= Math.min(uint(ar.affectedValue), c.contribution);
            }
            _karma += ar.affectedValue;
        }

        if (compareString(ar.effect, "luckiness")) {
            if (ar.affectedValue > 0) {
                c.luckiness += uint(ar.affectedValue); 
            } else {
                c.luckiness -= Math.min(uint(ar.affectedValue), c.luckiness);
            }
        }

        return (_karma, c.contribution, c.luckiness);
    }

    function isValidAction(Event memory e, uint actionId) internal pure returns (bool) {
        bool _isValidAction = false;
        for (uint i = 0; i < e.actions.length; i++) {
            if (e.actions[i] == actionId) {
                _isValidAction = true;
                break;
            }
        }
        return _isValidAction;
    }

    function assessKarma(int _k) internal returns (int) {
        if (_k > 5) {
            rewardPlayers();
            return 0;
        }

        if (_k < -2) {
            // [FIXME] on UI it can get player but no address in player list,
            //         player is killed in test
            address playerToKill;
            int lowestLuck = -1;
            for (uint i = 0; i < playerAddressList.length; i++) {
                if (playerAddressList[i] == address(0)) { continue; }
                Character memory c = players[playerAddressList[i]];
                if (lowestLuck == -1 || int(c.luckiness) < lowestLuck) {
                    lowestLuck = int(c.luckiness);
                    playerToKill = playerAddressList[i];
                }
            }

            killPlayer(playerToKill);
            return 0;
        }

        return _k;
    }

    function killPlayer(address p) internal {
        delete players[p];
        for (uint i = 0; i < playerAddressList.length; i++) {
            if (playerAddressList[i] == p) {
                playerAddressList[i] = address(0);
            }
        }
    }

    function rewardPlayers() internal {
        for (uint i = 0; i < playerAddressList.length; i++) {
            if (playerAddressList[i] == address(0)) {
                continue;
            }
            gprTokenContract.transfer(playerAddressList[i], 100);
        }
    }

    // testing purpose
    function getEventActionDescriptions(uint eventId) public view returns (string[] memory) {
        Event memory e = events[eventId];
        uint8[] memory a = e.actions;
        string[] memory res = new string[](a.length);
        for (uint i = 0; i < a.length; i++) {
            res[i] = actions[a[i]].description;
        }
        return res;
    }

    // conversion: string to uint
    // thanks to https://ethereum.stackexchange.com/questions/10932/how-to-convert-string-to-int
    function bToUi(string memory s) internal pure returns (uint result) {
        bytes memory b = bytes(s);
        for (uint i = 0; i < b.length; i++) {
            if (b1ToInt(b[i]) >= 48 && b1ToInt(b[i]) <= 57) {
                result = result * 10 + (uint8(b[i]) - 48);
            }
        }
        return result;
    }

    // conversion: string to int
    function bToI(string memory s) internal pure returns (int result) {
        result = int(bToUi(s));
        if (result == 0) { return result; }

        bytes memory b = bytes(s);
        if (b[0] == bytes("-")[0]) {
            result = result * -1;
        }
        return result;
    }

    // conversion: bytes1 to int8
    function b1ToInt(bytes1 b) internal pure returns (int8) {
        return int8(uint8(b));
    }


    function generateRandomUint() internal view returns (uint) {
        return uint(uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender))) % 100);
    }

    function compareString(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}