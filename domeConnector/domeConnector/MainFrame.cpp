#include "stdafx.h"
// Remove warnings
#ifdef _MSC_VER
	#define _CRT_SECURE_NO_WARNINGS
	#define _WINSOCK_DEPRECATED_NO_WARNINGS
#endif

// Define timeout for connection
#define SMARTFOX_MAXIMUMWAITFORCONNECTIONESTABLISHMENT	10000	// UM: milliseconds. The time to wait the establishment of connection with SmartFox


using namespace std;
/*
* Shorter and fancier way of outputing a string.
*/
void MainFrame::put(char* s) {
	cout << s << endl;
}



void MainFrame::OnSmartFoxConnection(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent)
{
	put("OnSmartFoxConnection()");
	// Get the pointer to Main Frame class
	MainFrame* ptrMainFrame = (MainFrame*)ptrContext;

	if (ptrMainFrame == NULL) {
		return;
	}

	// See that connection is established.
	boost::shared_ptr<map<string, boost::shared_ptr<void>>> ptrEventParams = ptrEvent->Params();
	boost::shared_ptr<void> ptrEventParamValueSuccess = (*ptrEventParams)["success"];
	boost::shared_ptr<bool> ptrErrorMessage = ((boost::static_pointer_cast<bool>))(ptrEventParamValueSuccess);

	if (*ptrErrorMessage == true)
	{
		put("Connection established!");
		// Connection with SmartFox Server has been established
		// Set internal event to notify the connection establishment
		SetEvent(ptrMainFrame->SmartFoxConnectionEstablished);
	}
	else {
		put("Connection failed..");
	}

	// We're connected! Let's try signing in.

	DWORD dwRc = ::WaitForSingleObject(ptrMainFrame->SmartFoxConnectionEstablished, SMARTFOX_MAXIMUMWAITFORCONNECTIONESTABLISHMENT);

	switch (dwRc) {
		case WAIT_OBJECT_0:	{
			// The state of the specified object is signaled,
			// perform login request

			// Convert a TCHAR string to a std string
			CStringA szConvertedUtf8String = MainFrame::UTF16ToUTF8("Emomax");

			// Perform login request
			boost::shared_ptr<IRequest> request(new LoginRequest(string(szConvertedUtf8String), "", "BasicExamples"));
			ptrMainFrame->m_ptrSmartFox->Send(request);

			put("Request for logging in sent!");

			break;
		}

		case WAIT_TIMEOUT: {
			// Timeout
			put("ERROR: Timeout establishing connection with SmartFoxServer");
			//ptrMainFrame->MessageBox(_T("Timeout establishing connection with SmartFoxServer"), _T("Connection error"));
			break;
		}

		default: {
			break;
		}
	}

}

void MainFrame::OnSmartFoxConnectionLost(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent) {

}
void MainFrame::OnSmartFoxLogin(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent) {
	// get pointer to main frame.
	MainFrame* ptrMainFrame = (MainFrame*)ptrContext; 

	put("Logged in!");
	put("Attempt to send int ..");

	// Send int and get square of it
	boost::shared_ptr<ISFSObject> parameters(new SFSObject());
	parameters->PutInt("a", 4);

	// Perform extensionrequest
	boost::shared_ptr<IRequest> extRequest(new ExtensionRequest("TransformShip", parameters));
	ptrMainFrame->m_ptrSmartFox->Send(extRequest);

	put("Item sent!");
}
void MainFrame::OnSmartFoxDisconnection(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent) {

}
void MainFrame::OnSmartFoxLoginError(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent) {

}
void MainFrame::OnSmartFoxLogout(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent) {

}
/**
* Handle when an extension tells you to do something, basically ish.
*/
void MainFrame::OnSmartFoxExtensionResponse(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent) {
	// get pointer to main frame.
	MainFrame* ptrMainFrame = (MainFrame*) ptrContext;

	put("Item received!");

	if (ptrMainFrame == NULL) {
		return;
	}

	// Get the square parameter of the event
	boost::shared_ptr<map<string, boost::shared_ptr<void>>> ptrEventParams = ptrEvent->Params();
	boost::shared_ptr<void> ptrEventParamValueCmd = (*ptrEventParams)["cmd"];
	boost::shared_ptr<string> ptrNotifiedCmd = ((boost::static_pointer_cast<string>)(ptrEventParamValueCmd));

	// check the type of the command
	if (*ptrNotifiedCmd == "TransformShip") {
		boost::shared_ptr<void> ptrEventParamValueParams = (*ptrEventParams)["params"];
		boost::shared_ptr<ISFSObject> ptrNotifiedISFSObject = ((boost::static_pointer_cast<ISFSObject>)(ptrEventParamValueParams));
		int a = *(ptrNotifiedISFSObject->GetInt("a"));

		cout << "square of 4 is: " << a << endl;
	}
}

