
#include "..\..\..\..\..\..\Program Files\trunk_api\SmartFox.h"
#include "..\..\..\..\..\..\Program Files\trunk_api\Requests\ExtensionRequest.h"
#include "..\..\..\..\..\..\Program Files\trunk_api\Requests\JoinRoomRequest.h"
#include "..\..\..\..\..\..\Program Files\trunk_api\Requests\LoginRequest.h"

class NetworkManager {

public:
	NetworkManager();
	virtual ~NetworkManager();
	void init();


private:
	
	// handle smartfox events
	static void OnSmartFoxConnection(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent);
	static void OnSmartFoxConnectionLost(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent);
	static void OnSmartFoxRoomJoined(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent);
	static void OnSmartFoxLogin(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent);
	static void OnSmartFoxDisconnection(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent);
	static void OnSmartFoxLoginError(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent);
	static void OnSmartFoxLogout(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent);
	static void OnSmartFoxExtensionResponse(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent);
	static void OnUDPInit(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent);
	
	HANDLE SmartFoxConnectionEstablished;
	boost::shared_ptr<Sfs2X::SmartFox> m_ptrSmartFox;
};
