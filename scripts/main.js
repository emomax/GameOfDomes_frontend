//Game of Domes scripts

var LOBBY_ROOM_NAME = "The Lobby";

var sfs = null;
var currentGameStarted = false;
var invitationsQueue = [];
var currentInvitation = null;

var role = '';
var roleSet = false;

//total power for the engineer
var maxPower = 1.0;

//local variables to store the input untill it's sent
var isFiring = false;
var isThrusting = false;

var rotX = 0;
var rotY = 0;

var currentShieldVal = 0;
var currentTurretVal = 0;
var currentEngineVal = 0;

var engiTaken = false;
var gunnerTaken = false;
var pilotTaken = false;

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
	sfs.addEventListener(SFS2X.SFSEvent.EXTENSION_RESPONSE, onExtensionResponse, this);
	

	sfs.connect();
}

//server log on connection
function onConnection(event) {
	if (event.success) 	{
		console.log("Connected to SmartFoxServer 2X!\nAttempting to login as DomeClient..");
	}
	else {
		var error = "Connection failed: " + (event.errorMessage ? event.errorMessage + " (code " + event.errorCode + ")" : "Is the server running at all?");
		log(error);
	}
}

//joina room when successfully logged in
function onLogin(event) {
	console.log("Logged in!\n'");
	document.getElementById('mainView').style.display = 'none';
	document.getElementById('roleView').style.display = 'inline';
	window.scrollTo(1, 0);
	
	//sfs.send(new SFS2X.Requests.System.JoinRoomRequest("The Lobby"));
}

//dislpay role view when successfully joined room
function onRoomJoin(event) {
	alert('Successfully logged in!');
	console.log("Joined room The Lobby!");
}

function onExtensionResponse(event) {
	console.log("Got an extension response from server. CMD = " + event.cmd);
	
	var params = event.params;
	
	switch (event.cmd) {
		case "RoleConfirmation":
			if (!params.confirmed) {
				alert ("That role was already taken!");
				role = '';
			} else {
				//alert('Role set to ' + role + '!');
				roleSet = true;
			}
			
			updateRoleAvailability(engiTaken, gunnerTaken, pilotTaken);
			break;
		case "RoleUpdate":
			//alert('event RoleUpdate');
			var engi = params.EngineerTaken;
			var pilot = params.PilotTaken;
			var gunner = params.GunnerTaken;
			
			updateRoleAvailability(engi, gunner, pilot);
			
			break;
		case "GameEvent":
			if (roleSet)
				enterGame();
			break;

		default:
			// probably a server response not concerning us
			break;
		
	}
	
	if (event.cmd == "RoleConfirmation") {
	}	
}

var timeoutUp, timeoutDown, timeoutLeft, timeoutRight, timeoutThrust, timeoutRot;
var originX, originY;
var inputRotX, inputRotY;
var touchingCanvas = false;

//joystick handle
var img = new Image();
img.src = 'images/joystick.png';

//joystick background image
var joyBackImg = new Image();
joyBackImg.src = 'images/emptybutton.png';

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
			
			//set background color (no background)
			col = "#333";
			ctx.rect(0,0,canvas.width, canvas.height);			
			ctx.fillStyle = 'rgba(0,0,0,1)'; 
			ctx.fill();
			
			//draw joystick background
			ctx.drawImage(joyBackImg, 0, 0, canvas.width, canvas.height);
			
			//draw joystick line
			ctx.beginPath();
			ctx.moveTo(originX, originY);
			ctx.lineTo(_x, _y);	
			ctx.lineWidth = 3;
			ctx.strokeStyle = 'rgba(0,0,0,1)';
			ctx.stroke();
			
			//joystick button image
			ctx.drawImage(img, _x - img.height/2, _y - img.height/2, img.width, img.height);

			//break if out of canvas bounds 
			if (_y > canvas.height || _x > canvas.width) break;
			
			//check every 20 milisec for steering input
			if (!touchingCanvas) {
				touchingCanvas = true;
				
				timeoutRot = setInterval(function() {
					
					e.preventDefault();
					
					//prevent int casting problems
					if (inputRotY > 1) inputRotY = 0.99;
					if (inputRotX > 1) inputRotX = 0.99;
					if (inputRotY < -1) inputRotY = -0.99;
					if (inputRotX < -1) inputRotX = -0.99;
					if (inputRotX == 0) inputRotX = 0.0001;
					if (inputRotY == 0) inputRotY = 0.0001;
					
					//store the rotation locally in order to send it later
					rotX = inputRotX;
					rotY = inputRotY;

				}, 20);
			}
			break;
		
		//thrust or fire button is clicked
		case 'thrustAndFire':
		
			//check every 20 milisec for fire/thrust input
			timeoutThrust = setInterval(function() {
				
				//change button visual to indicate press
				if (role=='pilot')
					document.getElementById('thrustAndFire').style.backgroundImage = "url('images/forward.png')";
				else
					document.getElementById('thrustAndFire').style.backgroundImage = "url('images/fire.png')"; 
				
				//register fire/thrust input
				if (role == 'pilot')
					isThrusting = true;
				else
					isFiring = true;
	
			}, 20);
			break;
			
		default: 
			e.preventDefault();
			break;
	}

	return false;
}