// -------------------------------------------------------------------------
// UTF16ToUTF8
// -------------------------------------------------------------------------
CStringA MainFrame::UTF16ToUTF8(const CStringW& utf16)
{
	CStringA utf8;
	int len = WideCharToMultiByte(CP_UTF8, 0, utf16, -1, NULL, 0, 0, 0);
	if (len > 1)
	{
		char *ptr = utf8.GetBuffer(len - 1);
		if (ptr) WideCharToMultiByte(CP_UTF8, 0, utf16, -1, ptr, len, 0, 0);
		utf8.ReleaseBuffer();
	}

	return utf8;
}

/* Constructor */
MainFrame::MainFrame() {
	put("What's happening? Mainframe here.. ");
}

MainFrame::~MainFrame() {
	if (SmartFoxConnectionEstablished != NULL) {
		CloseHandle(SmartFoxConnectionEstablished);
		SmartFoxConnectionEstablished = NULL;
	}
}

/*
* Made for initiating the mainframe
*/

void MainFrame::init() {

	// Set handle to listen for login.
	SmartFoxConnectionEstablished = CreateEvent(NULL,		// Pointer to the security attribute
		FALSE,		// Flag for manual reset
		FALSE,		// Flag for initial state
		NULL);
	// Set the pointer to smartfox and set threadsafemode to false;
	m_ptrSmartFox = boost::shared_ptr<Sfs2X::SmartFox>(new Sfs2X::SmartFox(true));
	m_ptrSmartFox->ThreadSafeMode(false);

	// Handle connecting
	m_ptrSmartFox->AddEventListener(SFSEvent::CONNECTION, boost::shared_ptr<EventListenerDelegate>(new EventListenerDelegate(MainFrame::OnSmartFoxConnection, (unsigned long long)this)));
	// Handle connection lost
	m_ptrSmartFox->AddEventListener(SFSEvent::CONNECTION_LOST, boost::shared_ptr<EventListenerDelegate>(new EventListenerDelegate(MainFrame::OnSmartFoxConnectionLost, (unsigned long long)this)));
	// Handle login
	m_ptrSmartFox->AddEventListener(SFSEvent::LOGIN, boost::shared_ptr<EventListenerDelegate>(new EventListenerDelegate(MainFrame::OnSmartFoxLogin, (unsigned long long)this)));
	// Handle login error
	m_ptrSmartFox->AddEventListener(SFSEvent::LOGIN_ERROR, boost::shared_ptr<EventListenerDelegate>(new EventListenerDelegate(MainFrame::OnSmartFoxLoginError, (unsigned long long)this)));
	// Handle logout
	m_ptrSmartFox->AddEventListener(SFSEvent::LOGOUT, boost::shared_ptr<EventListenerDelegate>(new EventListenerDelegate(MainFrame::OnSmartFoxLogout, (unsigned long long)this)));
	// Handle disconnecting
	m_ptrSmartFox->AddEventListener(BitSwarmEvent::DISCONNECT, boost::shared_ptr<EventListenerDelegate>(new EventListenerDelegate(MainFrame::OnSmartFoxDisconnection, (unsigned long long)this)));
	// Handle extension repsonse
	m_ptrSmartFox->AddEventListener(SFSEvent::EXTENSION_RESPONSE, boost::shared_ptr<EventListenerDelegate>(new EventListenerDelegate(MainFrame::OnSmartFoxExtensionResponse, (unsigned long long)this)));

	// Load server config
	m_ptrSmartFox->LoadConfig(".\\Configuration\\sfs-config.xml", true);

	put("SmartFoxServer connection initiated!");
}
