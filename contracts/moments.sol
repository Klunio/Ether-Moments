pragma experimental ABIEncoderV2;
pragma solidity ^0.4.19;

contract Moment{
    bytes [] private moments_ipfs;  // moments from first to end

    mapping(bytes16 => uint[]) private  users_ipfs; // mappint for chain of users' moments
    mapping(uint => bytes16[]) private moments_likes;    // who like this momens
    mapping(bytes16 => uint[]) private users_likes;
    mapping(uint => bytes32[]) private moments_replys; // replys of moment
    
    constructor(Moment) public{
        moments_ipfs.push('not-available');
    }
    
    function getAddress() public view returns(address addr){
        return address(this);
    }

    function initMoment(bytes16 name) public returns(bool success){
        require(users_ipfs[name].length == 0,'The user has been inited');
        users_ipfs[name].push(0);
        users_likes[name].push(0);
        
        return true;
    }
    
    // new moments is posting 
    function postNewMoment(bytes ipfsHash, bytes16 name) public returns(bool success){
        require(users_ipfs[name].length > 0,'The user is no inited');
        moments_ipfs.push(ipfsHash);
        uint index = moments_ipfs.length -1;
        users_ipfs[name].push(index);
        moments_likes[index].push('none');
        // moments_replys[index].push('none');
        return true;
    }

    function getMomentsLikes(uint index) public view returns (bytes16[] users){
        require(index < moments_ipfs.length);
        return moments_likes[index];
    }

    function getMomentsReplys(uint index) public view returns(bytes32[] replys){
        require(index < moments_ipfs.length);
        return moments_replys[index];
    }
    
    function getUserLikes(bytes16 name)public view returns(uint[] indexs){
        require(users_ipfs[name].length > 0);
        return users_likes[name];
    }
    
    function LikeThisMoment(bytes16 name, uint index) public returns(bool success){
        require(index < moments_ipfs.length,'out of range');
		require(users_ipfs[name].length > 0,'The user is no inited');
		users_likes[name].push(index);
        moments_likes[index].push(name);
        return true;
    }

    function replythisMoment(uint index, bytes32 ipfsHash) public returns(bool success){
        require(index < moments_ipfs.length,'out of range');
        moments_replys[index].push(ipfsHash);
        return true;
    }
    
    function UnlikeThisMoment(bytes16 name, uint index) public returns(bool success){
        require(index < moments_ipfs.length,'out of range');
        require(users_ipfs[name].length > 0,'The user is no inited');
        
        uint _index = 0;
        uint len = users_likes[name].length;
        
        // 1.
        for(uint i = 0 ; i < len ; i++){
            if(users_likes[name][i] == index){
                _index = i;
                break;
            }
        }
        for (i = _index; i<len-1; i++) {
            users_likes[name][i] = users_likes[name][i+1];
        }
        delete users_likes[name][len-1];
        users_likes[name].length--;

        
        // 2.
        len = moments_likes[index].length;
        for( i = 0 ; i < len ; i++){
            if(moments_likes[index][i] == name){
                _index = i;
                break;
            }
        }
        for (i = _index; i<len-1; i++) {
            moments_likes[index][i] = moments_likes[index][i+1];
        }
        delete moments_likes[index][len-1];
        moments_likes[index].length--;
        return true;
    }

    
    function getMomentsCount() public view returns(uint count){
        return moments_ipfs.length - 1; // init with 'not-available'
    }
    
    function getUserMomentsCount(bytes16 name) public view returns(uint count){
        require(users_ipfs[name].length > 0,'The user is no inited');
        return users_ipfs[name].length -1 ; // init with 0 
    }
    
    function getMomentsByIndex(uint index) public view returns (bytes ipfsHash){
        require(index < moments_ipfs.length,'out of range');
        return moments_ipfs[index];
    }
    
    function getMomentsByUsername(bytes16 name) public view returns(bytes [] ipfsHashs){
        require(users_ipfs[name].length > 0,'The user is no inited');
        bytes [] memory ipfses = new bytes[](users_ipfs[name].length-1) ;
        for(uint i = 0; i < ipfses.length ; i++){
            ipfses[i] = moments_ipfs[users_ipfs[name][i+1]];
        }
        return ipfses;
    }

    function getUserMomentsIndexByUsername(bytes16 name) public view returns(uint [] indexs){
    	require(users_ipfs[name].length > 0,'The user is no inited');
    	return users_ipfs[name];
    }
    
    
}