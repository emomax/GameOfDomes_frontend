var LOBBY_ROOM_NAME = "The Lobby";
var USERVAR_COUNTRY = "country";
var USERVAR_RANKING = "rank";

var sfs = null;
var currentGameStarted = false;
var invitationsQueue = [];
var currentInvitation = null;


function init() {
	console.log("Application started");
	
	
	// Create configuration object
	var config = {};
	config.host = "192.168.1.64";
	config.port = 8888;
	config.zone = "BasicExamples";
	config.debug = true;
	
	
	// Create SmartFox client instance
	sfs = new SmartFox(config);
	
	
	// Add event listeners
	sfs.addEventListener(SFS2X.SFSEvent.CONNECTION, onConnection, this);
	sfs.addEventListener(SFS2X.SFSEvent.LOGIN, onLogin, this);
	sfs.addEventListener(SFS2X.SFSEvent.ROOM_JOIN, onRoomJoin, this);
	
	sfs.connect();
	
}

function onConnection(event) {
	if (event.success) 	{
		console.log("Connected to SmartFoxServer 2X!\nAttempting to login as DomeClient..");
		
		var uName = "DomeClient";	
		var isSent = sfs.send(new SFS2X.Requests.System.LoginRequest(uName));
	
	}
	else {
		var error = "Connection failed: " + (event.errorMessage ? event.errorMessage + " (code " + event.errorCode + ")" : "Is the server running at all?");
		log(error);
	}
}

function onLogin(event) {
	console.log("Logged in!\nAttempting to join room 'The Lobby'");
	
	sfs.send(new SFS2X.Requests.System.JoinRoomRequest("The Lobby"));
}


function onRoomJoin(event) {
	console.log("Joined room The Lobby!");
}

var timeout;

this.onButtonClick = function(e) {
	timeout = setInterval(function() {
		console.log("Button clicked!\nAttempt to rotate ship.");
		
		var x = -1;
		var y = 0;
		var thrust = 0;
		
		var obj = {};
			obj.rotX = x;
			obj.rotY = y;
			obj.thrust = thrust;
		
		sfs.send( new SFS2X.Requests.System.ExtensionRequest("RequestTransform", obj, sfs.lastJoinedRoom));	
	}, 20);
	
	return false;
}

this.onButtonUp = function(e) {
	clearInterval(timeout);
	return false;
}
















