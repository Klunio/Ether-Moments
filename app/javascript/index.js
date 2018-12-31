// Import jquery
import jQuery from "jquery";
window.$ = window.jQuery = jQuery;
// Import bootstrap
import "bootstrap";

// Import the scss for full app (webpack will package it)
import "../app.scss";
// Import the page's CSS. Webpack will know what to do with it.
// Import libraries we need.
import { default as Web3 } from 'web3';
import { default as contract } from 'truffle-contract'

import user_artifacts from "../../build/contracts/User.json"
import moment_artifacts from "../../build/contracts/Moment.json"

const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI('localhost', '9091');

// 需要降级到@0.20.6 神经病吗??搞了我一个早上
window.web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));
// console.log(web3.eth.accounts);

var User = contract(user_artifacts);  //  加载User合约
var Moment = contract(moment_artifacts);  //  加载Moment合约

User.setProvider(web3.currentProvider);
Moment.setProvider(web3.currentProvider);

var accounts;
var account;
window.App = {
    getUsers: function() {
        var self = this;
        var instanceUsed;
        User.deployed().then(function(contractInstance) {
            instanceUsed = contractInstance;
            return instanceUsed.getUserCount.call();
        }).then(function(userCount) {
            userCount = userCount.toNumber();
            console.log('User count', userCount);
            var rowCount = 0;
            var usersDiv = $('#users-div');
            var currentRow;
            for (var i = 0; i < userCount; i++) {
                var userCardId = 'user-card-' + i;
                if (i % 4 == 0) {
                    var currentRowId = 'user-row-' + rowCount;
                    var userRowTemplate = '<div class="row" id="' + currentRowId + '"></div>';
                    usersDiv.append(userRowTemplate);
                    currentRow = $('#' + currentRowId);
                    rowCount++;
                }
                var userTemplate = `
          <div class="col-lg-3 mt-1 mb-1" id="` + userCardId + `">
            <div class="card bg-gradient-primary text-white card-profile p-1">
              <div class="card-body">
                <h5 class="card-title"></h5>
                <h6 class="card-subtitle mb-2"></h6>
                <p class="card-text"></p>        
                <p class="eth-address m-0 p-0">
                  <span class="card-eth-address"></span>
                </p>
              </div>
            </div>
          </div>`;
                currentRow.append(userTemplate);
            }
            console.log("getting users...");
            for (var i = 0; i < userCount; i++) {
                self.getAUser(instanceUsed, i);
            }
        });
    },
    getAUser: function(instance, i) {
        var instanceUsed = instance;
        var username;
        var ipfsHash;
        var address;
        var userCardId = 'user-card-' + i;

        return instanceUsed.getUsernameByIndex.call(i)
            .then(function(_username) {
                console.log('username', username = web3.toAscii(_username), i);
                $('#' + userCardId).find('.card-title').text(username);
                return instanceUsed.getIpfsHashByIndex.call(i);
            }).then(function(_ipfsHash) {
                console.log('ipfsHash:', ipfsHash = web3.toAscii(_ipfsHash), i);
                if (ipfsHash != 'not-available') {
                    var url = 'http://ipfs.io/ipfs/' + ipfsHash;
                    console.log('getting user info from', url);
                    $.getJSON(url, function(userJson){
                      console.log('got user info from ipfs', userJson);
                      $('#' + userCardId).find('.card-subtitle').text(userJson.title);
                      $('#' + userCardId).find('.card-text').text(userJson.intro);
                    });
                }
                return instanceUsed.getAddressByIndex(i);

            }).then(function(_address) {
                console.log('address: ', address = _address, i);
                $('#' + userCardId).find('.card-eth-address').text(address);
                return true;
            }).catch(function(e) {
                console.log('error getting user #', i, ':', e);
            });
    },
    start: function() {
        ipfs.id(function(err, res){
          if (err) throw err
          console.log("Connected to IPFS node!", res.id, res.agentVersion, res.protocolVersion);
        });

        var self = this;
        // 初始化
        web3.eth.getAccounts(function(err, accs) {
            if (err != null) {
                alert("There was an error fetching your accounts.");
                return;
            }
            if (accs.length == 0) {
                alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
                return;
            }
            accounts = accs;
            account = accounts[0];

            var ethAddressIput = $('#sign-up-eth-address').val(accounts[0]);

            // trigger create user when sign up is clicked
            var signUpButton = $('#sign-up-button').click(function() {
                self.createUser();
                return false;
            });

            // populate users
            self.getUsers();
        });
    },
    createUser: function() {
        var username = $('#sign-up-username').val();
        var title = $('#sign-up-title').val();
        var intro = $('#sign-up-intro').val();

        var ipfsHash = '';
        // var ipfsHash = 'not-available';

        console.log('creating user on ipfs for', username);

        var userJson = {
          username:username,
          title:title,
          intro: intro
        };

        ipfs.add([Buffer.from(JSON.stringify(userJson))], function(err, res){
          if (err) {throw err}
          ipfsHash = res[0].hash

          console.log('creating user on eth for', username, title, intro, ipfsHash);

          User_instance.createUser(username, ipfsHash, {gas: 200000, from:web3.eth.accounts[0]})
          .then(success=>{
            if (success) {
              console.log('created user',username ,' on ethereum!');
            }else {
              console.log('error creating user on ethereum');
            }
          })
          .catch(e=>{
            console.log('error creating user:', username, ':', e);
          });
        });
    }
};
window.addEventListener('load', function() {

    User.deployed().then(i=>{
      window.User_instance = i;
      Moment.deployed().then(k=>{
        window.Moment_instance = k;
        User_instance.setMomAddress(Moment_instance.address,{from:web3.eth.accounts[0]});
      });
    });

    App.start();

});