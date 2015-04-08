#include "NetworkManager.h"

// Remove possible warnings
#ifdef _MSC_VER
	#define _CRT_SECURE_NO_WARNINGS
	#define _WINSOCK_DEPRECATED_NO_WARNINGS
#endif

// Define timeout for connection
#define SMARTFOX_MAXIMUMWAITFORCONNECTIONESTABLISHMENT	10000	// UM: milliseconds. The time to wait the establishment of connection with SmartFox

using namespace std;

//! This handler takes care of setup once we have established a connection to the server. If we successfully log in we will attempt to send a request for logging in.
void NetworkManager::OnSmartFoxConnection(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent)
{
	cout << "OnSmartFoxConnection()" << endl;
	// Get the pointer to Main Frame class
	NetworkManager* ptrMainFrame = (NetworkManager*)ptrContext;

	if (ptrMainFrame == NULL) {
		return;
	}

	// See that connection is established.
	boost::shared_ptr<map<string, boost::shared_ptr<void>>> ptrEventParams = ptrEvent->Params();
	boost::shared_ptr<void> ptrEventParamValueSuccess = (*ptrEventParams)["success"];
	boost::shared_ptr<bool> ptrSuccessMessage = ((boost::static_pointer_cast<bool>))(ptrEventParamValueSuccess);

	if (*ptrSuccessMessage == true)
	{
		cout << "Connection established!" << endl;
		// Connection with SmartFox Server has been established
		// Set internal event to notify the connection establishment
		SetEvent(ptrMainFrame->SmartFoxConnectionEstablished);
	}
	else {
		cout << "Connection failed.." << endl;
		return;
	}

	// We got response from server. Let's wait a while 
	// to see if we successfully connect to the server.
	DWORD dwRc = ::WaitForSingleObject(ptrMainFrame->SmartFoxConnectionEstablished, SMARTFOX_MAXIMUMWAITFORCONNECTIONESTABLISHMENT);

	switch (dwRc) {
		case WAIT_OBJECT_0:	{
			// Our waiter said we're all A-OK. 
			// Let's send a request for logging in.
	
			// Choose a befitting name for c++ client
			string loginName = "DomeHandler";

			// Perform login request
			boost::shared_ptr<IRequest> request(new LoginRequest(loginName, "", "BasicExamples"));
			ptrMainFrame->m_ptrSmartFox->Send(request);

			cout << "Request for logging in sent!" << endl;

			break;
		}

		case WAIT_TIMEOUT: {
			// Timeout
			cout << "ERROR: Timeout establishing connection with SmartFoxServer" << endl;
			break;
		}

		default: {
			// Unknown case. Do nothing as of now.
			break;
		}
	}
}

//! Function for handling possible disconnection from server.
void NetworkManager::OnSmartFoxConnectionLost(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent) {}

//! What to do when a room is joined
void NetworkManager::OnSmartFoxRoomJoined(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent) {

	NetworkManager* ptrMainFrame = (NetworkManager*)ptrContext;

	cout << "We successfully managed to join room." << endl;
	cout << "Attempt to send int .." << endl;

	// Send some garbage data just to see what happens
	boost::shared_ptr<ISFSObject> parameters(new SFSObject());
	parameters->PutInt("rotX", 1);
	parameters->PutInt("rotY", 0);
	parameters->PutInt("thrust", 0);

	// See what room we are in.
	boost::shared_ptr<Room> lastJoined = ptrMainFrame->m_ptrSmartFox->LastJoinedRoom();

	// Perform extensionrequest
	boost::shared_ptr<IRequest> extRequest(new ExtensionRequest("RequestTransform", parameters, lastJoined));
	ptrMainFrame->m_ptrSmartFox->Send(extRequest);

	cout << "Item sent!" << endl;
}

//! Says what to do once the server confirmed our login request. As of 0.0.1 it only sends a request for one of the server extensions.
void NetworkManager::OnSmartFoxLogin(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent) {
	// get pointer to main frame.
	NetworkManager* ptrMainFrame = (NetworkManager*)ptrContext;

	cout << "Successfully logged in!" << endl;
	cout << "Attempting to join room 'The Lobby'.." << endl;

	// Convert a TCHAR string to a std string
	boost::shared_ptr<string> ptrStdRoomName(new string("The Lobby"));

	boost::shared_ptr<IRequest> request(new JoinRoomRequest(*ptrStdRoomName));
	ptrMainFrame->m_ptrSmartFox->Send(request);

	cout << "JoinRoom request sent!" << endl;

	// NOTE: For now we settle with TCP transmitting. 
	// It seems to be something wrong with the c++ api..

	/* put("Attempt to init UDP transmitting..");
	ptrMainFrame->m_ptrSmartFox->InitUDP();
	put("UDP handshake request sent!");
	*/
}

