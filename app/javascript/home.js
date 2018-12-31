// Import jquery
import jQuery from "jquery";
window.$ = window.jQuery = jQuery;
// Import bootstrap
import "bootstrap";

// Import the scss for full app (webpack will package it)
import { default as Web3 } from 'web3';
import { default as contract } from 'truffle-contract'

// bs58
import {default as bs58} from 'bs58';
window.bs58 = bs58;

import user_artifacts from "../../build/contracts/User.json"
import moment_artifacts from "../../build/contracts/Moment.json"

const ipfsAPI = require('ipfs-api');
window.ipfs = ipfsAPI('localhost', '9091');

window.web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));

var User = contract(user_artifacts);  //  加载User合约
var Moment = contract(moment_artifacts);  //  加载Moment合约

var date = Date();
User.setProvider(web3.currentProvider);
Moment.setProvider(web3.currentProvider);

var username;
var address;
var password;
var Intro;
var Img_ipfs;
var Moment_count;
var User_likes;
var changed = false;


String.prototype.format = function(args)
{
    if (arguments.length > 0)
    {
        var result = this;
        if (arguments.length == 1 && typeof (args) == "object")
        {
            for (var key in args)
            {
                var reg = new RegExp("({" + key + "})", "g");
                result = result.replace(reg, args[key]);
            }
        }
        else
        {
            for (var i = 0; i < arguments.length; i++)
            {
                if (arguments[i] == undefined)
                {
                    return "";
                }
                else
                {
                    var reg = new RegExp("({[" + i + "]})", "g");
                    result = result.replace(reg, arguments[i]);
                }
            }
        }
        return result;
    }
    else
    {
        return this;
    }
}
Array.prototype.range = function ( start,end ){
    var _self = this;
    var length = end - start +1;
    var step = start - 1;
    return Array.apply(null,{length:length}).map(function (v,i){step++;return step;});
}
window.App = {
  ipfsHashToBytes32 : function(ipfs_hash){
    var h = bs58.decode(ipfs_hash).toString('hex').replace(/^1220/, '');
    if (h.length != 64) {
        console.log('invalid ipfs format', ipfs_hash, h);
        return null;
    }
    return '0x' + h;
  },
  bytes32ToIPFSHash : function(hash_hex){
    var buf = new Buffer(hash_hex.replace(/^0x/, '1220'), 'hex')
    return bs58.encode(buf)
  },

  Utf8ArrayToStr : function (array) {
      var out, i, len, c;
      var char2, char3;

      out = "";
      len = array.length;
      i = 0;
      while(i < len) {
      c = array[i++];
      switch(c >> 4)
      { 
      case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
      // 0xxxxxxx
      out += String.fromCharCode(c);
      break;
      case 12: case 13:
      // 110x xxxx 10xx xxxx
      char2 = array[i++];
      out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
      break;
      case 14:
      // 1110 xxxx 10xx xxxx 10xx xxxx
      char2 = array[i++];
      char3 = array[i++];
      out += String.fromCharCode(((c & 0x0F) << 12) |
      ((char2 & 0x3F) << 6) |
      ((char3 & 0x3F) << 0));
      break;
      }
      }

      return out;
  },
  postJsonToipfs: async function(momentJson){
    var ipfsHash;
    await ipfs.add([Buffer.from(JSON.stringify(momentJson))])
    .then(res=>{
      ipfsHash = res[0].hash;
      console.log('success adding to ipfs', momentJson);
    })
    .catch(err=>console.log(err));

    return ipfsHash;
  },
  getUserImage : function(name){
    return new Promise(function(resolve, reject) {
      User_instance.getIpfsHashByUsername(name)
      .then(hex=>{
        var hash = web3.toAscii(hex);
        if (hash == 'not-available') {
          resolve(undefined);
        }else{
          ipfs.get(hash)
          .then(bytes=>{
            bytes = bytes[0].content;
            var content = App.Utf8ArrayToStr(bytes);
            try {
              var img_ipfs = $.parseJSON(content)['img'];
              if (img_ipfs == undefined) { 
                resolve(undefined);
                return;
              }else{
                ipfs.get(img_ipfs)
                .then(data=>{
                  var arrayBufferView = data[0].content;
                  var blob = new Blob( [ arrayBufferView ], { type: "image/jpeg" } );
                  var urlCreator = window.URL || window.webkitURL;
                  var url =  urlCreator.createObjectURL( blob );
                  // console.log(url);
                  resolve(url);
                });
              }
              
            } catch(e) {
              console.log(e);
              reject(e);
            }
            
          })
        }
      })
    });
    
  }
  ,
  AddMoment:async function(jsonstr, userList, Liked){
    var self = this;
    var json = $.parseJSON(jsonstr);

    // 是否已
    if (Liked >= 0) {json['liked'] = 'liked';}

    this.getUserImage(json['user'])
    .then(async img_url => {

      // 头像路径
      // console.log('img url:',img_url);
      if (img_url == undefined) {
        img_url = "../img.jpg";
      }
      json['img'] = img_url;

      // 设置时间
      var time = json['time'].split(' ');
      json['time'] = "{time} {day} {month} {year}"
      .format({
        time: time[4],
        day: time[2],
        month: time[1],
        year: time[3]
      });

      // 喜欢这个moment的用户

      if (userList.length > 1) {
        json['userlike'] = userList.slice(1).map(i=>{return i}).join('，');
      }else{
        json['hasuserlike'] = 'hidden';
      }

      // 加载reply信息

      var reply = await Moment_instance.getMomentsReplys(json['id']);
      console.log('reply number',reply.length);

      function getreply(info, hash){
        return new Promise((resolve, reject)=>{
          ipfs.get(hash).then(data=>{
            var content = data[0].content;
            content = $.parseJSON(content); 
            content['time'] =  content['time'].split(' ').slice(1,5).join('-');
            resolve(content);        
          })
        });
      }

      let promise = reply.map((item, index)=>{
        let info = {};
        var hash = self.bytes32ToIPFSHash(item);
        return getreply(info, hash);
      });

      Promise.all(promise).then((allData)=>{
        var reply_list = allData.map(json=>{
          return `
          <div class="replyBlock">
              <p>{username}：</p>
              <p>{content}</p>
              <p>{time}</p>
          </div>
          `.format(json);
        }).join('');

      json['reply'] = reply_list;


      var MomentDiv = $('div.moments');

      var momentTemplate = `
      <div class="momentblock" id = "{id}">
        <div class="up">
          <img class="pic" src="{img}"/>
          <div class="content">
            <p>{user} <span style="font-weight: 100;font-size: 8">@address {time}</span></p>
            <p>{text}</p>
          </div>
          <button class="button button-like {liked}" id="{id}" onclick="App.likeButton(this);">
                    <i class="fa fa-heart"></i>
                    <span>Like</span>
          </button>
        </div>

        <div class="down ">
          <div class="likelist {hasuserlike}">
          <p>{userlike}<span >  also like this</span></p>
          </div>
            
            <button class="reply-button" id = "{id}" onclick="App.reply(this)">
              <span>reply</span>
            </button>
        </div>
        <div class="reply-area hidden">
            <textarea>
            </textarea>
            <button class="reply-post" id = "{id}" onclick="App.reply_post(this)">
                <span>post</span>
            </button>
        </div>

        <div class="reply">{reply}</div> 
        
      </div>
      `.format(json);

      MomentDiv.append(momentTemplate);

      

      }).catch(err=>{
        console.log(err);
      })




      
    });
    
  },
  load: async function(){
    var url = window.location.href;
    var ispersonal = url.indexOf('=') >= 0;
    // 解析url
    if (ispersonal) { // 访问的是用户主页
      username = decodeURI(url.substr(url.indexOf('=')+1));  // 通过url来获得username
      address = await User_instance.getAddressByUsername(username);
      $('.post').toggleClass('hidden');

    }else{  //访问的是已登入的用户界面
      username = sessionStorage.getItem('username');
      address = sessionStorage.getItem('address');
      password = sessionStorage.getItem('password');
    }


    $('.username').find('p')[0].innerText = username;
    $('.address').find('p')[0].innerText = address;


    // post number

    var postnum = await Moment_instance.getUserMomentsCount(username);
    $('.Post-num').find('p')[1].innerHTML = postnum.toString();

    // 加载Moment 数目
    var count;
    if (ispersonal) {
     count = await Moment_instance.getUserMomentsCount(username);
    }else{
     count = await Moment_instance.getMomentsCount();
    }
    Moment_count = count.toString();
    console.log('moment count:',Moment_count);

    // 加载Intro信息
    Intro = await User_instance.getIpfsHashByUsername(username);
    Intro = web3.toAscii(Intro);
    if (Intro == 'not-available') {
      $('.intro').find('span')[0].innerHTML = 'Just introduce yourself here!';
    }else{
      ipfs.get(Intro)
      .then(bytes=>{
        bytes = bytes[0].content;
        var content = this.Utf8ArrayToStr(bytes);
        // console.log(content);
        Intro = $.parseJSON(content)['intro'];
        $('.intro').find('span')[0].innerHTML = Intro;

        // 加载头像
        Img_ipfs = $.parseJSON(content)['img'];
        ipfs.get(Img_ipfs)
        .then(data=>{
          var arrayBufferView = data[0].content;
          var blob = new Blob( [ arrayBufferView ], { type: "image/jpeg" } );
          var urlCreator = window.URL || window.webkitURL;
          var imageUrl = urlCreator.createObjectURL( blob );

          $('.user_pic > img').attr('src', imageUrl); 

        })
        
      });
    }

    // 加载用户已点赞的moment
    User_likes = await Moment_instance.getUserLikes(username);
    User_likes = User_likes.map(value=>{return value.toNumber()}); // 转为整数

    console.log(User_likes);

    var mom_arr;
    if (ispersonal) {
      mom_arr = await Moment_instance.getUserMomentsIndexByUsername(username);
      mom_arr = mom_arr.map(i=>{return i.toString()}).slice(1);
    }else{
      mom_arr = [].range(1, Moment_count);
    }

    console.log(mom_arr);

    for (let i of mom_arr) {
      var ipfsHash = await Moment_instance.getMomentsByIndex(i);
      if (ipfsHash.length != 94) {
        console.log('Error ipfs Hash!');
        return;
      }
      // 16进制转为string
      ipfsHash = web3.toAscii(ipfsHash);

      // 获得likes 用户信息
      var userList = await Moment_instance.getMomentsLikes(i);
      userList = userList.map(i=>{return web3.toUtf8(i.substr(2))});

      ipfs.get(ipfsHash)
      .then(bytes=>{
        // 得到moment 信息
        bytes = bytes[0].content;
        var content = this.Utf8ArrayToStr(bytes);
        this.AddMoment(content, userList,$.inArray(parseInt(i), User_likes));
      })
      .catch(e=>{
      console.log(e)});
    }
      

  },
  post : async function(){
    var self = this;
    var text = $('input#inp')[0].value;
    var time = date.toLocaleLowerCase();

    var momentJson = {
      id : ++Moment_count,
      text : text,
      user : username,
      time : time
    };

    var ipfsHash = await self.postJsonToipfs(momentJson);
    
    // 先解锁
    try {
      var success = await web3.personal.unlockAccount(address, password)
    } catch(e) {
      console.log(e);
    }

    // 通过Moment合约发布
    console.log('ipfsHash:',ipfsHash);
    Moment_instance.postNewMoment(ipfsHash, username, {gas:2000000, from: address})
    .then(success=>{
      if (success) {
        console.log('post success on ethereum!');
        // 刷新页面
        window.location.reload()
      }else {
        console.log('error posting');
      }
    })
    .catch(e=>{
      console.log(e);
    })

  },
  updateUser: async function(){
    var self = this;
    var content = $('.intro-edit')[0].value;
    if (content == Intro && changed == false) { // Intro未修改且头像未变
      $('#cancel').click();
      return;
    }else{ // 发生了变化，需要update

      // 将图片存入ipfs
      if (changed == false) { // 不需要更换头像
        var json = {
            img: Img_ipfs,
            intro : content
          };

          console.log(json);

          var ipfsHash = await self.postJsonToipfs(json);

          // 先解锁
          try {
            var success = await web3.personal.unlockAccount(address, password)
          } catch(e) {
            console.log(e);
          }

          // 通过User更改用户信息
          console.log('ipfsHash:',ipfsHash);
          User_instance.updateUser(ipfsHash, {gas:200000, from: address})
          .then(success=>{
            if (success) {
              console.log('success in updatint user information!');
              window.location.reload();
            }else {
              console.log('error updating')
            }
          })
          .catch(e=>{
            console.log(e);
          });

      }else { // 需要更换头像
        let saveImageOnIpfs = (reader) => {
        return new Promise(function(resolve, reject) {
          const buffer = Buffer.from(reader.result);
          ipfs.add(buffer).then((response) => {
            console.log(response)
            resolve(response[0].hash);
          }).catch((err) => {
            console.error(err)
            reject(err);
          })
        })
      };

      // 读到input中的文件
      var img_ipfs;
      var img_file = $('#avatarSlect')[0].files[0];

      var reader = new FileReader();
      
      reader.readAsArrayBuffer(img_file);
      
      reader.onloadend = async function(e){
              console.log(reader);
              saveImageOnIpfs(reader).then(async ipfsHash=>{
                console.log('img ipfs hash:', ipfsHash);
                img_ipfs = ipfsHash;

                var json = {
                  img: img_ipfs,
                  intro : content
                };

                console.log(json);

                var ipfsHash = await self.postJsonToipfs(json);

                // 先解锁
                try {
                  var success = await web3.personal.unlockAccount(address, password)
                } catch(e) {
                  console.log(e);
                }

                // 通过User更改用户信息
                console.log('ipfsHash:',ipfsHash);
                User_instance.updateUser(ipfsHash, {gas:200000, from: address})
                .then(success=>{
                  if (success) {
                    console.log('success in updatint user information!');
                    window.location.reload();
                  }else {
                    console.log('error updating')
                  }
                })
                .catch(e=>{
                  console.log(e);
                });


              });


            };
      }
      
      
       

      
    }
  },
  // 点击了like按钮
  likeButton: function(button){
    var id = button.id;
    if ($.inArray('liked', button.classList) >= 0) { // 已经被喜欢
      // 那就取消喜欢
      Moment_instance.UnlikeThisMoment(username, id,{gas:200000 , from: address})
      .then(success=>{
        if (success) {
          console.log('success :',username,'likes ',id);
        }else{
          console.log('error in like');
        }
      });
    }else{
      // 那就喜欢吧
      Moment_instance.LikeThisMoment(username, id,{gas:200000 , from: address})
      .then(success=>{
        if (success) {
          console.log('success :',username,'likes ',id);
        }else{
          console.log('error in like');
        }
      });
    }
    
    // 更换样式
    button.classList.toggle('liked');

  },
  // 点击了回复
  reply : function(button){
    console.log(button);
    var id = button.id;
    $('div#' +id).find('.reply-area').toggleClass('hidden');
  },

  reply_post:async function(button){
    var id = button.id;
    var self = this;
    var content = $('div#' +id).find('textarea').val();
    if (content.trim()) { // 不为空
      var json={
        time: date.toLocaleLowerCase(),
        username: username,
        content:content
      }
      ipfs.add([Buffer.from(JSON.stringify(json))],async function(err, res){
        if (err) {throw err}
        var ipfsHash = res[0].hash
        var byte32 = self.ipfsHashToBytes32(ipfsHash);

        console.log(ipfsHash);

        // 先解锁
        try {
          var success = await web3.personal.unlockAccount(address, password)
        } catch(e) {
          console.log(e);
        }

        Moment_instance.replythisMoment(id, byte32, {gas:200000, from: address})
        .then(success=>{
          console.log('success in replying');
        })
        .catch(e=>{
          console.log(e);
        })
      });
    }
  },


  start : function(){


    // 初始化内容
    var self = this;
    self.load();

    // post按钮事件

    var postButton = $('.btn.btn5').click(function(){
      self.post();
      return true;
    });

    // edit 按钮事件
    // 1 - edit
    var editButton_1 = $('#edit').click(function(){
      
      $('.intro').find('span')[0].classList.add('hidden');

      // 显示输入框
      var input = $('.intro-edit');
      input.toggleClass('hidden');
      input.value = Intro;

      // 可以上传头像 
      $('.user_pic > span').toggleClass('collapse');

      // 按钮显示 与 隐藏
      $('.edit').toggleClass('hidden');
      // $('.edit')[1].toggleClass('hidden');
      // $('.edit')[2].toggleClass('hidden');
      return true;
    });

    // 2 - cancel
    var editButton_2 = $('#cancel').click(function(){

      $('.intro').find('span').toggleClass('hidden');

      $('.intro-edit').toggleClass('hidden');

      $('.user_pic > span').toggleClass('collapse');


      $('.edit').toggleClass('hidden');
      // $('.edit')[1].toggleClass('hidden');
      // $('.edit')[2].toggleClass('hidden');

      if (change == true) {   //  更换了头像
        // 把头像换回来
        change = false;
      }
      return true;

    });

    // 3 - confirm
    var editButton_3 = $('#confirm').click(function(){
      self.updateUser();
      return true;
    });


    // input pic
    $('#avatarSlect').on('change',function(){

      var file = this.files[0];
      var filePath = $(this).val(),
      fileFormat = filePath.substring(filePath.lastIndexOf(".")).toLowerCase(),
      src = window.URL.createObjectURL(file); //转成可以在本地预览的格式


      // 展示图片
      if(!fileFormat.match(/.png|.jpg|.jpeg/)) {
        error_prompt_alert('上传错误,文件格式必须为：png/jpg/jpeg');
        return;
      }else{
        console.log('img src : ',src);
         $('.user_pic > img').attr('src', src); 
      }

      // 资料发生变化
      changed = true;
    });
      
  }
  
 };

window.addEventListener('load', function(){

  // 先加载合约
  User.deployed().then(i=>{
      window.User_instance = i;
      Moment.deployed().then(k=>{
        window.Moment_instance = k;
        User_instance.setMomAddress(Moment_instance.address,{from:web3.eth.accounts[0]});

        App.start();

      });
    });
});
