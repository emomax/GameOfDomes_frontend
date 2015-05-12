var LOBBY_ROOM_NAME = "The Lobby";
var USERVAR_COUNTRY = "country";
var USERVAR_RANKING = "rank";

var sfs = null;
var currentGameStarted = false;
var invitationsQueue = [];
var currentInvitation = null;

var role = '';


function init() {
	console.log("Application started");
	
	// Create configuration object
	var config = {};
	config.host = "192.168.1.64";//"85.228.182.184";//
	config.port = 8888;
	config.zone = "BasicExamples";
	config.debug = true;
	
	// Create SmartFox client instance
	sfs = new SmartFox(config);
	
	// Add event listeners
	sfs.addEventListener(SFS2X.SFSEvent.CONNECTION, onConnection, this);
	sfs.addEventListener(SFS2X.SFSEvent.LOGIN, onLogin, this);
	//sfs.addEventListener(SFS2X.SFSEvent.ROOM_JOIN, onRoomJoin, this);
	
	// Event listeners to implementation
	//sfs.addEventListener(SFS2X.SFSEvent.)
	

	sfs.connect();
}

function onConnection(event) {
	if (event.success) 	{
		console.log("Connected to SmartFoxServer 2X!\nAttempting to login as DomeClient..");
	
	}
	else {
		var error = "Connection failed: " + (event.errorMessage ? event.errorMessage + " (code " + event.errorCode + ")" : "Is the server running at all?");
		log(error);
	}
}

function onLogin(event) {
	console.log("Logged in!");
	
	document.getElementById('mainView').style.display = 'none';
	document.getElementById('roleView').style.display = 'inline';
	
	//sfs.send(new SFS2X.Requests.System.JoinRoomRequest("The Lobby"));
}


function onRoomJoin(event) {
	alert('Successfully logged in!');
	console.log("Joined room The Lobby!");
	document.getElementById('mainView').style.display = 'none';
	document.getElementById('roleView').style.display = 'inline';
	window.scrollTo(1, 0);
}

var timeoutUp, timeoutDown, timeoutLeft, timeoutRight, timeoutThrust, timeoutRot;
var originX, originY;
var inputRotX, inputRotY;
var touchingCanvas = false;
var img = new Image();
img.src = 'images/joystick.png';

this.onButtonClick = function(e) {
	e.preventDefault();
	
	console.log(e.target.id);
	
	switch (e.target.id) {
		case 'pilotCanvas': 
		
			var canvas = document.getElementById('pilotCanvas');
			var ctx = canvas.getContext('2d');
			
			var _x = e.targetTouches[0].pageX- canvas.getBoundingClientRect().left;//e.clientX - canvas.getBoundingClientRect().left;//
			var _y = e.targetTouches[0].pageY - canvas.getBoundingClientRect().top;// e.clientY - canvas.getBoundingClientRect().top;//targetTouches[0].pageY;
				
			inputRotY = (originY - _y) / (canvas.height / 2);
			inputRotX =  (_x - originX) / (canvas.width / 2);
			
			/*
			// Deprecated test to see which values to pass,
			// parsing the sent value from float to hexadecimal
			
			var fadeValue = Math.sqrt(inputRotY * inputRotY + inputRotX * inputRotX);
			if (fadeValue > 1) fadeValue = 0.9999;
			
				
			// Draw something that looks 'ok'
			var col = floatToHexa(fadeValue * 0.4);			
			*/
			
			col = "#333";
			ctx.rect(0,0,canvas.width, canvas.height);			
			ctx.fillStyle = col;//'#000';
			ctx.fill();
					
			ctx.beginPath();
			ctx.moveTo(originX, originY);
			ctx.lineTo(_x, _y);
			ctx.stroke();
			
			ctx.drawImage(img, _x - img.height/2, _y - img.height/2);
			
			if (_y > canvas.height || _x > canvas.width) break;
			
			
			// handle possible infinity cases
			
			
			if (!touchingCanvas) {
				touchingCanvas = true;
				
				timeoutRot = setInterval(function() {
					e.preventDefault();
					
							
					if (inputRotY > 1) inputRotY = 0.99;
					if (inputRotX > 1) inputRotX = 0.99;
					if (inputRotY < -1) inputRotY = -0.99;
					if (inputRotX < -1) inputRotX = -0.99;
					if (inputRotX == 0) inputRotX = 0.0001;
					if (inputRotY == 0) inputRotY = 0.0001;
					
					var obj = {};
						obj.inputRotY = inputRotY; // inverted due to axis orientation (-1);
						obj.inputRotX = inputRotX; 
						
					if (role == 'pilot') {
						obj.inputForward = false;
						obj.inputBackward = false;
						sendItem("PilotControlEvent", obj);
					} else {
						obj.isFiring = false;
						sendItem("GunnerControlEvent", obj);
						
					}
					
				}, 20);
			}
			//alert('touching: (' + _x + ", " + _y + ")");
			break;
						
		case 'thrustAndFire':
			timeoutThrust = setInterval(function() {
				//e.target.style.background = '#0000ff';
				if (role=='pilot')
					document.getElementById('thrustAndFire').style.backgroundImage = "url('images/forward.png')";
				else
					document.getElementById('thrustAndFire').style.backgroundImage = "url('images/fire.png')"; 
					
				
				var obj = {};
					obj.inputRotY = 0.001;
					obj.inputRotX = 0.001;
					
				if (role == 'pilot') {
					obj.inputForward = true;
					obj.inputBackward = false;
					sendItem("PilotControlEvent", obj);
				} else {
					obj.isFiring = true;
					sendItem('GunnerControlEvent', obj);
				}
				
			}, 20);
			break;
			
		default: 
			e.preventDefault();
			break;
	}

	return false;
}

