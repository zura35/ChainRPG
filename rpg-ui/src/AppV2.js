import './App.css';
import RpgArtifact from "./contracts/RpgV2/RpgV2.json";
import contractAddress from "./contracts/RpgV2/contract-address.json";
import React from 'react';

import Web3 from 'web3';

import { TextField, Grid, Button, Alert, CircularProgress } from '@mui/material';

class PlayerStat {
  n = "Loading Stats...";
  l = "Loading Stats...";
  c = "Loading Stats...";
  cp = "Loading Stats...";

  toString() {
    return JSON.stringify({name: this.n, luckiness: this.l, contribution: this.c});
  }
}

class AppV2 extends React.Component {
  state = {
    instructions: null,
    rpg: null,
    playerStats: {},
    gprToken: 0,
    players: [],
    currentEvent: null,
    options: [],
    inputName: null,
    karma: 0
  }

  rpg = () => this.state.rpg;
  setInstructions = (i) => this.setState({instructions: i});
  
  web3Payload = () => {
    return { from: window.ethereum.selectedAddress };
  }
  
  web3PayloadWithGas = async () => {
    const gas = await this.rpg().methods.joinGame("A").estimateGas();
    return {
      from: window.ethereum.selectedAddress,
      gas: 300000,
      gasPrice: '1000000'
    };
  }

  address = () => window.ethereum.selectedAddress;
  
  componentDidMount() {
    this.checkMetamask();

    let web3 = new Web3("http://127.0.0.1:8545");
    let rpg = new web3.eth.Contract(RpgArtifact.abi, contractAddress.Address);

    this.setState({rpg: rpg});
    this.getPlayerStats(rpg);
    this.getPlayerBalance(rpg);
    this.listPlayers(rpg);
    this.getKarma(rpg);

    this.initCheckpoint = setTimeout(this.initPlayerCheckpoint, 1000);
    this.playerPoll = setInterval(this._listPlayers, 5000);
    this.karmaPoll = setInterval(this._getKarma, 5000);
  }

  componentWillUnmount() {
    clearTimeout(this.initCheckpoint);
    clearInterval(this.playerPoll);
    clearInterval(this.karmaPoll);
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

  setName = (e) => {
    this.setState({inputName: e.target.value});
  }

  joinGame = async () => {
    if ((this.state.inputName == null || this.state.inputName == "")) {
      return alert("Please enter character name before joining.");
    }

    try {
      await this.rpg().methods.joinGame(this.state.inputName).send(await this.web3PayloadWithGas());
      this._getPlayerStats();
      this._getPlayerCheckpoint();

    } catch (err) {
      console.log("join game: ", err);
      alert("Fail to join game, E: " + err.message);
    }
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

  getKarma = async (web3) => {
    const _k = await web3.methods.karma().call(this.web3Payload());
    this.setState({karma: _k});
  }

  _getKarma = () => {
    this.getKarma(this.rpg());
  }

  getPlayerStats = async (web3) => {
    try {
      const res = await web3.methods.players(this.address()).call(this.web3Payload());
      let s = new PlayerStat();
      s.n = res.name;
      s.l = res.luckiness;
      s.c = res.contribution;
      s.cp = res.checkpoint;

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

  initPlayerCheckpoint = () => {
    if (this.state.playerStats.cp == 0) {
      return;
    }
    this._getPlayerCheckpoint(this.rpg());
  }

  getPlayerCheckpoint = async (web3) => {
    try {
      let res = await web3.methods.getEventAndActions().call(await this.web3Payload());
      let event = res[0];
      let options = res[1];
      
      let _actions = options.split(":");
      let actions = []; // to be written to state
      _actions.forEach((el) => {
        let a = el.split("_");
        actions.push({a: a[0], d: a[1]});
      });

      this.setState({currentEvent: event, options: actions});
    } catch (err) {
      alert("cannot get event, E: " + err.message);
    }
  }

  _getPlayerCheckpoint = () => {
    this.getPlayerCheckpoint(this.rpg());
  }

  sendAction = async (e) => {
    try {
      await this.rpg().methods.applyEventAction(e.target.value).send(await this.web3PayloadWithGas());
    } catch (err) {
      alert('action not applied, E:' + err.message);
    } finally {
      this._getPlayerCheckpoint();
      this._getPlayerStats();
      this._getPlayerBalance();
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
          { this.state.playerStats.n == ""
              ? <TextField value={this.state.inputName} onChange={this.setName} hiddenLabel placeholder="Character Name" variant="filled" size="small" className="App-Header-Textfield"></TextField>
              : null
          }
          <Button className="Header-Btn" onClick={this.joinGame}>Join</Button>
          <Button className="Header-Btn" onClick={this._getPlayerCheckpoint}>Load</Button>
        </Grid>

        <Grid item container xs={12} className="App-Content">
          <Grid item container xs={12}>
            {/* event */}
            {
              this.state.currentEvent == null
                ? <Grid item xs={12}> <CircularProgress className="Header-Btn" /> </Grid>
                :   
                <Grid item xs={12} className="Event-Display" visibility={this.state.currentEvent == null ? "hidden" : "visible"}>
                  {this.state.currentEvent}
                </Grid>
            }

            {/* actions */}
            {
              this.state.instructions != null ? null :
              <Grid item xs={12}>
                {
                  this.state.options.map(function(el, i) {
                    return <Button key={"act-" + i} value={el.a} className="Action-Btn" variant="contained" onClick={this.sendAction}> {el.d} </Button>
                  }, this)
                }
              </Grid>
            }
          </Grid>
        </Grid>
        
        <Grid item container xs={12} className="App-Bottom">
          <Grid className="Header-Btn" item xs>player_stat: {this.state.playerStats?.toString()} | Company Profit: {this.state.karma} | Tokens: {this.state.gprToken} GPR</Grid>
        </Grid>
      </Grid>
    );
  }
}

export default AppV2;