//! This function should clean everything up when we disconnect from the server. Disconnecting on purpose should only be called when the application is terminated or exited.
void NetworkManager::OnSmartFoxDisconnection(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent) {}
//! Handles possible errors when signing in.
void NetworkManager::OnSmartFoxLoginError(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent) {}
//! Handles logging out from the server.
void NetworkManager::OnSmartFoxLogout(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent) {}

//! Constructor of NetworkManager
NetworkManager::NetworkManager() {
	cout << "What's happening? NetworkManager here.. " << endl;
}

//! Destructor of NetworkManager
NetworkManager::~NetworkManager() {
	if (SmartFoxConnectionEstablished != NULL) {
		CloseHandle(SmartFoxConnectionEstablished);
		SmartFoxConnectionEstablished = NULL;
	}
}

//! Initiates the NetworkManager by setting the pointer for the SmartFoxServer API and adding eventlisteners and handlers to that object. For connecting to the server, the sfs-config.xml file in the Configuration folder is loaded.
void NetworkManager::init() {

	// Set handle to listen for login.
	SmartFoxConnectionEstablished = CreateEvent(NULL,		// Pointer to the security attribute
		FALSE,		// Flag for manual reset
		FALSE,		// Flag for initial state
		NULL);
	// Set the pointer to smartfox and set threadsafemode to false;
	m_ptrSmartFox = boost::shared_ptr<Sfs2X::SmartFox>(new Sfs2X::SmartFox(true));
	m_ptrSmartFox->ThreadSafeMode(false);

	// Handle connecting
	m_ptrSmartFox->AddEventListener(SFSEvent::CONNECTION, boost::shared_ptr<EventListenerDelegate>(new EventListenerDelegate(NetworkManager::OnSmartFoxConnection, (unsigned long long)this)));
	// Handle connection lost
	m_ptrSmartFox->AddEventListener(SFSEvent::CONNECTION_LOST, boost::shared_ptr<EventListenerDelegate>(new EventListenerDelegate(NetworkManager::OnSmartFoxConnectionLost, (unsigned long long)this)));
	// Handle room joining
	m_ptrSmartFox->AddEventListener(SFSEvent::ROOM_JOIN, boost::shared_ptr<EventListenerDelegate>(new EventListenerDelegate(NetworkManager::OnSmartFoxRoomJoined, (unsigned long long)this)));
	// Handle login
	m_ptrSmartFox->AddEventListener(SFSEvent::LOGIN, boost::shared_ptr<EventListenerDelegate>(new EventListenerDelegate(NetworkManager::OnSmartFoxLogin, (unsigned long long)this)));
	// Handle login error
	m_ptrSmartFox->AddEventListener(SFSEvent::LOGIN_ERROR, boost::shared_ptr<EventListenerDelegate>(new EventListenerDelegate(NetworkManager::OnSmartFoxLoginError, (unsigned long long)this)));
	// Handle logout
	m_ptrSmartFox->AddEventListener(SFSEvent::LOGOUT, boost::shared_ptr<EventListenerDelegate>(new EventListenerDelegate(NetworkManager::OnSmartFoxLogout, (unsigned long long)this)));
	// Handle disconnecting
	m_ptrSmartFox->AddEventListener(BitSwarmEvent::DISCONNECT, boost::shared_ptr<EventListenerDelegate>(new EventListenerDelegate(NetworkManager::OnSmartFoxDisconnection, (unsigned long long)this)));
	// Handle extension repsonse
	m_ptrSmartFox->AddEventListener(SFSEvent::EXTENSION_RESPONSE, boost::shared_ptr<EventListenerDelegate>(new EventListenerDelegate(NetworkManager::OnSmartFoxExtensionResponse, (unsigned long long)this)));

	// Retrieve info regarding UDP handshake (disabled atm)
	//m_ptrSmartFox->AddEventListener(SFSEvent::UDP_INIT, boost::shared_ptr<EventListenerDelegate>(new EventListenerDelegate(NetworkManager::OnUDPInit, (unsigned long long)this)));

	// Load server config
	m_ptrSmartFox->LoadConfig(".\\Configuration\\sfs-config.xml", true);

	cout << "SmartFoxServer connection initiated!" << endl;
}