var selected = false;

this.onButtonUp = function(e) {
	
	var obj = {};
	switch (e.target.id) {
		
		case 'engineer':
				if (!selected) {
					setSelected('engineer');
					selected = true;
					obj.selectedRole = 'Engineer';
					sendItem('ChooseClassHandler', obj);
				}
				else {
					document.getElementById('roleView').style.display = 'none';
					document.getElementById('engineerView').style.display = 'inline';
					window.scrollTo(1, 0);
				}		
				break;
		case 'pilot':
				if (!selected) {
					setSelected('pilot');
					selected = true;
					obj.selectedRole = 'Pilot';
					sendItem('ChooseClassHandler', obj);
				}
				else {
					document.getElementById('roleView').style.display = 'none';
					document.getElementById('pilotView').style.display = 'inline';
					
					var container = document.getElementById('pilotContainer');
					var cs = getComputedStyle(container);
					
					var width = parseInt(cs.getPropertyValue('width'), 10);
					var height = parseInt(cs.getPropertyValue('height'), 10);
					
					var canvas = document.getElementById('pilotCanvas');
					var ctx = canvas.getContext('2d');
					
					canvas.width = width;
					canvas.height = height;
					
					originX = width / 2;
					originY = height / 2;
					
					ctx.rect(0,0,width, height);
					ctx.fillStyle='#000';
					ctx.fill();
			
					ctx.drawImage(img, canvas.width / 2 - img.width / 2, canvas.height / 2 - img.height/2);
					
					//canvas.addEventListener('touchstart', onButtonClick);
					canvas.addEventListener('touchmove', onButtonClick);
					canvas.addEventListener('touchend', onButtonUp);
					
					document.getElementById("thrustAndFire").addEventListener("touchstart", onButtonClick);
					document.getElementById("thrustAndFire").addEventListener("touchend", onButtonUp);
					
					alert('Canvas width and height: (' + width + ", " + height + ")");
					document.getElementById('thrustAndFire').style.backgroundImage = "url('images/forward_pressed.png')";
					window.scrollTo(1, 0);
				}
				break;
		case 'gunner':
				if (!selected) {
					setSelected('gunner');
					selected = true;
					obj.selectedRole = 'Gunner';
					sendItem('ChooseClassHandler', obj);
				}
				else {
					document.getElementById('roleView').style.display = 'none';
					document.getElementById('pilotView').style.display = 'inline';
										
					var container = document.getElementById('pilotContainer');
					var cs = getComputedStyle(container);
					
					var width = parseInt(cs.getPropertyValue('width'), 10);
					var height = parseInt(cs.getPropertyValue('height'), 10);
					
					var canvas = document.getElementById('pilotCanvas');
					var ctx = canvas.getContext('2d');
					
					canvas.width = width;
					canvas.height = height;
					
					originX = width / 2;
					originY = height / 2;
					
					ctx.rect(0,0,width, height);
					ctx.fillStyle='#333';
					ctx.fill();
					
					
					ctx.drawImage(img, canvas.width / 2 - img.width / 2, canvas.height / 2 - img.height/2);
					
					//canvas.addEventListener('touchstart', onButtonClick);
					canvas.addEventListener('touchmove', onButtonClick);
					canvas.addEventListener('touchend', onButtonUp);
					
					document.getElementById("thrustAndFire").addEventListener("touchstart", onButtonClick);
					document.getElementById("thrustAndFire").addEventListener("touchend", onButtonUp);
					
					alert('Canvas width and height: (' + width + ", " + height + ")");
					document.getElementById('thrustAndFire').style.backgroundImage = "url('images/fire_pressed.png')";
					window.scrollTo(1, 0);
				}
			break;
		
		case 'thrustAndFire':			
			if (role=='pilot')
				document.getElementById('thrustAndFire').style.backgroundImage = "url('images/forward_pressed.png')";
			else 
				document.getElementById('thrustAndFire').style.backgroundImage = "url('images/fire_pressed.png')";
				
			clearInterval(timeoutThrust);
			break;
			
		case 'pilotCanvas':
			clearInterval(timeoutRot);
			touchingCanvas = false;
			
			var canvas = document.getElementById('pilotCanvas');
			var ctx = canvas.getContext('2d');
				
			// Draw something that looks 'ok'
			ctx.rect(0,0,canvas.width, canvas.height);
			ctx.fillStyle='#333';
			ctx.fill();
			
			
			ctx.drawImage(img, canvas.width / 2 - img.width / 2, canvas.height / 2 - img.height/2);
			break;
			
		default:
			console.log('Unknown item unpressed..');
			//e.target.style.background='red';
			break;
	}
	
	return false;
}