//update server every 20 milisec
//timeoutRot = setInterval( sendPilotGunnerValues, 20);
	
function sendPilotGunnerValues() {
	
	//out object
	var obj = {};
	
	//if role is pilot, send rot and thrust
	if(role == 'pilot') {
		obj.inputRotX = rotX;
		obj.inputRotY = rotY;
		obj.inputForward = isThrusting;
		
		sendItem('PilotControlEvent', obj);
	}
	
	//if role is gunner, send rot and fire
	else if(role == 'gunner') {
		obj.inputRotX = rotX;
		obj.inputRotY = rotY;
		obj.isFiring = isFiring;
		
		sendItem('GunnerControlEvent', obj);
	}	
	
	//reset values
	isFiring = false;
	isThrusting = false;
	rotX = 0.0001;
	rotY = 0.0001;
}

//when changing shield slider, update sliders and send new values
function updateShield(val) {

	var powerLeft = maxPower - val;
	
	var newTurret = powerLeft/2;
	var newEngine = powerLeft-newTurret;
	
	setPowerValues(val, newTurret, newEngine);
}

//when changing turret slider, update sliders and send new values
function updateTurret(val) {

	var powerLeft = maxPower - val;
	
	var newShield = powerLeft/2;
	var newEngine = powerLeft-newShield;
	
	setPowerValues(newShield, val, newEngine);
}

//when changing engine slider, update sliders and send new values
function updateEngine(val) {

	var powerLeft = maxPower - val;
	
	var newShield = powerLeft/2;
	var newTurret = powerLeft-newShield;
	
	setPowerValues(newShield, newTurret, val);
}

function setPowerValues(_shield, _turret, _engine){

	//set new values and make sure there aren't any casting conflicts
	if 		(_shield == 1) 	currentShieldVal = 0.999;
	else if (_shield == 0) 	currentShieldVal = 0.001;
	else 					currentShieldVal = _shield;
	
	if 		(_turret == 1)	currentTurretVal = 0.999;			
	else if (_turret == 0) 	currentTurretVal = 0.001;
	else 					currentTurretVal = _turret;
	
	if 		(_engine == 1) 	currentEngineVal = 0.999;
	else if (_engine == 0) 	currentEngineVal = 0.001;
	else 					currentEngineVal = _engine;
	
	//position slider handles correctly
	document.getElementById('shieldSlide').value=_shield;
	document.getElementById('turretSlide').value=_turret;
	document.getElementById('engineSlide').value=_engine;

	//send new values to server
	sendEnginerValues(currentShieldVal, currentTurretVal, currentEngineVal);
}

// send engineer values to server
function sendEnginerValues(_shield, _turret, _engine) {
	
	var obj = {};
	obj.inputShield = parseFloat(_shield);
	obj.inputTurret = parseFloat(_turret);
	obj.inputEngine = parseFloat(_engine);
	
	sendItem('EngineerControlEvent', obj);
}


var selected = false;

this.onButtonUp = function(e) {
	
	var obj = {};
	switch (e.target.id) {
		
		case 'engineer':
				//if (!selected) {
					selected = true;
					obj.selectedRole = 'Engineer';
					sendItem('ChooseClassHandler', obj);
					
					role = 'engineer';
					
					//alert("waiting for confirmation..");
					
					document.getElementById('engineer').removeEventListener('touchend', onButtonUp);
					document.getElementById('gunner').removeEventListener('touchend', onButtonUp);
					document.getElementById('pilot').removeEventListener('touchend', onButtonUp);
			//	}
				break;
		case 'pilot':
				//if (!selected) {
					selected = true;
					obj.selectedRole = 'Pilot';
					sendItem('ChooseClassHandler', obj);
					
					role = 'pilot';
					
					//alert("waiting for confirmation..");
					
					document.getElementById('engineer').removeEventListener('touchend', onButtonUp);
					document.getElementById('gunner').removeEventListener('touchend', onButtonUp);
					document.getElementById('pilot').removeEventListener('touchend', onButtonUp);
			//	}
				break;
		case 'gunner':
			//	if (!selected) {
					selected = true;
					obj.selectedRole = 'Gunner';
					sendItem('ChooseClassHandler', obj);
					
					role = 'gunner';
					
					//alert("waiting for confirmation..");
					
					document.getElementById('engineer').removeEventListener('touchend', onButtonUp);
					document.getElementById('gunner').removeEventListener('touchend', onButtonUp);
					document.getElementById('pilot').removeEventListener('touchend', onButtonUp);
			//	}
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
			ctx.fillStyle='rgba(0,0,0,1)';
			ctx.fill();
			
			//draw joystick background
			ctx.drawImage(joyBackImg, 0, 0, canvas.width, canvas.height);
			
			//draw joystick handle
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
		var isSent = sfs.send(new SFS2X.Requests.System.LoginRequest(uName));
		//document.getElementById("userName").value = "";
	}
	
		alert('Logged in as: ' + uName);
}

