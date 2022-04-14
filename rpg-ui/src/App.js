import './App.css';
import RpgArtifact from "./contracts/Rpg/Rpg.json";
import contractAddress from "./contracts/Rpg/contract-address.json";
import React from 'react';

import Web3 from 'web3';

import { Grid, Button, Alert, Stack } from '@mui/material';

class Boss {
  bName = "Loading Boss...";
  hp = "Loading Boss...";
  level = "Loading Boss...";
  image = "Loading Boss...";
}

class PlayerStat {
  cName = "Loading Stats...";
  hp = "Loading Stats...";
  lp = "Loading Stats...";
  lv = "Loading Stats..."

  toString() {
    return JSON.stringify({name: this.cName, health_point: this.hp, luckiness: this.lp, level: this.lv});
  }
}

class App extends React.Component {
  state = {
    instructions: null,
    rpg: null,
    currentBoss: null,
    actions: [],
    pollingBossCount: 0,
    playerStats: {},
    gprToken: 0,
    players: [],
    isEndGame: false,
    loading: false
  }

  rpg = () => this.state.rpg;
  setInstructions = (i) => this.setState({instructions: i});

  web3Payload = () => {
    return { from: window.ethereum.selectedAddress };
  }

  web3PayloadWithGas = async () => {
    const gas = await this.rpg().methods.joinGame().estimateGas();
    return {
      from: window.ethereum.selectedAddress,
      gas: 300000,
      gasPrice: '1000000'
    };
  }

  componentDidMount() {
    this.checkMetamask();

    let web3 = new Web3("http://127.0.0.1:8545");
    let rpg = new web3.eth.Contract(RpgArtifact.abi, contractAddress.Address);

    this.setState({rpg: rpg});
    this.setCurrentBoss(rpg);
    this.getPlayerStats(rpg);
    this.getPlayerBalance(rpg);
    this.listPlayers(rpg);

    this.bossPoll = setInterval(this._setCurrentBoss, 1000);
    this.playerPoll = setInterval(this._listPlayers, 5000);
  }

  componentWillUnmount() {
    clearInterval(this.bossPoll);
    clearInterval(this.playerPoll);
  }

  checkMetamask = () => {
    this.setState({instructions: null});

    if (typeof window.ethereum == 'undefined') {
      this.setState({instructions: "You need to install Metamask in order to play the game."});
      return false;
    }

    if (window.ethereum.selectedAddress == null) {
      this.setState({instructions: "You need to connect to Metamask in order to play the game."});
      return false;
    }

    return true;
  }

  connect = async () => {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    this.checkMetamask();
  }

  joinGame = async () => {
    try {
      await this.rpg().methods.joinGame().send(await this.web3PayloadWithGas());
      this._getPlayerStats();

    } catch (err) {
      console.log("join game: ", err);
      alert("Fail to join game, E:", err.message);
    }
  }

  setCurrentBoss = async (web3) => {
    if (this.state.pollingBossCount < 0) { return; }
    if (this.state.pollingBossCount >= 10000) {
      this.setInstructions("Running for too long, please refresh browser.");
      return;
    }

    try {
      let _b = await web3.methods.getCurrentBoss().call();

      if (_b[3] == 0) {
        this.setState({currentBoss: null, isEndGame: true});
        return;
      }

      let b = new Boss();
      b.bName = _b[0];
      b.hp = _b[1];
      b.level = _b[2];
      b.image = "boss_" + _b[0].toLowerCase() + ".png";

      this.setState({currentBoss: b, pollingBossCount: this.state.pollingBossCount++});
    } catch(err) {
      console.log("An error occured", err)
      this.setState({pollingBossCount: -1});
      return
    }
  }

  _setCurrentBoss = () => {
    this.setCurrentBoss(this.rpg());
  }

  listPlayers = async (web3) => {
    try {
      const res = await web3.methods.listPlayerAddresses().call();
      this.setState({players: res});
    } catch (err) {
      console.log("Unable to fetch player, E:", err);
    }
  }

  _listPlayers = () => {
    this.listPlayers(this.rpg());
  }

  getPlayerStats = async (web3) => {
    try {
      const res = await web3.methods.getPlayer().call(this.web3Payload());
      let s = new PlayerStat();
      s.cName = res[0];
      s.hp = parseInt(res[1]);
      s.lp = parseInt(res[2]);
      s.lv = parseInt(res[3]);

      this.setState({playerStats: s});
    } catch (err) {
      console.log(err);
    }
  }