this.attemptLogin = function(e) {
	var userName = document.getElementById("userName");
	
	if (/[a-zA-Z]{3,}/.test(userName.value)) {		
		var uName = userName.value;	
		var isSent = sfs.send(new SFS2X.Requests.System.LoginRequest(uName));
	} else {
		var uName = getNewName();
		alert('Sorry, your username is too short!');
		alert ('.. so we gave you a another nickname: \n' + uName);
		
		var isSent = sfs.send(new SFS2X.Requests.System.LoginRequest(uName));
		//document.getElementById("userName").value = "";
	}
	
}

// NETWORK HANDLING

function sendItem(ext, obj) {	
	sfs.send( new SFS2X.Requests.System.ExtensionRequest(ext, obj));	
}

// UTILS

function makeId() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function setSelected(_role) {
	console.log('setSelected called!');
	document.getElementById('engineer').style.backgroundImage = "url('images/engi_taken2.png')";
	document.getElementById('gunner').style.backgroundImage = "url('images/gunner_taken2.png')";
	document.getElementById('pilot').style.backgroundImage = "url('images/pilot_taken2.png')";
	
	role = _role;
	
	switch(_role) {
		case 'engineer':
			console.log('Engineer chosen!');
			document.getElementById('engineer').style.backgroundImage = "url('images/engi_chosen2.png')";
			break;
		case 'gunner':
			console.log('Gunner chosen!');
			document.getElementById('gunner').style.backgroundImage = "url('images/gunner_chosen2.png')";
			break;
		case 'pilot':
			console.log('Pilot chosen!');
			document.getElementById('pilot').style.backgroundImage = "url('images/pilot_chosen2.png')";			
			break;
		default:
			break;
	}
}

function floatToHexa(val) {
	var hexaValues = "0123456789abcdef";
	var toReturn = "#";
	for (var i=0; i < 3; i++) {
		toReturn += hexaValues[Math.floor(val*hexaValues.length)];
	}
	
	return toReturn;
}

function getNewName() {
	var firstnames = ["Jessie", "Drax", "Star-lord", "Mario", "Peach", "Piggy", "Max", "Torsten", "Henrietta", "Bock"];
	var surnames = [" the Formidable", " the Relinquisher", " of Doom", " the Domebringer", " the Destroyer", " of Many Treats", " of Self-Disrespect"];
	
	return firstnames[Math.floor(Math.random() * firstnames.length)] + surnames[Math.floor(Math.random() * surnames.length)];	
}