// NETWORK HANDLING

function sendItem(ext, obj) {	
	sfs.send( new SFS2X.Requests.System.ExtensionRequest(ext, obj, sfs.lastJoinedRoom));	
}

// UTILS

function makeId() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function updateRoleAvailability(engi, gunner, pilot) {
	document.getElementById('engineer').style.backgroundImage = "url('images/engi_available2.png')";
	document.getElementById('gunner').style.backgroundImage = "url('images/gunner_available2.png')";
	document.getElementById('pilot').style.backgroundImage = "url('images/pilot_available2.png')";
	
	//alert('Update: engiTaken=' + engi + ", gunnerTaken=" + gunner + ", pilotTaken=" + pilot);
	
	// Remove eventlisteners and add those that are available.

	document.getElementById('engineer').removeEventListener('touchend', onButtonUp);
	document.getElementById('gunner').removeEventListener('touchend', onButtonUp);
	document.getElementById('pilot').removeEventListener('touchend', onButtonUp);
	
	engiTaken = engi;
	gunnerTaken = gunner;
	pilotTaken = pilot;
	
	if (engiTaken) {
		if (role == 'engineer' && roleSet)
			document.getElementById('engineer').style.backgroundImage = "url('images/engi_chosen2.png')";		
		else {
			document.getElementById('engineer').style.backgroundImage = "url('images/engi_taken2.png')";					
		}
	}
	else
		document.getElementById('engineer').addEventListener('touchend', onButtonUp);
	
	if (gunnerTaken) {
		if (role == 'gunner' && roleSet)
			document.getElementById('gunner').style.backgroundImage = "url('images/gunner_chosen2.png')";		
		else
			document.getElementById('gunner').style.backgroundImage = "url('images/gunner_taken2.png')";		
	}
	else
		document.getElementById('gunner').addEventListener('touchend', onButtonUp);
	
	if (pilotTaken) {
		if (role == 'pilot' && roleSet)
			document.getElementById('pilot').style.backgroundImage = "url('images/pilot_chosen2.png')";	
		else 
			document.getElementById('pilot').style.backgroundImage = "url('images/pilot_taken2.png')";	
	}
	else
		document.getElementById('pilot').addEventListener('touchend', onButtonUp);
}

function enterGame() {
	alert('Buckle up, game is starting!');
	
	switch (role) {
		case 'engineer':
			document.getElementById('roleView').style.display = 'none';
			document.getElementById('engineerView').style.display = 'inline';
			window.scrollTo(1, 0);
			break;
			
		case 'gunner':
			timeoutRot = setInterval( sendPilotGunnerValues, 20);
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
			ctx.fillStyle='rgba(0,0,0,1)';
			ctx.fill();
			
			//draw joystick background
			ctx.drawImage(joyBackImg, 0, 0, canvas.width, canvas.height);
			
			//draw joystick handle
			ctx.drawImage(img, canvas.width / 2 - img.width / 2, canvas.height / 2 - img.height/2);
			
			//canvas.addEventListener('touchstart', onButtonClick);
			canvas.addEventListener('touchmove', onButtonClick);
			canvas.addEventListener('touchend', onButtonUp);
			
			document.getElementById("thrustAndFire").addEventListener("touchstart", onButtonClick);
			document.getElementById("thrustAndFire").addEventListener("touchend", onButtonUp);
			
			alert('Canvas width and height: (' + width + ", " + height + ")");
			document.getElementById('thrustAndFire').style.backgroundImage = "url('images/fire_pressed.png')";
			window.scrollTo(1, 0);
			break;
			
		case 'pilot':
			timeoutRot = setInterval( sendPilotGunnerValues, 20);
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
			
			//draw joystick background
			ctx.drawImage(joyBackImg, 0, 0, canvas.width, canvas.height);
			
			//draw joystick handle
			ctx.drawImage(img, canvas.width / 2 - img.width / 2, canvas.height / 2 - img.height/2);
			
			//canvas.addEventListener('touchstart', onButtonClick);
			canvas.addEventListener('touchmove', onButtonClick);
			canvas.addEventListener('touchend', onButtonUp);
			
			document.getElementById("thrustAndFire").addEventListener("touchstart", onButtonClick);
			document.getElementById("thrustAndFire").addEventListener("touchend", onButtonUp);
			
			alert('Canvas width and height: (' + width + ", " + height + ")");
			document.getElementById('thrustAndFire').style.backgroundImage = "url('images/forward_pressed.png')";
			window.scrollTo(1, 0);
			break;		
	}
	
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
	var firstnames = ["Jessie", "Drax", "Star-lord", "Mario", "Peach", "Piggy", "Max", "Torsten", "Henrietta", "Bock", "Tucker", "Mommy", "Daddy", "Death", "Herald"];
	var surnames = [" the Formidable", " the Relinquisher", " of Doom", " the Domebringer", " the Destroyer", " of Many Treats", " of Self-Disrespect", " Mc Donald", " of Destiny"];
	
	return firstnames[Math.floor(Math.random() * firstnames.length)] + surnames[Math.floor(Math.random() * surnames.length)];	
}