  _getPlayerStats = () => {
    this.getPlayerStats(this.rpg());
  }

  getPlayerBalance = async (web3) => {
    try {
      const res = await web3.methods.getPlayerBalance().call(this.web3Payload());
      this.setState({gprToken: res});
    } catch (err) {
      console.log(err);
    }
  }

  _getPlayerBalance = () => {
    this.getPlayerBalance(this.rpg());
  }

  // push to state
  pushAction = (e) => {
    let a = this.state.actions;
    a.push(e.target.value.toLowerCase());
    this.setState({actions: a});
  }

  // remove from queue
  removeActionFromQueue = (e) => {
    let a = this.state.actions;
    const index = e.target.value;
    a.splice(index, 1);
    this.setState({actions: a});
  }

  sendActions = async () => {
    let actions = this.state.actions;
    try {
      this.setState({loading: true});
      const a = await this.rpg().methods.applyActions(actions).send(await this.web3PayloadWithGas());
      console.log(a);
    } catch (err) {
      alert('action not applied, E:', err.message);
    } finally {
      this._getPlayerStats();
      this._getPlayerBalance();
      this.setState({actions: []});
      this.setState({loading: false});
    }
  }

  mapActionTitle = (a) => {
    switch(a) {
      case "fight":
        return "Fix";
      case "run":
        return "Ignore";
      case "heal":
        return "Rest";
      default:
        return "";
    }
  }

  mapActionColor = (a) => {
    switch(a) {
      case "fight":
        return "success";
      case "run":
        return "error";
      case "heal":
        return "primary";
      default:
        return "";
    }
  }

  render() {
    return (
      <Grid container className='App'>
        <Grid item container xs={12} className="App-Overlay-Container">
          <div className='App-Overlay'>
            Players List
            {
              this.state.players.map(function(el, i) {
                return <div key={"pl-" + i}>{el}</div>
              })
            }
          </div>
        </Grid>
        {/* header */}
        {
          this.state.instructions == null ? null :
          <Grid item xs={12} className="Instructions">
            <Alert severity="info">{this.state.instructions}</Alert>
          </Grid>
        }

        <Grid item xs={12} className="App-header">
          <Button className="Header-Btn" onClick={this.connect}>Connect</Button>
          <Button className="Header-Btn" onClick={this.joinGame}>Join</Button>
        </Grid>

        <Grid item container xs={12} className="App-Content">
          <Grid item container xs={10} className="App-Content">
            {/* enemy */}
            {
              this.state.currentBoss == null
                ? this.state.isEndGame
                  ? <Grid>Congratulations! You've defeated all the bosses!</Grid>
                  : null
                :
                <Grid item xs={12} visibility={this.state.currentBoss == null ? "hidden" : "visible"}>
                  <div>Level {this.state.currentBoss?.level} {this.state.currentBoss?.bName}</div>
                  <img src={this.state.currentBoss?.image} className="Boss-Img"></img>
                  <div>HP: {this.state.currentBoss?.hp}</div>
                </Grid>
            }
          </Grid>
          <Grid item xs={2}>
            <Stack className="Attack-Queue" direction="column-reverse" justifyContent="flex-end" alignItems="stretch" spacing={1}>
              {
                this.state.actions.map(function(el, i) {
                  return <Button key={"action-" + (i+1)} value={i} color={this.mapActionColor(el)} variant="contained" onClick={e => this.removeActionFromQueue(e)}>{this.mapActionTitle(el)}</Button>
                }, this)
              }
            </Stack>
          </Grid>
        </Grid>

        <Grid item container xs={12} className="App-Bottom">
          {/* actions */}
          {
              this.state.instructions != null ? null :
              <Grid item xs={12}>
                <Button className="Action-Btn" color="success" variant="contained" onClick={e => this.pushAction(e)} value="Fight"> Fix </Button>
                <Button className="Action-Btn" color="error" variant="contained" onClick={e => this.pushAction(e)} value="Run"> Ignore </Button>
                <Button className="Action-Btn" color="primary" variant="contained" onClick={e => this.pushAction(e)} value="Heal"> Rest </Button>
                <Button disabled={this.state.loading} className="Action-Btn" color="warning" variant="contained" onClick={this.sendActions}> Submit </Button>
              </Grid>
            }
            <Grid className="Header-Btn" item xs>player_stat: {this.state.playerStats?.toString()} | Tokens: {this.state.gprToken} GPR</Grid>
        </Grid>
      </Grid>
    );
  }
}

export default App;
