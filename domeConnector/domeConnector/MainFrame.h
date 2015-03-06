#include "..\..\..\..\..\trunk_api\SmartFox.h"
#include <AFXPRIV.H>

class MainFrame {
public:
	MainFrame();
	~MainFrame();
	void init();
	static CStringA UTF16ToUTF8(const CStringW& utf16);

private:
	static void put(char* s); // fancy outputing function

	// handle smartfox events
	static void OnSmartFoxConnection(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent);
	static void OnSmartFoxConnectionLost(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent);
	static void OnSmartFoxLogin(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent);
	static void OnSmartFoxDisconnection(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent);
	static void OnSmartFoxLoginError(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent);
	static void OnSmartFoxLogout(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent);
	static void OnSmartFoxExtensionResponse(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent);

	// Event to notify the establishment of the connection with SmartFox
	boost::shared_ptr<Sfs2X::SmartFox> m_ptrSmartFox;
	HANDLE SmartFoxConnectionEstablished;

};