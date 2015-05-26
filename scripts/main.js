//Game of Domes scripts
var sfs = null;

//check if commputer or phone is used
var usingDesktop = false;

var role = '';
var roleSet = false;

//total power for the engineer
var maxPower = 1.0;

//local variables to store the input until it's sent
var isFiring = false;
var isThrusting = false;

var rotX = 0.0001;
var rotY = 0.0001;

var engiTaken = false;
var gunnerTaken = false;
var pilotTaken = false;

//load engineer GUI images
var barFilled = new Image();
barFilled.src = 'images/FullSlideBar.png';

var barEmpty = new Image();
barEmpty.src = 'images/EmptySlideBar.png';

var handle = new Image();
handle.src = 'images/slider.png';

//interval loop variables, and coordinate variables for joystick canvas
var timeoutUp, timeoutDown, timeoutLeft, timeoutRight, timeoutRot;
var originX, originY;
var inputRotX, inputRotY;
var touchingCanvas = false;

//load GUI images for pilot/gunner
var img = new Image();
img.src = 'images/joystick.png';

var joyBackImg = new Image();
joyBackImg.src = 'images/button_shaded.png';

var joyDown = new Image();
joyDown.src = 'images/button_green_withLine.png';


// preload images for role selection

/** ENGINEER PRELOAD IMG */
var engiAvailableImg = new Image(); engiAvailableImg.src = 'images/engi_available2.png';
var engiTakenImg = new Image(); engiTakenImg.src = 'images/engi_taken2.png';
var engiChosenImg = new Image(); engiChosenImg.src = 'images/engi_chosen2.png';

/** PILOT PRELOAD IMG */
var pilotAvailableImg = new Image(); pilotAvailableImg.src = 'images/pilot_available2.png';
var pilotTakenImg = new Image(); pilotTakenImg.src = 'images/pilot_taken2.png';
var pilotChosenImg = new Image(); pilotChosenImg.src = 'images/pilot_chosen2.png';

/** PILOT PRELOAD IMG */
var gunnerAvailableImg = new Image(); gunnerAvailableImg.src = 'images/gunner_available2.png';
var gunnerTakenImg = new Image(); gunnerTakenImg.src = 'images/gunner_taken2.png';
var gunnerChosenImg = new Image(); gunnerChosenImg.src = 'images/gunner_chosen2.png';

//initiate smartfox and add smartfox event listeners
function init() {
	console.log("Application started");
	
	//detect user device
	usingDesktop = (typeof window.orientation == 'undefined');
	
	if(usingDesktop)
		document.getElementById('promptLandscape').style.display = 'none';

	// Create configuration object
	var config = {};
	config.host = "192.168.1.64";//"85.228.182.184";
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

//! Server log on connection
function onConnection(event) {
	if (event.success) 	{
		console.log("Connected to SmartFoxServer 2X!");
	}
	else {
		var error = "Connection failed: " + (event.errorMessage ? event.errorMessage + " (code " + event.errorCode + ")" : "Is the server running at all?");
		log(error);
	}
}

//! Update view upon logging in.
function onLogin(event) {
	console.log("Logged in!\n'");
	document.getElementById('mainView').style.display = 'none';
	document.getElementById('roleView').style.display = 'inline';
	window.scrollTo(1, 0);
}

//! Check for server responses, act depending on response message
function onExtensionResponse(event) {
	console.log("Got an extension response from server. CMD = " + event.cmd);

	//holds the respons message
	var params = event.params;

	switch (event.cmd) {
		case "RoleConfirmation":
			if (!params.confirmed) {
				//alert ("That role was already taken!");
				role = '';
			} else {
				//alert('Role set to ' + role + '!');
				roleSet = true;

				//start game. Debug to test engineer view, REMOVE THIS
					//var objTest = {};
					//sendItem('StartGame', objTest);
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
}


//!touch event for pilot/gunner GUI
this.onButtonClick = function(e) {
	
	e.preventDefault();

	switch (e.target.id) {
		case 'pilotCanvas':
			
			var canvas = document.getElementById('pilotCanvas');
			var ctx = canvas.getContext('2d');

			//get screen coordinates
			var _x = e.targetTouches[0].pageX- canvas.getBoundingClientRect().left;
			var _y = e.targetTouches[0].pageY - canvas.getBoundingClientRect().top;

			inputRotY = (originY - _y) / (canvas.height / 2);
			inputRotX =  (_x - originX) / (canvas.width / 2);

			//set background color
			col = "#333";
			ctx.rect(0,0,canvas.width, canvas.height);
			ctx.fillStyle = 'rgba(0,0,0,1)';
			ctx.fill();

			//draw joystick background
			ctx.drawImage(joyDown, 0, 0, canvas.width, canvas.height);

			//draw joystick line
			ctx.beginPath();
			ctx.moveTo(originX, originY);
			ctx.lineTo(_x, _y);
			ctx.lineWidth = 3;
			ctx.strokeStyle = 'rgba(0,0,0,1)';
			ctx.stroke();

			//joystick button image
			ctx.drawImage(img, _x - img.width/2, _y - img.height/2, img.width, img.height);

			//break if out of canvas bounds
			if (_y > canvas.height || _x > canvas.width) break;

			//prevent int casting problems
			if (inputRotY > 1) 	inputRotY = 0.99;
			if (inputRotX > 1) 	inputRotX = 0.99;
			if (inputRotY < -1) inputRotY = -0.99;
			if (inputRotX < -1) inputRotX = -0.99;
			if (inputRotX == 0) inputRotX = 0.0001;
			if (inputRotY == 0) inputRotY = 0.0001;

			//store the rotation locally in order to send it later
			rotX = inputRotX;
			rotY = inputRotY;

			break;

		//thrust or fire button is clicked
		case 'thrustAndFire':
		
			//change button visual to indicate press
			if (role=='pilot')
				document.getElementById('thrustAndFire').style.backgroundImage = "url('images/forward_green_withLine.png')";
			else
				document.getElementById('thrustAndFire').style.backgroundImage = "url('images/fire_green_withLine.png')";

			//register fire/thrust input
			if (role == 'pilot')
				isThrusting = true;
			else
				isFiring = true;
			
			break;

		default:
			e.preventDefault();
			break;
	}

	return false;
}


//! Update server with new data from pilot/gunner
function sendPilotGunnerValues() {

	//out object
	var obj = {};

	//if role is pilot, send rot and thrust
	if(role == 'pilot') {
		obj.inputRotX = rotX;
		obj.inputRotY = rotY;
		obj.inputForward = isThrusting;

		//dont bother sending if no input is given
		if(!(rotX==0.0001 && rotY==0.0001 && !isThrusting))
			sendItem('PilotControlEvent', obj);
	}

	//if role is gunner, send rot and fire
	else if(role == 'gunner') {
		obj.inputRotX = rotX;
		obj.inputRotY = rotY;
		obj.isFiring = isFiring;
		
		//dont bother sending if no input is given
		if(!(rotX==0.0001 && rotY==0.0001 && !isFiring))
			sendItem('GunnerControlEvent', obj);
	}
}

//! Touch event function for pilot and gunner
this.onButtonUp = function(e) {

	e.preventDefault();

	var obj = {};
	switch (e.target.id) {

		case 'engineer':
				if (roleSet && role == 'engineer') {
					var obj = {};
					roleSet = false;
					role = '';
					sendItem("UnChooseClassHandler", obj);
				}
				else {
					obj.selectedRole = 'Engineer';
					sendItem('ChooseClassHandler', obj);

					role = 'engineer';
				}
				document.getElementById('engineer').removeEventListener('touchend', onButtonUp);
				document.getElementById('gunner').removeEventListener('touchend', onButtonUp);
				document.getElementById('pilot').removeEventListener('touchend', onButtonUp);
				break;
				
		case 'pilot':
				if (roleSet && role == 'pilot') {
					var obj = {};
					roleSet = false;
					role = '';
					sendItem("UnChooseClassHandler", obj);
				}
				else {
					obj.selectedRole = 'Pilot';
					sendItem('ChooseClassHandler', obj);

					role = 'pilot';
				}
				
				document.getElementById('engineer').removeEventListener('touchend', onButtonUp);
				document.getElementById('gunner').removeEventListener('touchend', onButtonUp);
				document.getElementById('pilot').removeEventListener('touchend', onButtonUp);
				break;
				
		case 'gunner':
		if (roleSet && role == 'gunner') {
					var obj = {};
					roleSet = false;
					role = '';
					sendItem("UnChooseClassHandler", obj);
				}
				else {
					selected = true;
					obj.selectedRole = 'Gunner';
					sendItem('ChooseClassHandler', obj);

					role = 'gunner';

					//alert("waiting for confirmation..");

				}
				document.getElementById('engineer').removeEventListener('touchend', onButtonUp);
				document.getElementById('gunner').removeEventListener('touchend', onButtonUp);
				document.getElementById('pilot').removeEventListener('touchend', onButtonUp);
			break;

		case 'thrustAndFire':
			
			//reset button visually and input wise
			clearThrustFire();

			break;

		case 'pilotCanvas':
		
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
			
			//reset values
			rotX = 0.0001;
			rotY = 0.0001;
			
			break;

		default:
			console.log('Unknown item unpressed..');
			break;
	}

	return false;
}

//check if touch point leaves button area
function onButtonLeave() {
	clearThrustFire();
}

//checks if other event occurs
function onButtonCancel() {
	clearThrustFire();
}

//reset thustFire button
function clearThrustFire() {
	
	//register release
	if (role == 'pilot')
		isThrusting = false;
	else
		isFiring = false;
	
	//Update button visually
	if (role=='pilot')
		document.getElementById('thrustAndFire').style.backgroundImage = "url('images/forward_shaded.png')";
	else
		document.getElementById('thrustAndFire').style.backgroundImage = "url('images/fire_shaded.png')";
}

//! Function for login attempt
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

/** mouse and touch events for engineer sliders **/
/******************************************************************************/
//check for touch input

//update when touching but not moving
function onTouchStart(e) {
	
	console.log(e.target.id);
	
	registerTouchEvent(e);
}

//update when moving along the slider
function onTouchMove(e) {
	
	console.log(e.target.id);
	
	registerTouchEvent(e);
}

//Check witch slider is targeted, set and send values
function registerTouchEvent(e) {

	e.preventDefault(); //prevent standard browser touch event

	//slider variables
	var shieldCanvas = document.getElementById('shieldCanvas');
	var sCtx = shieldCanvas.getContext('2d');
	var turretCanvas = document.getElementById('turretCanvas');
	var tCtx = turretCanvas.getContext('2d');
	var engineCanvas = document.getElementById('engineCanvas');
	var eCtx = engineCanvas.getContext('2d');

	switch(e.target.id) {

		case 'shieldCanvas':

			//calculate pecentage
			var powerPercent = calculateTouchPercent(e, shieldCanvas);

			//update targeted slider
			drawSlider(sCtx, powerPercent);

			//calculate remaining powerPercent
			var remainingPower = (maxPower-powerPercent)/2;

			//update the other sliders
			drawSlider(tCtx, remainingPower);
			drawSlider(eCtx, remainingPower);

			sendEnginerValues(powerPercent, remainingPower, remainingPower);
		break;

		case 'turretCanvas':

			//calculate pecentage
			var powerPercent = calculateTouchPercent(e, shieldCanvas);

			//update targeted slider
			drawSlider(tCtx, powerPercent);

			//calculate remaining powerPercent
			var remainingPower = (maxPower-powerPercent)/2;

			//update the other sliders
			drawSlider(sCtx, remainingPower);
			drawSlider(eCtx, remainingPower);

			sendEnginerValues(remainingPower, powerPercent, remainingPower);
		break;

		case 'engineCanvas':

			//calculate pecentage
			var powerPercent = calculateTouchPercent(e, engineCanvas);

			//update targeted slider
			drawSlider(eCtx, powerPercent);

			//calculate remaining powerPercent
			var remainingPower = (maxPower-powerPercent)/2;

			//update the other sliders
			drawSlider(sCtx, remainingPower);
			drawSlider(tCtx, remainingPower);

			sendEnginerValues(remainingPower, remainingPower, powerPercent);
		break;
	}
}

//! Calculate the values for which the sliders will be set to, takes into account the layout settings
function calculateTouchPercent(e, canvas) {

	//element distance from top of screen
	var topOffset = canvas.offsetTop; //-canvas.scrollTop+canvas.clientTop-canvas.clientHeight/2;

	//mouse y position
	if(usingDesktop)
		var y = e.clientY - topOffset;
	else
		var y = e.targetTouches[0].pageY - topOffset;

	//height of element
	var sliderHeight = canvas.clientHeight;

	//calculate mouse y percentege of element height
	var sliderPercentage = y/sliderHeight;

	//turn slider so that bottom is 0% and top is 100%
	sliderPercentage=1-sliderPercentage;

	//check if out of bounds
	if(sliderPercentage < 0) sliderPercentage = 0;
	if(sliderPercentage > 1) sliderPercentage = 1;

	return sliderPercentage;
}

//! Draw engineer sliders graphics
function drawSlider(context, amount) {

	//handle height (percentage of slider)
	var handleHeight = 0.1;

	//draw empty background
	context.drawImage(barEmpty, 0, 0,shieldCanvas.width, shieldCanvas.height);

	//draw filled amount
	context.drawImage(barFilled, 0,
		shieldCanvas.height-shieldCanvas.height*amount,
		shieldCanvas.width,shieldCanvas.height*amount);

	//draw handle
	context.drawImage(handle, 0,
		shieldCanvas.height-shieldCanvas.height*amount-shieldCanvas.height*handleHeight*0.5,
		shieldCanvas.width, shieldCanvas.height*handleHeight);
}

//! Send engineer values to server
function sendEnginerValues(_shield, _turret, _engine) {

	var obj = {};

	//prevent cast-to-int problems with server
	if(_shield >= 1) _shield = 0.999;
	if(_turret >= 1) _turret = 0.999;
	if(_engine >= 1) _engine = 0.999;
	if(_shield <= 0) _shield = 0.001;
	if(_turret <= 0) _turret = 0.001;
	if(_engine <= 0) _engine = 0.001;

	//set values
	obj.inputShield = parseFloat(_shield);
	obj.inputTurret = parseFloat(_turret);
	obj.inputEngine = parseFloat(_engine);

	//send
	sendItem('EngineerControlEvent', obj);
}
/******************************************************************************/

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

function getNewName() {
	var firstnames = ["Jessie", "Drax", "Star-lord", "Mario", "Peach", "Piggy", "Max", "Torsten", "Henrietta","Lasse", "Tobias", "Bock", "Tucker", "Mommy", "Daddy", "Death", "Herald", "Alan", "Herald", "King", "Marlene"];
	var surnames = [" the Formidable", " the Relinquisher", " of Doom", " the Domebringer", " the Destroyer", " of Many Treats", " of Self-Disrespect", " Mc Donald", " of Destiny", "Ragnarsson", "Lothbrok", "Vader", "Stardust"];

	return firstnames[Math.floor(Math.random() * firstnames.length)] + surnames[Math.floor(Math.random() * surnames.length)];
}

//update role select screen by indicate which roles are taken or not takan
function updateRoleAvailability(engi, gunner, pilot) {
	document.getElementById('engineer').style.backgroundImage = "url('" + engiAvailableImg.src + "')";//"url('images/engi_available2.png')";
	document.getElementById('gunner').style.backgroundImage = "url('" + gunnerAvailableImg.src + "')";//"url('images/gunner_available2.png')";
	document.getElementById('pilot').style.backgroundImage = "url('" + pilotAvailableImg.src + "')";//"url('images/pilot_available2.png')";

	// Remove eventlisteners and add those that are available.
	document.getElementById('engineer').removeEventListener('touchend', onButtonUp);
	document.getElementById('gunner').removeEventListener('touchend', onButtonUp);
	document.getElementById('pilot').removeEventListener('touchend', onButtonUp);
	
	document.getElementById('pilot').removeEventListener('mousedown', onButtonUp);

	engiTaken = engi;
	gunnerTaken = gunner;
	pilotTaken = pilot;

	if (engiTaken) {
		if (role == 'engineer' && roleSet) {
			document.getElementById('engineer').style.backgroundImage = "url('" + engiChosenImg.src + "')";//"url('images/engi_chosen2.png')";
			
			//add touch listeners to role select items
			document.getElementById('engineer').addEventListener('touchend', onButtonUp);
			document.getElementById("engineer").addEventListener("mousedown", onButtonUp);
		}
		else {
			document.getElementById('engineer').style.backgroundImage = "url('" + engiTakenImg.src + "')";//"url('images/engi_taken2.png')";
		}
	}
	else {
		//add touch and mouse listeners to role select items
		document.getElementById('engineer').addEventListener('touchend', onButtonUp);
		document.getElementById("engineer").addEventListener("mousedown", onButtonUp);
	}

	if (gunnerTaken) {
		if (role == 'gunner' && roleSet) {
			document.getElementById('gunner').style.backgroundImage = "url('" + gunnerChosenImg.src + "')";//"url('images/gunner_chosen2.png')";
			
			
			//add touch and mouse listeners to role select items
			document.getElementById('gunner').addEventListener('touchend', onButtonUp);
			document.getElementById("gunner").addEventListener("mousedown", onButtonUp);
		}
		else {
			document.getElementById('gunner').style.backgroundImage = "url('" + gunnerTakenImg.src + "')";//"url('images/gunner_taken2.png')";
		}
	}
	else {
		//add touch and mouse listeners to role select items
		document.getElementById('gunner').addEventListener('touchend', onButtonUp);
		document.getElementById("gunner").addEventListener("mousedown", onButtonUp);		
	}
		

	if (pilotTaken) {
		if (role == 'pilot' && roleSet) {
			document.getElementById('pilot').style.backgroundImage = "url('" + pilotChosenImg.src + "')";//"url('images/pilot_chosen2.png')";
			
			//add touch and mouse listeners to role select items
			document.getElementById('pilot').addEventListener('touchend', onButtonUp);
			document.getElementById("pilot").addEventListener("mousedown", onButtonUp);	
		}
		else {
			document.getElementById('pilot').style.backgroundImage = "url('" + pilotTakenImg.src + "')"//"url('images/pilot_taken2.png')";
		}
	}
	else {
		//add touch and mouse listeners to role select items
		document.getElementById('pilot').addEventListener('touchend', onButtonUp);
		document.getElementById("pilot").addEventListener("mousedown", onButtonUp);		
	}
}

//used to create slider drag effect
var mouseHeldDown = false;

//register mouse click on engineer sliders
function onMouseDown(e) {
	
	onTouchStart(e);
	mouseHeldDown = true;
} 

//register mouse movement over engineer sliders
function onMouseMove(e) {
	
	if(mouseHeldDown)
		onTouchStart(e);
}

//register mouse release
function onMouseUp(e) {
	
	mouseHeldDown = false;
}

//register key press
function onKeyDown(e) {
	
	e.preventDefault();
	
	switch(e.keyCode) {
		
		//key is 'w'
		case 87: 
			rotY = 0.99;
		break;
		
		//key is 's'
		case 83:
			rotY = -0.99;
		break;
		
		//key is 'a'
		case 65:
			rotX = -0.99;
		break;
		
		//key is 'd'
		case 68:
			rotX = 0.99;	
		break;
		
		//key is 'space'
		case 32:
			if(role == 'pilot')
				isThrusting = true;
			else
				isFiring = true;
		break;
	}
}

//register key release
function onKeyUp(e) {
	
	e.preventDefault();
	
	switch(e.keyCode) {
		
		//key is 'w'
		case 87: 
			rotY = 0.0001;
		break;
		
		//key is 's'
		case 83:
			rotY = 0.0001;
		break;
		
		//key is 'a'
		case 65:
			rotX = 0.0001;
		break;
		
		//key is 'd'
		case 68:
			rotX = 0.0001;	
		break;
		
		//key is 'space'
		case 32:
			if(role == 'pilot')
				isThrusting = false;
			else
				isFiring = false;
		break;
	}
}

//in game screens for each role
function enterGame() {
	alert('Buckle up, game is starting!');

	switch (role) {
		case 'engineer':
				drawIngameEngineer();
			break;

		case 'gunner':
				drawIngameGunnerPilot();
			break;

		case 'pilot':
				drawIngameGunnerPilot();
			break;
	}
}

function drawIngameEngineer() {
	
	document.getElementById('roleView').style.display = 'none';
	document.getElementById('engineerView').style.display = 'inline';
	window.scrollTo(1, 0); //scroll away the adress bar (iphone)

	//initiate the gui

	//add variables for each canvas
	var shieldCanvas = document.getElementById('shieldCanvas');
	var sCtx = shieldCanvas.getContext('2d');

	var turretCanvas = document.getElementById('turretCanvas');
	var tCtx = turretCanvas.getContext('2d');

	var engineCanvas = document.getElementById('engineCanvas');
	var eCtx = engineCanvas.getContext('2d');

	//draw sliders initially
	drawSlider(sCtx, 0.333);
	drawSlider(tCtx, 0.333);
	drawSlider(eCtx, 0.333);

	//add touch listeners
	shieldCanvas.addEventListener('touchmove', onTouchMove);
	turretCanvas.addEventListener('touchmove', onTouchMove);
	engineCanvas.addEventListener('touchmove', onTouchMove);

	shieldCanvas.addEventListener('touchstart', onTouchStart);
	turretCanvas.addEventListener('touchstart', onTouchStart);
	engineCanvas.addEventListener('touchstart', onTouchStart);
	
	//... and mouse listeners
	shieldCanvas.addEventListener('mousemove', onMouseMove);
	turretCanvas.addEventListener('mousemove', onMouseMove);
	engineCanvas.addEventListener('mousemove', onMouseMove);

	shieldCanvas.addEventListener('mousedown', onMouseDown);
	turretCanvas.addEventListener('mousedown', onMouseDown);
	engineCanvas.addEventListener('mousedown', onMouseDown);
	
	shieldCanvas.addEventListener('mouseup', onMouseUp);
	turretCanvas.addEventListener('mouseup', onMouseUp);
	engineCanvas.addEventListener('mouseup', onMouseUp);
	document.addEventListener('mouseup', onMouseUp);
}

function drawIngameGunnerPilot() {
	
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
	canvas.addEventListener('touchstart', onButtonClick);
	canvas.addEventListener('touchmove', onButtonClick);
	canvas.addEventListener('touchend', onButtonUp);

	document.getElementById("thrustAndFire").addEventListener("touchstart", onButtonClick);
	document.getElementById("thrustAndFire").addEventListener("touchend", onButtonUp);
	
	//use these listeners to prevent locked buttons when touchend isn't registered
	document.getElementById("thrustAndFire").addEventListener("touchleave", onButtonLeave);
	document.getElementById("thrustAndFire").addEventListener("touchcancel", onButtonCancel);

	//add keyboard event listeners for desktop version
	document.addEventListener("keydown", onKeyDown);
	document.addEventListener("keyup", onKeyUp);
	
	if(role == 'pilot')
		document.getElementById('thrustAndFire').style.backgroundImage = "url('images/forward_shaded.png')";
	else
		document.getElementById('thrustAndFire').style.backgroundImage = "url('images/fire_shaded.png')";
	
	window.scrollTo(1, 0);
}







